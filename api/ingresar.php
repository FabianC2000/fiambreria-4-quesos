<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

/* Inicio de sesión.

   Tres cuidados que no se ven en pantalla:
     - el mensaje de error es el mismo si el correo no existe o si
       la contraseña está mal, para no confirmarle a nadie qué
       direcciones tienen cuenta;
     - se cuentan los intentos fallidos y se bloquea un rato, que es
       lo que vuelve impracticable probar contraseñas de a miles;
     - si el hash quedó viejo porque PHP cambió de algoritmo, se
       rehashea en silencio aprovechando que acá tenemos la
       contraseña en claro por única vez. */

fb_exigir_post();
$d = fb_entrada();
fb_exigir_csrf($d);

$correo = mb_strtolower(trim((string) ($d['correo'] ?? '')));
$clave  = (string) ($d['clave'] ?? '');

if ($correo === '' || $clave === '') {
    fb_json(['ok' => false, 'error' => 'Completá el correo y la contraseña.'], 422);
}

const FB_MAX_INTENTOS = 5;
const FB_MINUTOS_BLOQUEO = 15;

try {
    $db = fb_db();
    $st = $db->prepare('SELECT id, nombre, correo, clave_hash, verificado, activo, rol,
                               intentos_fallidos, bloqueado_hasta,
                               (bloqueado_hasta IS NOT NULL AND bloqueado_hasta > NOW()) AS bloqueado,
                               TIMESTAMPDIFF(MINUTE, NOW(), bloqueado_hasta) AS faltan
                        FROM clientes WHERE correo = ?');
    $st->execute([$correo]);
    $c = $st->fetch();

    if ($c && (int) $c['bloqueado'] === 1) {
        $faltan = max(1, (int) $c['faltan']);
        fb_json(['ok' => false,
                 'error' => "Demasiados intentos fallidos. Probá de nuevo en $faltan minutos."], 429);
    }

    /* password_verify siempre se ejecuta, incluso si el correo no
       existe, contra un hash de descarte. Si se saliera antes, la
       respuesta llegaría más rápido para los correos inexistentes y
       eso solo ya permite averiguar cuáles están registrados. */
    $hash = $c['clave_hash'] ?? '$2y$12$usuarioinexistenteusuarioinexistenteusuarioinexistenteuuuu';
    $coincide = password_verify($clave, $hash);

    if (!$c || !$coincide) {
        if ($c) {
            $intentos = ((int) $c['intentos_fallidos']) + 1;
            if ($intentos >= FB_MAX_INTENTOS) {
                $db->prepare('UPDATE clientes SET intentos_fallidos = 0,
                              bloqueado_hasta = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?')
                   ->execute([FB_MINUTOS_BLOQUEO, $c['id']]);
            } else {
                $db->prepare('UPDATE clientes SET intentos_fallidos = ? WHERE id = ?')
                   ->execute([$intentos, $c['id']]);
            }
        }
        fb_json(['ok' => false, 'error' => 'Correo o contraseña incorrectos.'], 401);
    }

    if ((int) $c['activo'] !== 1) {
        fb_json(['ok' => false, 'error' => 'Esta cuenta está dada de baja.'], 403);
    }

    if ((int) $c['verificado'] !== 1) {
        fb_json(['ok' => false, 'verificar' => true,
                 'error' => 'Todavía no confirmaste tu correo. Revisá la casilla; te mandamos un enlace al registrarte.'], 403);
    }

    if (password_needs_rehash($c['clave_hash'], PASSWORD_DEFAULT)) {
        $db->prepare('UPDATE clientes SET clave_hash = ? WHERE id = ?')
           ->execute([password_hash($clave, PASSWORD_DEFAULT), $c['id']]);
    }

    $db->prepare('UPDATE clientes SET intentos_fallidos = 0, bloqueado_hasta = NULL,
                  ultimo_ingreso = NOW() WHERE id = ?')->execute([$c['id']]);

    fb_iniciar_sesion((int) $c['id']);

    fb_json(['ok' => true, 'cliente' => [
        'nombre' => $c['nombre'], 'correo' => $c['correo'], 'rol' => $c['rol'],
    ]]);

} catch (Throwable $e) {
    $cfg = fb_config();
    fb_morir(500, 'No pude iniciar sesión.' . (!empty($cfg['depurar']) ? ' ' . $e->getMessage() : ''));
}
