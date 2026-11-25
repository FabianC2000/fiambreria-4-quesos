<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/correo.php';

/* Cambio de contraseña con el token que llegó por correo.
   Dos métodos sobre el mismo recurso:

     GET  ?t=...   dice si el enlace todavía sirve, sin gastarlo.
                   Así la pantalla avisa que venció antes de que la
                   persona escriba la contraseña dos veces.
     POST          cambia la contraseña y gasta el token.

   El GET no lleva CSRF porque no modifica nada, y quien pregunta ya
   tiene el token en la mano. */

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $db = fb_db();

    /* ---------------------------------------------------------- */
    if ($metodo === 'GET') {
        $fila = fb_mirar_token($db, (string) ($_GET['t'] ?? ''), 'recuperacion');
        if (!$fila) {
            fb_json(['ok' => true, 'valido' => false]);
        }
        $st = $db->prepare('SELECT correo, nombre FROM clientes WHERE id = ? AND activo = 1');
        $st->execute([$fila['cliente_id']]);
        $c = $st->fetch();
        if (!$c) {
            fb_json(['ok' => true, 'valido' => false]);
        }
        fb_json([
            'ok' => true,
            'valido' => true,
            'nombre' => $c['nombre'],
            /* Tapada: confirma de qué cuenta se trata sin mostrar la
               dirección entera, por si el enlace terminó en una
               pantalla que no es la de su dueño. */
            'correo' => fb_correo_tapado((string) $c['correo']),
        ]);
    }

    /* ---------------------------------------------------------- */
    if ($metodo !== 'POST') {
        fb_morir(405, 'Este endpoint acepta GET y POST.');
    }

    $d = fb_entrada();
    fb_exigir_csrf($d);

    $token = (string) ($d['t'] ?? '');
    $clave = (string) ($d['clave'] ?? '');

    $fila = fb_mirar_token($db, $token, 'recuperacion');
    if (!$fila) {
        fb_json(['ok' => false, 'vencido' => true,
                 'error' => 'Este enlace ya no sirve: vence a las '
                          . FB_HORAS_RECUPERACION . ' horas y se usa una sola vez. '
                          . 'Pedí uno nuevo.'], 400);
    }

    $clienteId = (int) $fila['cliente_id'];
    $st = $db->prepare('SELECT nombre, correo FROM clientes WHERE id = ? AND activo = 1');
    $st->execute([$clienteId]);
    $c = $st->fetch();
    if (!$c) {
        fb_json(['ok' => false, 'vencido' => true,
                 'error' => 'Esta cuenta ya no está disponible.'], 400);
    }

    /* La misma exigencia que en el registro: el token prueba que la
       casilla es suya, no autoriza a poner "12345678". */
    $floja = fb_clave_floja($clave, (string) $c['correo'], (string) $c['nombre']);
    if ($floja !== null) {
        fb_json(['ok' => false, 'errores' => ['clave' => $floja]], 422);
    }

    $hash = password_hash($clave, PASSWORD_DEFAULT);
    if ($hash === false) {
        fb_morir(500, 'No pude procesar la contraseña.');
    }

    $db->beginTransaction();

    /* clave_cambiada cierra las sesiones que estuvieran abiertas en
       otros dispositivos (lo revisa fb_cliente_actual).

       verificado = 1 porque quien abrió este enlace demostró que la
       casilla es suya, que es exactamente lo que verifica el correo
       de alta. Si no, alguien que se registró y nunca confirmó
       quedaría trabado para siempre.

       Y se levanta el bloqueo por intentos fallidos: la persona
       recuperó la cuenta, no tiene sentido seguir castigándola por
       los intentos de antes. */
    $db->prepare('UPDATE clientes
                  SET clave_hash = ?, clave_cambiada = NOW(), verificado = 1,
                      intentos_fallidos = 0, bloqueado_hasta = NULL
                  WHERE id = ?')
       ->execute([$hash, $clienteId]);

    fb_consumir_token($db, (int) $fila['id']);
    /* Los demás pedidos pendientes quedan sin efecto. */
    fb_anular_tokens($db, $clienteId, 'recuperacion');
    fb_anular_tokens($db, $clienteId, 'verificacion');

    $db->commit();

    /* Aviso de que la contraseña cambió. Va después del commit: si
       el correo falla, el cambio ya está hecho y la persona puede
       entrar, que es lo que vino a hacer. */
    [$asunto, $html] = fb_correo_clave_cambiada(
        (string) $c['nombre'], date('d/m/Y \a \l\a\s H:i'));
    $motivo = null;
    if (!fb_enviar_correo((string) $c['correo'], $asunto, $html, '', $motivo)) {
        error_log('restablecer.php: no pude avisar del cambio — ' . (string) $motivo);
    }

    /* No se cierra la sesión acá a mano, aunque la tentación es
       grande. No hace falta: clave_cambiada ya invalida cualquier
       sesión anterior al cambio, incluida la de este navegador, y la
       próxima vez que se consulte quién está conectado se va a
       cerrar sola.

       Cerrarla acá además borraría el token CSRF de esta página, y
       entonces un segundo envío del formulario contestaría "la
       página estuvo demasiado tiempo abierta" en lugar de explicar
       que el enlace ya se usó. */

    fb_json(['ok' => true,
             'mensaje' => 'Tu contraseña quedó cambiada. Ya podés iniciar sesión.']);

} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    $cfg = fb_config();
    fb_morir(500, 'No pude cambiar la contraseña.'
        . (!empty($cfg['depurar']) ? ' ' . $e->getMessage() : ''));
}
