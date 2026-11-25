<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';

/* Envío de correo.

   En XAMPP no hay servidor de correo, así que mandar de verdad
   fallaría y no se podría probar nada. Por eso hay dos modos, que
   se eligen en config.php con 'correo_modo':

     'archivo' — guarda el mensaje en almacen/correos/ como un .html
                 que se abre con doble clic. Sirve para desarrollar:
                 el enlace de verificación funciona igual.
     'smtp'    — envía de verdad. Pensado para Brevo, que tiene plan
                 gratuito de 300 por día y no pide tarjeta.

   El modo 'smtp' necesita una librería (PHPMailer o similar) que
   todavía no está instalada: cuando contrates el hosting se agrega
   y se completa fb_enviar_smtp(). Hasta entonces el modo archivo
   alcanza para desarrollar y mostrar el flujo funcionando. */

function fb_enviar_correo(string $para, string $asunto, string $html, string $texto = ''): bool
{
    $c = fb_config();
    $modo = $c['correo_modo'] ?? 'archivo';

    return match ($modo) {
        'smtp'   => fb_enviar_smtp($para, $asunto, $html, $texto),
        default  => fb_enviar_a_archivo($para, $asunto, $html),
    };
}

function fb_enviar_a_archivo(string $para, string $asunto, string $html): bool
{
    $carpeta = dirname(__DIR__) . '/almacen/correos';
    if (!is_dir($carpeta) && !@mkdir($carpeta, 0775, true) && !is_dir($carpeta)) {
        error_log('No pude crear ' . $carpeta);
        return false;
    }
    $nombre = date('Y-m-d_His') . '_' . preg_replace('/[^a-z0-9]+/i', '-', $para) . '.html';
    $cabecera = '<!DOCTYPE html><meta charset="utf-8">'
              . '<div style="font:13px/1.5 system-ui;background:#F2EDE6;padding:12px;margin-bottom:16px">'
              . '<strong>Correo simulado</strong> — no se envió a ningún lado.<br>'
              . 'Para: ' . htmlspecialchars($para, ENT_QUOTES) . '<br>'
              . 'Asunto: ' . htmlspecialchars($asunto, ENT_QUOTES) . '<br>'
              . 'Fecha: ' . date('d/m/Y H:i') . '</div>';
    return file_put_contents($carpeta . '/' . $nombre, $cabecera . $html) !== false;
}

function fb_enviar_smtp(string $para, string $asunto, string $html, string $texto): bool
{
    error_log('fb_enviar_smtp todavía no está implementado; se usó el modo archivo.');
    return fb_enviar_a_archivo($para, $asunto, $html);
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
