<?php
declare(strict_types=1);
require __DIR__ . '/db.php';

/* Regenera assets/js/productos.js a partir de la base.

   Es el puente entre las dos etapas: la base pasa a ser la fuente de
   verdad, pero el sitio publicado en GitHub Pages es estático y no
   puede consultar MySQL. Entonces, cada vez que cambiás precios en
   la base, corrés esto y el archivo queda al día. Cuando el sitio
   se mude al hosting con PHP, se reemplaza por catalogo.php y este
   archivo se puede borrar.

   Escribe en el disco, así que solo corre desde la propia máquina.
   Nunca subir esto a un servidor público sin login. */

fb_solo_local();

const MARCA_INICIO = '/* === INICIO CATALOGO';
const MARCA_FIN    = '/* === FIN CATALOGO === */';

/** Literal JS para un texto, con las comillas y barras escapadas. */
function js_txt(?string $v): string
{
    if ($v === null || $v === '') return 'null';
    return "'" . str_replace(["\\", "'"], ["\\\\", "\\'"], $v) . "'";
}

function js_producto(array $p): string
{
    $campos = ["id:" . js_txt($p['id']), "nombre:" . js_txt($p['nombre'])];
    if (!empty($p['marca'])) $campos[] = 'marca:' . js_txt($p['marca']);
    $campos[] = 'categoria:' . js_txt($p['categoria']);
    if (!empty($p['sub'])) $campos[] = 'sub:' . js_txt($p['sub']);
    $campos[] = 'tipo:' . js_txt($p['tipo']);

    $extra = ['img:' . js_txt($p['img'] ?? null)];
    if (!empty($p['destacado'])) $extra[] = 'destacado:true';
    if (!empty($p['etiqueta']))  $extra[] = 'etiqueta:' . js_txt($p['etiqueta']);
    if (isset($p['antes']))      $extra[] = 'antes:' . (int) $p['antes'];
    if (!empty($p['semana']))    $extra[] = 'semana:true';

    $precios = [];
    foreach ($p['precios'] as $u => $v) $precios[] = "$u:$v";

    return "  { " . implode(', ', $campos) . ",\n"
         . "    " . implode(', ', $extra) . ",\n"
         . "    precios:{ " . implode(', ', $precios) . " } }";
}

try {
    $db = fb_db();
    $productos = fb_productos($db);

    $destino = dirname(__DIR__) . '/assets/js/productos.js';
    if (!is_file($destino)) {
        fb_morir(500, 'No encontré assets/js/productos.js.');
    }
    $texto = file_get_contents($destino);

    $i = strpos($texto, MARCA_INICIO);
    $j = strpos($texto, MARCA_FIN);
    if ($i === false || $j === false || $j < $i) {
        fb_morir(500, 'No encontré las marcas INICIO/FIN CATALOGO en productos.js.');
    }

    $hoy = date('d/m/Y H:i');
    $bloque = MARCA_INICIO . " — no borres esta línea ===\n"
            . "   Generado desde la base de datos el $hoy.\n"
            . "   " . count($productos) . " productos. No lo edites a mano: lo que escribas acá\n"
            . "   se pierde la próxima vez que se exporte. Los cambios van en la base.\n"
            . "   (api/exportar-js.php) */\n"
            . "FB.productos = [\n"
            . implode(",\n\n", array_map('js_producto', $productos)) . "\n"
            . "];\n"
            . MARCA_FIN;

    $nuevo = substr($texto, 0, $i) . $bloque . substr($texto, $j + strlen(MARCA_FIN));

    /* Copia de seguridad antes de pisar: si algo sale mal, el archivo
       anterior sigue estando. */
    $respaldo = $destino . '.bak';
    if (!copy($destino, $respaldo)) {
        fb_morir(500, 'No pude hacer la copia de seguridad; no toco el archivo.');
    }
    /* Red de seguridad: si el resultado salió mucho más corto que el
       original, algo se cortó y es preferible no escribir nada. */
    if (strlen($nuevo) < strlen($texto) / 2) {
        fb_morir(500, 'El archivo generado quedó sospechosamente corto; no lo escribo.');
    }
    if (file_put_contents($destino, $nuevo) === false) {
        fb_morir(500, 'No pude escribir productos.js. Revisá los permisos de la carpeta.');
    }

    fb_json([
        'ok'        => true,
        'productos' => count($productos),
        'archivo'   => 'assets/js/productos.js',
        'respaldo'  => 'assets/js/productos.js.bak',
        'aviso'     => 'Subí el archivo al repositorio para que se vea en el sitio público.',
    ]);
} catch (Throwable $e) {
    $c = fb_config();
    fb_morir(500, 'Error al exportar.' . (!empty($c['depurar']) ? ' ' . $e->getMessage() : ''));
}
