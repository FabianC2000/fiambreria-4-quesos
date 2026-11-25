<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

/* Confirma la dirección de correo. Se abre desde el enlace del
   mensaje, así que responde con una página y no con JSON. */

$token = (string) ($_GET['t'] ?? '');
$base  = rtrim((string) (fb_config()['url_base'] ?? ''), '/');

function fb_pagina_verificacion(string $titulo, string $texto, string $base, bool $bien): void
{
    $t = htmlspecialchars($titulo, ENT_QUOTES);
    $x = htmlspecialchars($texto, ENT_QUOTES);
    $color = $bien ? '#1E5233' : '#7A1C28';
    http_response_code($bien ? 200 : 400);
    header('Content-Type: text/html; charset=utf-8');
    echo <<<HTML
<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{$t} — Fiambrería 4 Quesos</title>
<link rel="stylesheet" href="{$base}/assets/css/style.css"></head>
<body style="background:#FDFBF7">
<main class="contenedor" style="max-width:560px;padding:12vh 0 8vh;text-align:center">
  <h1 style="font-family:var(--display);font-size:var(--t-xl);color:{$color};margin:0 0 var(--e-4)">{$t}</h1>
  <p style="font-size:var(--t-m);color:#3F3550;line-height:1.6">{$x}</p>
  <p style="margin-top:var(--e-7)">
    <a class="btn btn-ciruela" href="{$base}/cuenta/ingresar.html">Iniciar sesión</a>
    <a class="btn btn-linea" href="{$base}/index.html">Ir al sitio</a>
  </p>
</main></body></html>
HTML;
    exit;
}

try {
    $db = fb_db();
    $fila = fb_mirar_token($db, $token, 'verificacion');

    if (!$fila) {
        fb_pagina_verificacion(
            'Este enlace ya no sirve',
            'Puede que haya vencido (duran 48 horas) o que ya lo hayas usado. '
          . 'Si tu cuenta todavía no está confirmada, iniciá sesión y te mandamos uno nuevo.',
            $base, false);
    }

    $db->beginTransaction();
    $db->prepare('UPDATE clientes SET verificado = 1 WHERE id = ?')->execute([$fila['cliente_id']]);
    fb_consumir_token($db, (int) $fila['id']);
    /* Cualquier otro token de verificación pendiente de esta persona
       deja de servir: ya cumplió su función. */
    $db->prepare('UPDATE tokens SET usado = NOW()
                  WHERE cliente_id = ? AND tipo = "verificacion" AND usado IS NULL')
       ->execute([$fila['cliente_id']]);
    $db->commit();

    fb_pagina_verificacion('Correo confirmado',
        'Listo, tu cuenta quedó activa. Ya podés iniciar sesión.', $base, true);

} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    fb_pagina_verificacion('No pude confirmar tu correo',
        'Hubo un problema de nuestro lado. Probá de nuevo en un rato.', $base, false);
}
