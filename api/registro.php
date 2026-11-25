<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/correo.php';

/* Alta de un cliente.

   Dos consentimientos separados y con trato distinto:
     - términos: obligatorio, sin él no hay cuenta
     - ofertas:  opcional, y si no viene marcado se registra como
                 NO otorgado. Marcarlo por adelantado no sería
                 consentimiento libre ni expreso. */

fb_exigir_post();
$d = fb_entrada();
fb_exigir_csrf($d);

$nombre   = trim((string) ($d['nombre'] ?? ''));
$apellido = trim((string) ($d['apellido'] ?? ''));
$correo   = mb_strtolower(trim((string) ($d['correo'] ?? '')));
$telefono = trim((string) ($d['telefono'] ?? ''));
$clave    = (string) ($d['clave'] ?? '');
$terminos = !empty($d['terminos']);
$ofertas  = !empty($d['ofertas']);

$errores = [];

if (mb_strlen($nombre) < 2)   $errores['nombre'] = 'Decinos cómo te llamás.';
if (mb_strlen($nombre) > 80)  $errores['nombre'] = 'El nombre es demasiado largo.';
if (mb_strlen($apellido) > 80) $errores['apellido'] = 'El apellido es demasiado largo.';
if (!fb_correo_valido($correo)) $errores['correo'] = 'Ese correo no parece válido.';
if ($telefono !== '' && !preg_match('/^[0-9 ()+-]{6,40}$/', $telefono)) {
    $errores['telefono'] = 'El teléfono solo puede tener números, espacios y los signos + ( ) -';
}
$floja = fb_clave_floja($clave, $correo, $nombre);
if ($floja !== null) $errores['clave'] = $floja;

/* Sin esto no hay cuenta: es el consentimiento informado que pide
   la ley, y tiene que ser un acto de la persona, no un valor por
   omisión del formulario. */
if (!$terminos) {
    $errores['terminos'] = 'Para crear la cuenta tenés que aceptar los términos y la política de privacidad.';
}

if ($errores) {
    fb_json(['ok' => false, 'errores' => $errores], 422);
}

try {
    $db = fb_db();

    $st = $db->prepare('SELECT id FROM clientes WHERE correo = ?');
    $st->execute([$correo]);
    if ($st->fetch()) {
        /* Se le avisa que el correo ya está tomado. Esto le confirma a
           un curioso que esa dirección tiene cuenta acá; la alternativa
           (responder siempre lo mismo y avisar por correo) confunde a
           quien simplemente se olvidó de que ya se había registrado.
           Para una fiambrería el dato no es sensible y la claridad vale
           más. Si algún día se guardan datos delicados, hay que
           revisar esta decisión. */
        fb_json(['ok' => false, 'errores' => [
            'correo' => 'Ya hay una cuenta con ese correo. Probá iniciar sesión o recuperar la contraseña.',
        ]], 409);
    }

    /* PASSWORD_DEFAULT sigue al algoritmo recomendado por PHP en cada
       versión. Hoy es bcrypt; cuando cambie, las contraseñas nuevas
       usan el nuevo y las viejas se rehashean al ingresar. */
    $hash = password_hash($clave, PASSWORD_DEFAULT);
    if ($hash === false) {
        fb_morir(500, 'No pude procesar la contraseña.');
    }

    $db->beginTransaction();

    $db->prepare('INSERT INTO clientes (nombre, apellido, correo, telefono, clave_hash)
                  VALUES (?, ?, ?, ?, ?)')
       ->execute([$nombre, $apellido ?: null, $correo, $telefono ?: null, $hash]);
    $clienteId = (int) $db->lastInsertId();

    /* Los dos quedan asentados, el aceptado y el no aceptado: saber
       que alguien NO quiso recibir ofertas es tan importante como
       saber que sí, y con fecha. */
    fb_registrar_consentimiento($db, $clienteId, 'terminos', true);
    fb_registrar_consentimiento($db, $clienteId, 'ofertas', $ofertas);

    $token = fb_crear_token($db, $clienteId, 'verificacion', 48);

    $db->commit();

    $base = rtrim((string) (fb_config()['url_base'] ?? ''), '/');
    $enlace = $base . '/api/verificar.php?t=' . $token;

    $cuerpo = '<p>Hola ' . htmlspecialchars($nombre, ENT_QUOTES) . ', gracias por crear tu cuenta.</p>'
            . '<p>Confirmá que esta casilla es tuya para poder usarla:</p>'
            . fb_boton_correo($enlace, 'Confirmar mi correo')
            . '<p style="font-size:13px;color:#6B6075">El enlace vence en 48 horas. '
            . 'Si no fuiste vos quien se registró, ignorá este mensaje.</p>';

    $pie = $ofertas
        ? 'Pediste recibir nuestras ofertas. Vas a poder darte de baja desde cualquier correo que te mandemos.'
        : 'No vas a recibir ofertas: solo mensajes necesarios de tu cuenta.';

    $enviado = fb_enviar_correo($correo, 'Confirmá tu correo — Fiambrería 4 Quesos',
                                fb_plantilla_correo('Confirmá tu correo', $cuerpo, $pie));

    $respuesta = [
        'ok' => true,
        'mensaje' => 'Cuenta creada. Te mandamos un correo para confirmar la dirección.',
        'correo_enviado' => $enviado,
    ];
    /* En desarrollo se devuelve el enlace para poder probar el flujo
       sin servidor de correo. Nunca con depurar en false. */
    if (!empty(fb_config()['depurar'])) {
        $respuesta['enlace_verificacion'] = $enlace;
    }
    fb_json($respuesta, 201);

} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    $c = fb_config();
    fb_morir(500, 'No pude crear la cuenta.' . (!empty($c['depurar']) ? ' ' . $e->getMessage() : ''));
}
