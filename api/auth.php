<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';

/* Sesión, CSRF y utilidades de cuenta.
   Todo endpoint que tenga que ver con clientes incluye este archivo. */

/* Versión del texto legal vigente. Cuando cambien los términos o la
   política, se sube este número: los consentimientos viejos quedan
   registrados contra la versión que la persona efectivamente leyó,
   que es lo único que sirve como prueba. */
const FB_VERSION_LEGAL = '2026-11';

/* El enlace de verificación dura dos días: la persona ya está
   registrada y no hay apuro. El de contraseña nueva dura dos horas:
   es el que permite entrar a la cuenta, así que cuanto menos tiempo
   quede vivo, mejor. */
const FB_HORAS_VERIFICACION = 48;
const FB_HORAS_RECUPERACION = 2;

/* Cuántos correos de cuenta se pueden pedir por hora para una misma
   cuenta, sumando verificaciones y recuperaciones. */
const FB_MAX_CORREOS_HORA = 3;

function fb_sesion(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
          || (($_SERVER['SERVER_PORT'] ?? '') === '443');

    session_set_cookie_params([
        'lifetime' => 0,          // la cookie muere al cerrar el navegador
        'path'     => '/',
        /* httponly deja la cookie fuera del alcance de JavaScript: si
           alguna vez se cuela un script ajeno en una página, no puede
           leer la sesión. */
        'httponly' => true,
        /* Lax evita que la cookie viaje en pedidos que nacen en otro
           sitio, que es como funciona el CSRF. */
        'samesite' => 'Lax',
        'secure'   => $https,     // en XAMPP sin HTTPS tiene que ir false
    ]);
    session_name('fb_sesion');
    session_start();
}

/* ------------------------------------------------------------
   CSRF
   ------------------------------------------------------------ */

function fb_token_csrf(): string
{
    fb_sesion();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function fb_exigir_csrf(array $datos): void
{
    fb_sesion();
    $enviado = (string) ($datos['csrf'] ?? '');
    /* hash_equals compara en tiempo constante: una comparación con
       == filtra, por lo que tarda, cuántos caracteres acertó quien
       está probando. */
    if ($enviado === '' || empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $enviado)) {
        fb_morir(419, 'La página estuvo demasiado tiempo abierta. Recargala y volvé a intentar.');
    }
}

/* ------------------------------------------------------------
   Entrada
   ------------------------------------------------------------ */

/* Lee el cuerpo del pedido, venga como JSON o como formulario. */
function fb_entrada(): array
{
    $tipo = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($tipo, 'application/json') !== false) {
        $crudo = file_get_contents('php://input');
        $datos = json_decode($crudo ?: '[]', true);
        return is_array($datos) ? $datos : [];
    }
    return $_POST;
}

function fb_exigir_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        fb_morir(405, 'Este endpoint solo acepta POST.');
    }
}

/* ------------------------------------------------------------
   Sesión del cliente
   ------------------------------------------------------------ */

function fb_cliente_actual(): ?array
{
    fb_sesion();
    if (empty($_SESSION['cliente_id'])) {
        return null;
    }
    $st = fb_db()->prepare(
        'SELECT id, nombre, apellido, correo, telefono, rol, verificado, sucursal_preferida,
                UNIX_TIMESTAMP(clave_cambiada) AS clave_cambiada
         FROM clientes WHERE id = ? AND activo = 1');
    $st->execute([$_SESSION['cliente_id']]);
    $c = $st->fetch();
    if (!$c) {
        /* La cuenta se dio de baja mientras la sesión seguía abierta. */
        fb_cerrar_sesion();
        return null;
    }

    /* Si la contraseña se cambió después de que empezó esta sesión,
       la sesión ya no vale. Es lo que hace que cambiar la contraseña
       eche a quien estuviera entrado en otro dispositivo, que es el
       sentido de cambiarla cuando uno sospecha que se la robaron.

       Se comparan dos marcas de tiempo absolutas (UNIX_TIMESTAMP del
       lado de MySQL, time() del lado de PHP), no fechas escritas:
       así da igual en qué zona horaria esté configurado cada uno. */
    $cambio = $c['clave_cambiada'] !== null ? (int) $c['clave_cambiada'] : 0;
    if ($cambio > 0 && (int) ($_SESSION['desde'] ?? 0) < $cambio) {
        fb_cerrar_sesion();
        return null;
    }
    unset($c['clave_cambiada']);
    return $c;
}

function fb_iniciar_sesion(int $clienteId): void
{
    fb_sesion();
    /* Identificador nuevo al iniciar sesión: si alguien conocía el
       anterior, ese ya no sirve (fijación de sesión). */
    session_regenerate_id(true);
    $_SESSION['cliente_id'] = $clienteId;
    $_SESSION['desde'] = time();
}

function fb_cerrar_sesion(): void
{
    fb_sesion();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
                  $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

function fb_exigir_cliente(): array
{
    $c = fb_cliente_actual();
    if (!$c) {
        fb_morir(401, 'Necesitás iniciar sesión.');
    }
    return $c;
}

/* Para las pantallas del local, que muestran datos de otras
   personas: nombres, teléfonos, qué compró cada uno.

   El rol se lee de la base en cada pedido, no de la sesión: si
   alguien deja de ser administrador, deja de serlo en el acto y no
   cuando se le venza la sesión. (fb_cliente_actual consulta la
   tabla cada vez, así que eso ya está dado.)

   A quien no es administrador se le contesta 404 y no 403: un 403
   confirmaría que la pantalla existe. */
function fb_exigir_admin(): array
{
    $c = fb_exigir_cliente();
    if (($c['rol'] ?? '') !== 'admin') {
        fb_morir(404, 'No encontré eso.');
    }
    return $c;
}

/* ------------------------------------------------------------
   Validaciones
   ------------------------------------------------------------ */

function fb_correo_valido(string $correo): bool
{
    return (bool) filter_var($correo, FILTER_VALIDATE_EMAIL) && strlen($correo) <= 190;
}

/* Las 25 contraseñas que más aparecen en las filtraciones conocidas,
   más las obvias en castellano. No es una lista exhaustiva: es el
   piso para que nadie quede con "123456". */
const FB_CLAVES_OBVIAS = [
    '12345678', '123456789', '1234567890', 'password', 'contrasena', 'contraseña',
    'qwertyui', 'qwerty123', '11111111', '00000000', 'iloveyou', 'princess',
    'admin123', 'welcome1', 'abc12345', 'password1', 'contrasena1', '12341234',
    'argentina', 'boca juniors', 'riverplate', 'fiambreria', '4quesos', 'quesos123',
];

/* Devuelve null si la contraseña sirve, o el motivo si no. */
function fb_clave_floja(string $clave, string $correo, string $nombre): ?string
{
    $largo = mb_strlen($clave);
    if ($largo < 8)  return 'La contraseña tiene que tener al menos 8 caracteres.';
    if ($largo > 200) return 'La contraseña es demasiado larga.';

    $plana = mb_strtolower(trim($clave));
    if (in_array($plana, FB_CLAVES_OBVIAS, true)) {
        return 'Esa contraseña es de las más usadas del mundo. Elegí otra.';
    }
    /* Una sola letra repetida tampoco sirve, por más larga que sea. */
    if (preg_match('/^(.)\1+$/u', $clave)) {
        return 'La contraseña no puede ser un mismo carácter repetido.';
    }
    $usuario = mb_strtolower(explode('@', $correo)[0]);
    if ($usuario !== '' && mb_strlen($usuario) >= 4 && str_contains($plana, $usuario)) {
        return 'La contraseña no puede contener tu correo.';
    }
    if ($nombre !== '' && mb_strlen($nombre) >= 4 && str_contains($plana, mb_strtolower($nombre))) {
        return 'La contraseña no puede contener tu nombre.';
    }
    return null;
}

/* ------------------------------------------------------------
   Tokens de un solo uso
   ------------------------------------------------------------ */

/* Crea un token, guarda su hash y devuelve el token en claro, que es
   lo único que viaja por correo y no queda escrito en ningún lado. */
function fb_crear_token(PDO $db, int $clienteId, string $tipo, int $horas): string
{
    /* random_bytes usa el generador criptográfico del sistema.
       rand() o uniqid() serían adivinables. */
    $token = bin2hex(random_bytes(32));
    $db->prepare('INSERT INTO tokens (cliente_id, tipo, token_hash, vence)
                  VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))')
       ->execute([$clienteId, $tipo, hash('sha256', $token), $horas]);
    return $token;
}

/* Devuelve la fila del token si sirve, o null. No lo consume. */
function fb_mirar_token(PDO $db, string $token, string $tipo): ?array
{
    if ($token === '' || !preg_match('/^[0-9a-f]{64}$/', $token)) {
        return null;
    }
    $st = $db->prepare('SELECT * FROM tokens
                        WHERE token_hash = ? AND tipo = ? AND usado IS NULL AND vence > NOW()');
    $st->execute([hash('sha256', $token), $tipo]);
    return $st->fetch() ?: null;
}

function fb_consumir_token(PDO $db, int $tokenId): void
{
    $db->prepare('UPDATE tokens SET usado = NOW() WHERE id = ?')->execute([$tokenId]);
}

/* Anula de una todos los tokens pendientes de un tipo. Se usa al
   consumir uno: si alguien pidió tres veces la contraseña nueva, el
   primero que use deja sin efecto a los otros dos. */
function fb_anular_tokens(PDO $db, int $clienteId, string $tipo): void
{
    $db->prepare('UPDATE tokens SET usado = NOW()
                  WHERE cliente_id = ? AND tipo = ? AND usado IS NULL')
       ->execute([$clienteId, $tipo]);
}

/* Cuántos tokens de este tipo se le crearon en los últimos minutos.

   Con esto se limita cuántos correos se pueden disparar por cuenta.
   El límite va por cuenta y no por dirección IP a propósito: el
   mensaje siempre se manda a la casilla registrada, así que lo único
   que se puede hacer con esto es llenarle el correo a un cliente
   real, y eso se corta contando por cuenta. */
function fb_tokens_recientes(PDO $db, int $clienteId, string $tipo, int $minutos): int
{
    $st = $db->prepare('SELECT COUNT(*) FROM tokens
                        WHERE cliente_id = ? AND tipo = ?
                          AND creado > DATE_SUB(NOW(), INTERVAL ? MINUTE)');
    $st->execute([$clienteId, $tipo, $minutos]);
    return (int) $st->fetchColumn();
}

/* Tapa una dirección para mostrarla sin exponerla entera:
   fabian@gmail.com → fa****@gmail.com */
function fb_correo_tapado(string $correo): string
{
    [$usuario, $dominio] = array_pad(explode('@', $correo, 2), 2, '');
    $visible = mb_substr($usuario, 0, min(2, max(1, mb_strlen($usuario) - 1)));
    return $visible . str_repeat('*', 4) . '@' . $dominio;
}

/* ------------------------------------------------------------
   Consentimientos
   ------------------------------------------------------------ */

/* Deja asentado que alguien aceptó (o dejó de aceptar) algo, con la
   fecha, la versión del texto y desde dónde. Nunca se actualiza una
   fila anterior: se agrega una nueva y la última manda. */
function fb_registrar_consentimiento(PDO $db, int $clienteId, string $tipo, bool $otorgado): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    $db->prepare('INSERT INTO consentimientos (cliente_id, tipo, otorgado, version, ip, agente)
                  VALUES (?, ?, ?, ?, INET6_ATON(?), ?)')
       ->execute([
           $clienteId, $tipo, $otorgado ? 1 : 0, FB_VERSION_LEGAL,
           $ip, mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
       ]);
}

function fb_consentimiento_vigente(PDO $db, int $clienteId, string $tipo): bool
{
    $st = $db->prepare('SELECT otorgado FROM v_consentimiento_vigente
                        WHERE cliente_id = ? AND tipo = ?');
    $st->execute([$clienteId, $tipo]);
    return (bool) $st->fetchColumn();
}
