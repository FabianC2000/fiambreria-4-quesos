<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/correo.php';

/* Pedido de contraseña nueva.

   La decisión que gobierna todo este archivo: la respuesta es
   siempre la misma, exista o no la cuenta.

   Si contestara "ese correo no está registrado", cualquiera podría
   averiguar quién es cliente de la fiambrería escribiendo
   direcciones de a una. Es el mismo criterio que en ingresar.php.

   (En registro.php sí se avisa que el correo ya está tomado, porque
   ahí la alternativa es dejar a alguien sin poder registrarse sin
   entender por qué. Son dos pantallas distintas con dos problemas
   distintos; la diferencia es deliberada.) */

fb_exigir_post();
$d = fb_entrada();
fb_exigir_csrf($d);

$correo = mb_strtolower(trim((string) ($d['correo'] ?? '')));

/* El formato sí se puede objetar: no dice nada sobre quién está
   registrado y le ahorra a la persona esperar un correo que nunca
   iba a llegar porque escribió mal la dirección. */
if (!fb_correo_valido($correo)) {
    fb_json(['ok' => false, 'errores' => ['correo' => 'Ese correo no parece válido.']], 422);
}

$generica = [
    'ok' => true,
    'mensaje' => 'Si hay una cuenta con ese correo, ya te mandamos las instrucciones. '
               . 'Mirá también la carpeta de spam.',
];

try {
    $db = fb_db();
    $st = $db->prepare('SELECT id, nombre, correo FROM clientes WHERE correo = ? AND activo = 1');
    $st->execute([$correo]);
    $c = $st->fetch();

    if (!$c) {
        fb_json($generica);
    }

    $clienteId = (int) $c['id'];

    /* Tope de correos por cuenta y por hora. Sin esto, alguien que
       sepa la dirección de un cliente puede dejarle veinte mensajes
       en la casilla apretando el botón. */
    if (fb_tokens_recientes($db, $clienteId, 'recuperacion', 60) >= FB_MAX_CORREOS_HORA) {
        error_log("olvide.php: tope de pedidos alcanzado para el cliente $clienteId");
        fb_json($generica);
    }

    $token  = fb_crear_token($db, $clienteId, 'recuperacion', FB_HORAS_RECUPERACION);
    $base   = rtrim((string) (fb_config()['url_base'] ?? ''), '/');
    $enlace = $base . '/cuenta/restablecer.html?t=' . $token;

    [$asunto, $html] = fb_correo_recuperacion(
        (string) $c['nombre'], $enlace, FB_HORAS_RECUPERACION);

    $motivo = null;
    $enviado = fb_enviar_correo($correo, $asunto, $html, '', $motivo);

    if (!$enviado) {
        error_log("olvide.php: no pude mandar el correo a $correo — " . (string) $motivo);
    }

    /* En desarrollo el correo no sale de la máquina, así que el
       enlace se devuelve para poder seguir probando. Con depurar en
       false esto no se agrega nunca: si se filtrara, cualquiera
       podría pedir el enlace de otra persona y usarlo. */
    if (!empty(fb_config()['depurar'])) {
        $generica['enlace_recuperacion'] = $enlace;
        $generica['correo_enviado'] = $enviado;
        if (!$enviado) {
            $generica['motivo'] = $motivo;
        }
    }
    fb_json($generica);

} catch (Throwable $e) {
    $cfg = fb_config();
    fb_morir(500, 'No pude procesar el pedido.'
        . (!empty($cfg['depurar']) ? ' ' . $e->getMessage() : ''));
}
