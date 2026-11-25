<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/correo.php';

/* Reenvía el correo de confirmación.

   Hace falta porque el primero puede no llegar: una dirección mal
   escrita, un filtro de spam, o el relay caído justo en ese momento.
   Sin esta pantalla, quien se registró y no recibió el mensaje queda
   trabado sin salida: no puede entrar porque no está verificado, y
   no puede registrarse de nuevo porque el correo ya está tomado.

   Respuesta siempre igual, por lo mismo que en olvide.php. */

fb_exigir_post();
$d = fb_entrada();
fb_exigir_csrf($d);

$correo = mb_strtolower(trim((string) ($d['correo'] ?? '')));

if (!fb_correo_valido($correo)) {
    fb_json(['ok' => false, 'errores' => ['correo' => 'Ese correo no parece válido.']], 422);
}

$generica = [
    'ok' => true,
    'mensaje' => 'Si hay una cuenta sin confirmar con ese correo, ya te mandamos '
               . 'un enlace nuevo. Mirá también la carpeta de spam.',
];

try {
    $db = fb_db();
    $st = $db->prepare('SELECT id, nombre, verificado FROM clientes
                        WHERE correo = ? AND activo = 1');
    $st->execute([$correo]);
    $c = $st->fetch();

    /* Si no existe, o ya está verificada, no se manda nada — pero la
       respuesta es la misma, así que de afuera no se nota la
       diferencia. */
    if (!$c || (int) $c['verificado'] === 1) {
        fb_json($generica);
    }

    $clienteId = (int) $c['id'];

    if (fb_tokens_recientes($db, $clienteId, 'verificacion', 60) >= FB_MAX_CORREOS_HORA) {
        error_log("reenviar.php: tope de reenvíos alcanzado para el cliente $clienteId");
        fb_json($generica);
    }

    /* Los enlaces anteriores dejan de servir: siempre hay uno solo
       vivo, así que no importa cuál de los correos abra. */
    fb_anular_tokens($db, $clienteId, 'verificacion');

    $token  = fb_crear_token($db, $clienteId, 'verificacion', FB_HORAS_VERIFICACION);
    $base   = rtrim((string) (fb_config()['url_base'] ?? ''), '/');
    $enlace = $base . '/api/verificar.php?t=' . $token;

    $ofertas = fb_consentimiento_vigente($db, $clienteId, 'ofertas');
    [$asunto, $html] = fb_correo_verificacion((string) $c['nombre'], $enlace, $ofertas);

    $motivo = null;
    $enviado = fb_enviar_correo($correo, $asunto, $html, '', $motivo);
    if (!$enviado) {
        error_log("reenviar.php: no pude mandar el correo a $correo — " . (string) $motivo);
    }

    if (!empty(fb_config()['depurar'])) {
        $generica['enlace_verificacion'] = $enlace;
        $generica['correo_enviado'] = $enviado;
        if (!$enviado) {
            $generica['motivo'] = $motivo;
        }
    }
    fb_json($generica);

} catch (Throwable $e) {
    $cfg = fb_config();
    fb_morir(500, 'No pude reenviar el correo.'
        . (!empty($cfg['depurar']) ? ' ' . $e->getMessage() : ''));
}
