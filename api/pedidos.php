<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

/* Pedidos del cliente.

     GET            los pedidos de quien está conectado
     GET  ?id=42    el detalle de uno, con sus renglones
     POST           guarda un pedido nuevo con lo que hay en el carrito

   La regla que gobierna el POST: del navegador se acepta QUÉ se
   pide (producto, presentación, cantidad) y nunca CUÁNTO sale. Los
   precios se buscan acá, en la base. Si el total llegara del
   navegador, cualquiera podría pedir una picada de dos kilos a
   cincuenta pesos cambiando un número en la consola. */

/* Tope por cliente y por hora. No es por abuso de desconocidos
   —hay que tener cuenta confirmada para llegar hasta acá— sino
   para que un botón que se traba apretado no llene la tabla. */
const FB_MAX_PEDIDOS_HORA = 10;

/* Un pedido de más de esto es un error de carga, no una compra.
   Además mantiene el total lejos del techo de un INT UNSIGNED. */
const FB_TOTAL_MAXIMO = 20000000;

const FB_MAX_RENGLONES = 50;

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $db = fb_db();
    $cliente = fb_exigir_cliente();
    $clienteId = (int) $cliente['id'];

    /* ---------------------------------------------------------- */
    if ($metodo === 'GET') {
        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

        if ($id > 0) {
            /* El WHERE lleva cliente_id además del id: sin eso,
               cambiar el número en la dirección mostraría el pedido
               de otra persona. */
            $st = $db->prepare(
                'SELECT id, estado, total, nota, canal, creado, sucursal,
                        renglones, unidades
                 FROM v_pedidos WHERE id = ? AND cliente_id = ?');
            $st->execute([$id, $clienteId]);
            $p = $st->fetch();
            if (!$p) {
                fb_morir(404, 'No encontré ese pedido.');
            }

            $st = $db->prepare(
                'SELECT producto_id, nombre, unidad, etiqueta, precio, cantidad, subtotal
                 FROM pedido_items WHERE pedido_id = ? ORDER BY id');
            $st->execute([$id]);

            $p['numero'] = fb_numero_pedido((int) $p['id']);
            $p['items']  = $st->fetchAll();
            fb_json(['ok' => true, 'pedido' => $p]);
        }

        $st = $db->prepare(
            'SELECT id, estado, total, creado, sucursal, renglones, unidades
             FROM v_pedidos WHERE cliente_id = ?
             ORDER BY creado DESC, id DESC LIMIT 50');
        $st->execute([$clienteId]);
        $pedidos = $st->fetchAll();
        foreach ($pedidos as &$p) {
            $p['numero'] = fb_numero_pedido((int) $p['id']);
        }
        unset($p);
        fb_json(['ok' => true, 'pedidos' => $pedidos]);
    }

    /* ---------------------------------------------------------- */
    if ($metodo !== 'POST') {
        fb_morir(405, 'Este endpoint acepta GET y POST.');
    }

    $d = fb_entrada();
    fb_exigir_csrf($d);

    /* Sin el correo confirmado no se guarda el pedido: es el único
       modo de avisarle a la persona si algo pasa con lo que pidió. */
    if ((int) ($cliente['verificado'] ?? 0) !== 1) {
        fb_json(['ok' => false, 'verificar' => true,
                 'error' => 'Confirmá tu correo antes de hacer un pedido.'], 403);
    }

    $st = $db->prepare('SELECT COUNT(*) FROM pedidos
                        WHERE cliente_id = ? AND creado > DATE_SUB(NOW(), INTERVAL 1 HOUR)');
    $st->execute([$clienteId]);
    if ((int) $st->fetchColumn() >= FB_MAX_PEDIDOS_HORA) {
        fb_json(['ok' => false,
                 'error' => 'Hiciste varios pedidos en la última hora. '
                          . 'Esperá un rato o llamanos al local.'], 429);
    }

    /* ---------- lo que mandó el navegador ---------- */
    $crudos = $d['items'] ?? null;
    if (!is_array($crudos) || $crudos === []) {
        fb_json(['ok' => false, 'error' => 'El carrito está vacío.'], 422);
    }
    if (count($crudos) > FB_MAX_RENGLONES) {
        fb_json(['ok' => false,
                 'error' => 'Son demasiados renglones para un pedido web. '
                          . 'Escribinos y lo armamos juntos.'], 422);
    }

    /* Se juntan los repetidos. El carrito ya lo hace, pero un
       pedido armado a mano podría mandar dos veces el mismo par
       producto+presentación y quedaría un pedido raro de leer. */
    $pedido = [];
    foreach ($crudos as $it) {
        if (!is_array($it)) {
            fb_json(['ok' => false, 'error' => 'Hay un renglón mal formado.'], 422);
        }
        $pid    = trim((string) ($it['id'] ?? ''));
        $unidad = (string) ($it['unidad'] ?? '');
        $cant   = (int) ($it['cantidad'] ?? 0);

        if ($pid === '' || strlen($pid) > 20) {
            fb_json(['ok' => false, 'error' => 'Hay un producto sin identificar.'], 422);
        }
        if (!in_array($unidad, ['g100', 'media', 'kg', 'u1', 'u2', 'u6'], true)) {
            fb_json(['ok' => false,
                     'error' => 'Hay una presentación que no existe.'], 422);
        }
        if ($cant < 1 || $cant > 99) {
            fb_json(['ok' => false,
                     'error' => 'Las cantidades van de 1 a 99. Para más, escribinos.'], 422);
        }
        $clave = $pid . '|' . $unidad;
        $pedido[$clave] = ($pedido[$clave] ?? 0) + $cant;
        if ($pedido[$clave] > 99) {
            $pedido[$clave] = 99;
        }
    }

    /* ---------- los precios, de la base ---------- */
    $ids = array_values(array_unique(array_map(
        static fn(string $k): string => explode('|', $k)[0], array_keys($pedido))));

    $huecos = implode(',', array_fill(0, count($ids), '?'));
    $st = $db->prepare(
        "SELECT p.id, p.nombre, pr.unidad, pr.valor
         FROM productos p
         JOIN precios pr ON pr.producto_id = p.id
         WHERE p.id IN ($huecos) AND p.activo = 1");
    $st->execute($ids);

    $catalogo = [];
    foreach ($st->fetchAll() as $f) {
        $catalogo[$f['id'] . '|' . $f['unidad']] = $f;
    }

    $items = [];
    $total = 0;
    foreach ($pedido as $clave => $cant) {
        if (!isset($catalogo[$clave])) {
            /* O el producto se dio de baja, o esa presentación no
               tiene precio cargado. Las dos cosas pasan de verdad:
               alguien deja el carrito abierto una semana y mientras
               tanto el local saca el producto. */
            [$pid, $unidad] = explode('|', $clave);
            fb_json(['ok' => false, 'desactualizado' => true,
                     'error' => 'Uno de los productos del carrito ya no está disponible. '
                              . 'Actualizá la página y revisalo antes de pedir.',
                     'producto_id' => $pid], 409);
        }
        $f = $catalogo[$clave];
        $precio = (int) $f['valor'];
        $sub = $precio * $cant;
        $total += $sub;

        $items[] = [
            'producto_id' => $f['id'],
            'nombre'      => $f['nombre'],
            'unidad'      => $f['unidad'],
            'etiqueta'    => fb_etiqueta_unidad((string) $f['unidad']),
            'precio'      => $precio,
            'cantidad'    => $cant,
            'subtotal'    => $sub,
        ];
    }

    if ($total <= 0 || $total > FB_TOTAL_MAXIMO) {
        fb_json(['ok' => false,
                 'error' => 'Ese total no parece un pedido real. Revisá las cantidades '
                          . 'o escribinos y lo armamos juntos.'], 422);
    }

    /* ---------- sucursal y nota ---------- */
    $sucursalId = (int) ($d['sucursal_id'] ?? 0);
    $st = $db->prepare('SELECT id, nombre FROM sucursales WHERE id = ? AND activa = 1');
    $st->execute([$sucursalId]);
    $sucursal = $st->fetch();
    if (!$sucursal) {
        fb_json(['ok' => false, 'error' => 'Elegí una sucursal para retirar.'], 422);
    }

    /* Los saltos de línea se respetan; el resto de los caracteres
       de control se va, que en un campo de texto no pintan nada. */
    $nota = (string) ($d['nota'] ?? '');
    $nota = preg_replace('/[^\P{C}\n]+/u', '', $nota) ?? '';
    $nota = trim(mb_substr($nota, 0, 500));

    /* ---------- guardar ---------- */
    $db->beginTransaction();

    $nombre = trim($cliente['nombre'] . ' ' . (string) ($cliente['apellido'] ?? ''));
    $db->prepare('INSERT INTO pedidos
                    (cliente_id, sucursal_id, nombre, telefono, correo, total, nota, canal)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
       ->execute([$clienteId, $sucursalId, $nombre,
                  $cliente['telefono'], $cliente['correo'], $total,
                  $nota !== '' ? $nota : null, 'web']);

    $pedidoId = (int) $db->lastInsertId();

    $ins = $db->prepare('INSERT INTO pedido_items
                           (pedido_id, producto_id, nombre, unidad, etiqueta,
                            precio, cantidad, subtotal)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    foreach ($items as $i) {
        $ins->execute([$pedidoId, $i['producto_id'], $i['nombre'], $i['unidad'],
                       $i['etiqueta'], $i['precio'], $i['cantidad'], $i['subtotal']]);
    }

    $db->commit();

    fb_json([
        'ok'       => true,
        'id'       => $pedidoId,
        'numero'   => fb_numero_pedido($pedidoId),
        'total'    => $total,
        'sucursal' => $sucursal['nombre'],
        'items'    => $items,
        'mensaje'  => 'Guardamos tu pedido ' . fb_numero_pedido($pedidoId) . '.',
    ], 201);

} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    $cfg = fb_config();
    fb_morir(500, 'No pude guardar el pedido.'
        . (!empty($cfg['depurar']) ? ' ' . $e->getMessage() : ''));
}
