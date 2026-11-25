<?php
declare(strict_types=1);
require __DIR__ . '/db.php';

/* Devuelve el catálogo completo en JSON, con la misma forma que hoy
   tiene FB en productos.js. Es el endpoint que va a consumir el
   sitio cuando esté en el hosting con PHP.

   Mientras tanto el sitio público sigue leyendo productos.js, que
   se regenera con exportar-js.php. Los dos caminos salen de la
   misma base, así que no pueden desincronizarse. */

try {
    $db = fb_db();
    fb_json([
        'ok'         => true,
        'generado'   => date('c'),
        'empresa'    => fb_empresa($db),
        'categorias' => fb_categorias($db),
        'sucursales' => fb_sucursales($db),
        'productos'  => fb_productos($db),
    ]);
} catch (Throwable $e) {
    $c = fb_config();
    fb_morir(500, 'Error al leer el catálogo.' . (!empty($c['depurar']) ? ' ' . $e->getMessage() : ''));
}
