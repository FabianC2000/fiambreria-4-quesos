<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/smtp.php';

/* Envío de correo.

   Dos modos, que se eligen en config.php con 'correo_modo':

     'archivo' — guarda el mensaje en almacen/correos/ como un .html
                 que se abre con doble clic. Es el modo para
                 desarrollar en XAMPP, que no tiene servidor de
                 correo: el enlace de verificación funciona igual.
     'smtp'    — manda de verdad, por el relay configurado.

   El modo 'archivo' nunca falla por red, así que sirve también para
   mostrar el circuito completo sin depender de internet. */

function fb_enviar_correo(
    string $para, string $asunto, string $html,
    string $texto = '', ?string &$motivo = null
): bool {
    $c = fb_config();
    $motivo = null;

    if ($texto === '') {
        $texto = fb_html_a_texto($html);
    }

    return match ($c['correo_modo'] ?? 'archivo') {
        'smtp'  => fb_smtp_enviar($c, $para, $asunto, $html, $texto, $motivo),
        default => fb_enviar_a_archivo($para, $asunto, $html, $motivo),
    };
}

function fb_enviar_a_archivo(
    string $para, string $asunto, string $html, ?string &$motivo = null
): bool {
    $carpeta = dirname(__DIR__) . '/almacen/correos';
    if (!is_dir($carpeta) && !@mkdir($carpeta, 0775, true) && !is_dir($carpeta)) {
        $motivo = 'No pude crear la carpeta ' . $carpeta;
        error_log($motivo);
        return false;
    }
    $nombre = date('Y-m-d_His') . '_' . preg_replace('/[^a-z0-9]+/i', '-', $para) . '.html';
    $cabecera = '<!DOCTYPE html><meta charset="utf-8">'
              . '<div style="font:13px/1.5 system-ui;background:#F2EDE6;padding:12px;margin-bottom:16px">'
              . '<strong>Correo simulado</strong> — no se envió a ningún lado.<br>'
              . 'Para: ' . htmlspecialchars($para, ENT_QUOTES) . '<br>'
              . 'Asunto: ' . htmlspecialchars($asunto, ENT_QUOTES) . '<br>'
              . 'Fecha: ' . date('d/m/Y H:i') . '</div>';

    if (file_put_contents($carpeta . '/' . $nombre, $cabecera . $html) === false) {
        $motivo = 'No pude escribir ' . $nombre;
        error_log($motivo);
        return false;
    }
    return true;
}

/* Versión de texto plano del mensaje, para los lectores que no
   muestran HTML y porque un correo con solo HTML puntúa peor en los
   filtros de spam.

   Los enlaces no se pierden: las plantillas siempre escriben la
   dirección completa en el texto, además del botón. */
function fb_html_a_texto(string $html): string
{
    $t = preg_replace('/<(br|\/p|\/div|\/h[1-6]|\/li)[^>]*>/i', "\n", $html) ?? $html;
    $t = preg_replace('/<li[^>]*>/i', '· ', $t) ?? $t;
    $t = strip_tags($t);
    $t = html_entity_decode($t, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    /* Sangrías del HTML y líneas vacías de más. */
    $t = preg_replace('/[ \t]+/', ' ', $t) ?? $t;
    $t = preg_replace('/ ?\n ?/', "\n", $t) ?? $t;
    $t = preg_replace('/\n{3,}/', "\n\n", $t) ?? $t;
    return trim($t);
}

/* ------------------------------------------------------------
   Plantillas
   ------------------------------------------------------------ */

/* Marco común: encabezado con la marca, cuerpo y pie. Sin imágenes
   externas, que es lo que los correos suelen bloquear. */
function fb_plantilla_correo(string $titulo, string $cuerpo, string $pie = ''): string
{
    $t = htmlspecialchars($titulo, ENT_QUOTES);
    return <<<HTML
<div style="margin:0;padding:24px;background:#F2EDE6;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#FDFBF7;border-radius:10px;overflow:hidden">
    <div style="background:#1A1625;padding:20px 28px">
      <span style="color:#E5A93C;font-size:19px;font-weight:bold">Fiambrería 4 Quesos</span>
    </div>
    <div style="padding:28px">
      <h1 style="margin:0 0 14px;font-size:20px;color:#1A1625">{$t}</h1>
      <div style="font-size:15px;line-height:1.6;color:#3F3550">{$cuerpo}</div>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #E8E1D8;font-size:12px;color:#8C8396">
      {$pie}
    </div>
  </div>
</div>
HTML;
}

function fb_boton_correo(string $url, string $texto): string
{
    $u = htmlspecialchars($url, ENT_QUOTES);
    $t = htmlspecialchars($texto, ENT_QUOTES);
    return '<p style="margin:22px 0"><a href="' . $u . '" '
         . 'style="display:inline-block;background:#E5A93C;color:#1A1625;text-decoration:none;'
         . 'padding:12px 22px;border-radius:8px;font-weight:bold">' . $t . '</a></p>'
         . '<p style="font-size:12px;color:#8C8396;word-break:break-all">Si el botón no anda, '
         . 'copiá y pegá esta dirección:<br>' . $u . '</p>';
}

/* ---------- los tres mensajes de cuenta ---------- */

function fb_correo_verificacion(string $nombre, string $enlace, bool $ofertas): array
{
    $cuerpo = '<p>Hola ' . htmlspecialchars($nombre, ENT_QUOTES) . ', gracias por crear tu cuenta.</p>'
            . '<p>Confirmá que esta casilla es tuya para poder usarla:</p>'
            . fb_boton_correo($enlace, 'Confirmar mi correo')
            . '<p style="font-size:13px;color:#6B6075">El enlace vence en 48 horas. '
            . 'Si no fuiste vos quien se registró, ignorá este mensaje.</p>';

    $pie = $ofertas
        ? 'Pediste recibir nuestras ofertas. Vas a poder darte de baja desde cualquier correo que te mandemos.'
        : 'No vas a recibir ofertas: solo mensajes necesarios de tu cuenta.';

    return ['Confirmá tu correo — Fiambrería 4 Quesos',
            fb_plantilla_correo('Confirmá tu correo', $cuerpo, $pie)];
}

function fb_correo_recuperacion(string $nombre, string $enlace, int $horas): array
{
    $cuerpo = '<p>Hola ' . htmlspecialchars($nombre, ENT_QUOTES) . '.</p>'
            . '<p>Alguien pidió una contraseña nueva para tu cuenta. Si fuiste vos, '
            . 'elegila acá:</p>'
            . fb_boton_correo($enlace, 'Elegir una contraseña nueva')
            . '<p style="font-size:13px;color:#6B6075">El enlace vence en ' . $horas
            . ' horas y se puede usar una sola vez.</p>'
            /* Decirle qué hacer si no fue él importa: si alguien está
               probando entrar, este correo es el primer aviso que
               recibe, y no tiene que quedarse sin saber qué hacer. */
            . '<p style="font-size:13px;color:#6B6075"><strong>Si no fuiste vos</strong>, '
            . 'no hace falta que hagas nada: tu contraseña sigue siendo la misma y el '
            . 'enlace vence solo. Si te llegan varios de estos mensajes seguidos, '
            . 'avisanos.</p>';

    return ['Contraseña nueva — Fiambrería 4 Quesos',
            fb_plantilla_correo('Elegí una contraseña nueva', $cuerpo,
                'Este mensaje se manda únicamente cuando alguien lo pide desde el sitio.')];
}

/* Aviso de que la contraseña cambió. No lleva ningún enlace para
   "deshacer": un correo que ofrece revertir algo es exactamente lo
   que imitaría una estafa. Si no fue la persona, tiene que escribir
   o llamar al local. */
function fb_correo_clave_cambiada(string $nombre, string $cuando): array
{
    $cuerpo = '<p>Hola ' . htmlspecialchars($nombre, ENT_QUOTES) . '.</p>'
            . '<p>La contraseña de tu cuenta se cambió el '
            . htmlspecialchars($cuando, ENT_QUOTES) . '. '
            . 'Las sesiones que tenías abiertas en otros dispositivos se cerraron.</p>'
            . '<p><strong>Si no fuiste vos</strong>, escribinos por WhatsApp o pasá por '
            . 'el local así lo revisamos juntos.</p>';

    return ['Se cambió la contraseña de tu cuenta — Fiambrería 4 Quesos',
            fb_plantilla_correo('Tu contraseña cambió', $cuerpo,
                'Te avisamos siempre que se cambie la contraseña, para que te enteres si no fuiste vos.')];
}
