<?php
declare(strict_types=1);

/* ============================================================
   CLIENTE SMTP

   Manda correos hablando SMTP directamente contra el relay, sin
   librerías externas. Son unas doscientas líneas y están acá para
   poder leerlas: una librería como PHPMailer trae 250 kB de código
   que resuelve veinte casos que este sitio no tiene (adjuntos,
   S/MIME, pop-before-smtp) y, sobre todo, no se puede explicar en
   una defensa.

   Lo que sí hay que hacer bien, y está hecho:

     - las líneas terminan en CRLF, no en \n. SMTP no es flexible
       con esto;
     - una línea del cuerpo que empiece con un punto se escribe con
       dos, porque un punto solo en una línea es la marca de fin de
       mensaje (esto se llama dot-stuffing);
     - el asunto con acentos va codificado en base64 según el
       RFC 2047, o llega como "Confirm=C3=A1";
     - las respuestas del servidor pueden ocupar varias líneas:
       "250-" significa que sigue y "250 " que terminó;
     - después de STARTTLS hay que repetir el EHLO, porque las
       capacidades anunciadas antes de cifrar no valen;
     - hay timeout en todo: si el relay no contesta, el registro de
       un cliente no puede quedarse colgado esperando.

   Para Brevo (plan gratuito, 300 por día, no pide tarjeta):
     servidor  smtp-relay.brevo.com
     puerto    587  (STARTTLS)   o   465  (TLS directo)
     usuario   la dirección con la que entrás a Brevo
     clave     una "clave SMTP" generada en el panel, NO la API key
   ============================================================ */

final class FbSmtpError extends RuntimeException
{
}

final class FbSmtp
{
    /** @var resource|null */
    private $sock = null;
    private array $cfg;
    private array $capacidades = [];
    /** Conversación con el servidor, para poder diagnosticar. Las
        líneas de autenticación se guardan tapadas. */
    private array $registro = [];

    public function __construct(array $cfg)
    {
        $this->cfg = $cfg + [
            'servidor'   => '',
            'puerto'     => 587,
            'usuario'    => '',
            'clave'      => '',
            'espera'     => 15,     // segundos
            'verificar'  => true,
            'ca'         => '',     // ruta a un cacert.pem
            /* '' decide por el puerto: el 465 cifra de entrada y
               cualquier otro arranca en claro y sube con STARTTLS.
               Se puede forzar con 'directo' o 'starttls' para un
               servidor que use un puerto distinto del habitual. */
            'cifrado'    => '',
        ];
    }

    /* true si hay que cifrar desde el primer byte. */
    private function cifradoDirecto(): bool
    {
        $modo = (string) $this->cfg['cifrado'];
        if ($modo === 'directo')  return true;
        if ($modo === 'starttls') return false;
        return (int) $this->cfg['puerto'] === 465;
    }

    public function transcripcion(): string
    {
        return implode("\n", $this->registro);
    }

    /* ------------------------------------------------------------
       Conversación
       ------------------------------------------------------------ */

    private function conectar(): void
    {
        $puerto = (int) $this->cfg['puerto'];
        $host   = (string) $this->cfg['servidor'];

        /* El 465 cifra desde el primer byte; el 587 arranca en claro
           y sube a TLS con STARTTLS unos comandos después. */
        $destino = ($this->cifradoDirecto() ? 'ssl://' : 'tcp://') . $host . ':' . $puerto;

        $ctx = stream_context_create(['ssl' => $this->opcionesTls($host)]);

        $err = 0;
        $msg = '';
        $sock = @stream_socket_client(
            $destino, $err, $msg, (float) $this->cfg['espera'],
            STREAM_CLIENT_CONNECT, $ctx);

        if ($sock === false) {
            throw new FbSmtpError(
                "No pude conectarme a $host:$puerto — " . ($msg ?: "error $err") . '.');
        }
        $this->sock = $sock;
        stream_set_timeout($this->sock, (int) $this->cfg['espera']);

        $this->esperar(220, 'saludo del servidor');
    }

    private function opcionesTls(string $host): array
    {
        $ssl = [
            'peer_name'         => $host,
            'verify_peer'       => (bool) $this->cfg['verificar'],
            'verify_peer_name'  => (bool) $this->cfg['verificar'],
            'SNI_enabled'       => true,
            /* Sin esto, PHP acepta certificados autofirmados cuando
               verify_peer está en true, que es justo lo que no
               queremos. */
            'allow_self_signed' => false,
        ];
        $ca = (string) $this->cfg['ca'];
        if ($ca !== '' && is_file($ca)) {
            $ssl['cafile'] = $ca;
        }
        return $ssl;
    }

    private function escribir(string $linea, bool $tapar = false): void
    {
        $this->registro[] = '> ' . ($tapar ? '(dato tapado)' : $linea);
        if (@fwrite($this->sock, $linea . "\r\n") === false) {
            throw new FbSmtpError('Se cortó la conexión al escribir.');
        }
    }

    /* Lee una respuesta completa, que puede ocupar varias líneas.
       Devuelve [código, texto completo]. */
    private function leer(): array
    {
        $texto = '';
        $codigo = 0;
        while (true) {
            $linea = @fgets($this->sock, 1024);
            if ($linea === false || $linea === '') {
                $meta = @stream_get_meta_data($this->sock);
                if (!empty($meta['timed_out'])) {
                    throw new FbSmtpError(
                        'El servidor no contestó en ' . $this->cfg['espera'] . ' segundos.');
                }
                throw new FbSmtpError('Se cortó la conexión al leer la respuesta.');
            }
            $this->registro[] = '< ' . rtrim($linea, "\r\n");
            $texto .= $linea;
            /* "250-algo" sigue; "250 algo" cierra. El cuarto carácter
               es el que lo dice. */
            if (strlen($linea) < 4 || $linea[3] !== '-') {
                $codigo = (int) substr($linea, 0, 3);
                break;
            }
        }
        return [$codigo, $texto];
    }

    private function esperar(int $esperado, string $paso): string
    {
        [$codigo, $texto] = $this->leer();
        if ($codigo !== $esperado) {
            throw new FbSmtpError(
                "El servidor respondió $codigo donde esperaba $esperado ($paso): "
                . trim(preg_replace('/\s+/', ' ', $texto) ?? ''));
        }
        return $texto;
    }

    private function orden(string $linea, int $esperado, string $paso, bool $tapar = false): string
    {
        $this->escribir($linea, $tapar);
        return $this->esperar($esperado, $paso);
    }

    private function ehlo(): void
    {
        /* El nombre que anunciamos. Algunos relays rechazan un EHLO
           con un nombre que no parece un host. */
        $yo = (string) ($this->cfg['yo'] ?? '');
        if ($yo === '') {
            $yo = $_SERVER['SERVER_NAME'] ?? 'localhost';
            if (!preg_match('/^[A-Za-z0-9.\-]+$/', $yo)) {
                $yo = 'localhost';
            }
        }
        $texto = $this->orden('EHLO ' . $yo, 250, 'EHLO');

        $this->capacidades = [];
        foreach (preg_split('/\r?\n/', trim($texto)) as $linea) {
            $cap = trim(substr($linea, 4));
            if ($cap === '') {
                continue;
            }
            $partes = preg_split('/\s+/', strtoupper($cap)) ?: [];
            $this->capacidades[$partes[0]] = array_slice($partes, 1);
        }
    }

    private function subirATls(): void
    {
        if (!array_key_exists('STARTTLS', $this->capacidades)) {
            throw new FbSmtpError(
                'El servidor no ofrece STARTTLS, así que la contraseña viajaría en claro. '
                . 'Revisá el puerto: 587 usa STARTTLS y 465 cifra de entrada.');
        }
        $this->orden('STARTTLS', 220, 'STARTTLS');

        $ok = @stream_socket_enable_crypto(
            $this->sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);

        if ($ok !== true) {
            $ultimo = error_get_last()['message'] ?? '';
            throw new FbSmtpError(
                'No pude establecer el cifrado TLS. '
                . ($ultimo !== '' ? "($ultimo) " : '')
                . 'Si dice algo de "certificate verify failed", a PHP le falta el archivo '
                . 'de autoridades: en XAMPP está en php\\extras\\ssl\\cacert.pem y se '
                . "indica con la clave 'smtp_ca' en config.php.");
        }
        $this->registro[] = '— cifrado TLS establecido —';
        /* Obligatorio: lo que el servidor anunció antes de cifrar no
           cuenta, y la autenticación suele aparecer solo ahora. */
        $this->ehlo();
    }

    private function autenticar(): void
    {
        $usuario = (string) $this->cfg['usuario'];
        $clave   = (string) $this->cfg['clave'];
        if ($usuario === '' || $clave === '') {
            throw new FbSmtpError('Faltan el usuario o la clave SMTP en config.php.');
        }
        if (!isset($this->capacidades['AUTH'])) {
            throw new FbSmtpError('El servidor no pide (ni acepta) autenticación.');
        }
        $modos = $this->capacidades['AUTH'];

        if (in_array('LOGIN', $modos, true)) {
            $this->orden('AUTH LOGIN', 334, 'AUTH LOGIN');
            $this->orden(base64_encode($usuario), 334, 'usuario', true);
            $this->orden(base64_encode($clave), 235, 'clave', true);
        } elseif (in_array('PLAIN', $modos, true)) {
            $this->orden(
                'AUTH PLAIN ' . base64_encode("\0" . $usuario . "\0" . $clave),
                235, 'AUTH PLAIN', true);
        } else {
            throw new FbSmtpError(
                'El servidor solo acepta ' . implode(', ', $modos)
                . ', y este cliente hace LOGIN y PLAIN.');
        }
    }

    /* ------------------------------------------------------------
       Envío
       ------------------------------------------------------------ */

    public function enviar(string $sobreDe, string $para, string $mensaje): void
    {
        try {
            $this->conectar();
            $this->ehlo();
            if (!$this->cifradoDirecto()) {
                $this->subirATls();
            }
            $this->autenticar();

            $this->orden('MAIL FROM:<' . $sobreDe . '>', 250, 'MAIL FROM');
            $this->orden('RCPT TO:<' . $para . '>', 250, 'RCPT TO');
            $this->orden('DATA', 354, 'DATA');

            /* El cuerpo no pasa por escribir(): no queremos el mensaje
               entero en la transcripción ni línea por línea.

               El punto final tiene que ir solo en su línea, así que
               antes hace falta un CRLF — pero solo si el mensaje no
               termina ya en uno, o se cuela una línea vacía de más
               al final del cuerpo. */
            $cuerpo = fb_smtp_puntos($mensaje);
            if (!str_ends_with($cuerpo, "\r\n")) {
                $cuerpo .= "\r\n";
            }
            if (@fwrite($this->sock, $cuerpo . ".\r\n") === false) {
                throw new FbSmtpError('Se cortó la conexión mandando el mensaje.');
            }
            $this->registro[] = '> (mensaje, ' . strlen($mensaje) . ' bytes)';
            $this->esperar(250, 'fin del mensaje');

            $this->escribir('QUIT');
            /* La respuesta al QUIT no cambia nada: si el mensaje ya
               fue aceptado, está mandado. */
        } finally {
            if (is_resource($this->sock)) {
                @fclose($this->sock);
                $this->sock = null;
            }
        }
    }
}

/* ------------------------------------------------------------
   Armado del mensaje  (funciones puras, se pueden probar solas)
   ------------------------------------------------------------ */

/* Normaliza los finales de línea a CRLF y duplica el punto inicial
   de cualquier línea que empiece con uno. */
function fb_smtp_puntos(string $datos): string
{
    $datos = preg_replace("/\r\n|\r|\n/", "\r\n", $datos) ?? $datos;
    if (str_starts_with($datos, '.')) {
        $datos = '.' . $datos;
    }
    return str_replace("\r\n.", "\r\n..", $datos);
}

/* Codifica un texto para una cabecera. Si es ASCII puro lo deja como
   está; si tiene acentos lo parte en palabras codificadas del RFC
   2047 de 75 caracteres como máximo, sin cortar un carácter en dos. */
function fb_mime_cabecera(string $texto): string
{
    $texto = str_replace(["\r", "\n", "\0"], '', $texto);
    if (preg_match('/^[\x20-\x7E]*$/', $texto)) {
        return $texto;
    }
    /* 75 es el máximo de una palabra codificada. Le restamos
       "=?UTF-8?B?" y "?=" y lo que crece el base64 (4 por cada 3),
       y queda un tope de 45 bytes de texto por palabra. */
    $trozos = [];
    $actual = '';
    foreach (preg_split('//u', $texto, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $caracter) {
        if (strlen($actual . $caracter) > 45) {
            $trozos[] = $actual;
            $actual = '';
        }
        $actual .= $caracter;
    }
    if ($actual !== '') {
        $trozos[] = $actual;
    }
    $palabras = array_map(
        static fn(string $t): string => '=?UTF-8?B?' . base64_encode($t) . '?=',
        $trozos);

    /* Varias palabras codificadas se separan plegando la cabecera:
       salto de línea y un espacio al principio de la siguiente. */
    return implode("\r\n ", $palabras);
}

/* "Nombre <correo>" con el nombre codificado si hace falta. */
function fb_mime_direccion(string $correo, string $nombre = ''): string
{
    $correo = fb_mime_correo($correo);
    if ($nombre === '') {
        return $correo;
    }
    $limpio = str_replace(["\r", "\n", "\0"], '', $nombre);
    if (preg_match('/^[\x20-\x7E]*$/', $limpio)) {
        /* ASCII: entre comillas, escapando las comillas y la barra. */
        return '"' . addcslashes($limpio, '"\\') . '" <' . $correo . '>';
    }
    return fb_mime_cabecera($limpio) . ' <' . $correo . '>';
}

/* Una dirección con un salto de línea adentro permitiría agregar
   cabeceras al mensaje (por ejemplo un Bcc). Se rechaza. */
function fb_mime_correo(string $correo): string
{
    $correo = trim($correo);
    if (strpbrk($correo, "\r\n\0 ") !== false || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        throw new FbSmtpError('Dirección de correo inválida: ' . $correo);
    }
    return $correo;
}

/* Mensaje completo: cabeceras más las dos versiones del cuerpo, la
   de texto y la de HTML, para que el lector elija. Las dos van en
   base64: así ningún acento se rompe y ninguna línea pasa de los 998
   caracteres que permite el protocolo. */
function fb_smtp_mensaje(
    string $deCorreo, string $deNombre,
    string $para, string $asunto,
    string $html, string $texto,
    string $responderA = ''
): string {
    $deCorreo = fb_mime_correo($deCorreo);
    $borde = '=_4q_' . bin2hex(random_bytes(12));

    $dominio = substr($deCorreo, strpos($deCorreo, '@') + 1);
    $id = '<' . bin2hex(random_bytes(16)) . '@' . $dominio . '>';

    $cab = [
        'Date'         => date('r'),
        'From'         => fb_mime_direccion($deCorreo, $deNombre),
        'To'           => fb_mime_correo($para),
        'Subject'      => fb_mime_cabecera($asunto),
        'Message-ID'   => $id,
        'MIME-Version' => '1.0',
        'Content-Type' => 'multipart/alternative; boundary="' . $borde . '"',
    ];
    if ($responderA !== '') {
        $cab['Reply-To'] = fb_mime_correo($responderA);
    }
    /* Deja claro que es un correo automático: evita que un "fuera de
       oficina" conteste y vuelva a disparar el circuito. */
    $cab['Auto-Submitted'] = 'auto-generated';

    $salida = '';
    foreach ($cab as $nombre => $valor) {
        $salida .= $nombre . ': ' . $valor . "\r\n";
    }
    $salida .= "\r\n";

    $salida .= '--' . $borde . "\r\n"
             . "Content-Type: text/plain; charset=UTF-8\r\n"
             . "Content-Transfer-Encoding: base64\r\n\r\n"
             . chunk_split(base64_encode($texto), 76, "\r\n")
             . '--' . $borde . "\r\n"
             . "Content-Type: text/html; charset=UTF-8\r\n"
             . "Content-Transfer-Encoding: base64\r\n\r\n"
             . chunk_split(base64_encode($html), 76, "\r\n")
             . '--' . $borde . "--\r\n";

    return $salida;
}

/* ------------------------------------------------------------
   Punto de entrada
   ------------------------------------------------------------ */

/* Devuelve true si el relay aceptó el mensaje. Si falla, deja el
   motivo y la conversación en el log de PHP y devuelve el error en
   $motivo para que quien llama decida qué mostrar. */
function fb_smtp_enviar(
    array $cfg, string $para, string $asunto,
    string $html, string $texto, ?string &$motivo = null
): bool {
    $motivo = null;
    $cliente = new FbSmtp([
        'servidor'  => $cfg['smtp_servidor'] ?? '',
        'puerto'    => (int) ($cfg['smtp_puerto'] ?? 587),
        'usuario'   => $cfg['smtp_usuario'] ?? '',
        'clave'     => $cfg['smtp_clave'] ?? '',
        'espera'    => (int) ($cfg['smtp_espera'] ?? 15),
        'verificar' => $cfg['smtp_verificar'] ?? true,
        'ca'        => $cfg['smtp_ca'] ?? '',
        'yo'        => $cfg['smtp_yo'] ?? '',
        'cifrado'   => $cfg['smtp_cifrado'] ?? '',
    ]);

    try {
        $mensaje = fb_smtp_mensaje(
            (string) ($cfg['correo_desde'] ?? ''),
            (string) ($cfg['correo_desde_nombre'] ?? ''),
            $para, $asunto, $html, $texto,
            (string) ($cfg['correo_responder'] ?? ''));

        /* El remitente del sobre puede diferir del From visible, y
           es el que recibe los rebotes. */
        $sobre = fb_mime_correo((string) ($cfg['correo_sobre'] ?? $cfg['correo_desde'] ?? ''));

        $cliente->enviar($sobre, fb_mime_correo($para), $mensaje);
        return true;

    } catch (Throwable $e) {
        $motivo = $e->getMessage();
        error_log("SMTP falló para $para: $motivo\n" . $cliente->transcripcion());
        return false;
    }
}
