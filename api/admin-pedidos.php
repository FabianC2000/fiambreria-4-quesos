<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

/* Los pedidos, para el local.

     GET   lista los pedidos, con filtros
     POST  cambia el estado de uno

   Esta pantalla muestra datos de otras personas —nombre, teléfono,
   qué compró cada una—, así que pide sesión con rol 'admin'. Es la
   diferencia con panel.html, que no tiene contraseña: aquel arma un
   archivo con el catálogo y no sabe nada de nadie.

   Para hacer administrador a alguien, una vez que tiene su cuenta:

     UPDATE clientes SET rol = 'admin' WHERE correo = 'tucorreo@...';

   A propósito no hay forma de hacerlo desde el sitio. Si la
   hubiera, sería el primer lugar donde buscaría cualquiera. */

const FB_ESTADOS = ['nuevo', 'confirmado', 'listo', 'entregado', 'cancelado'];

/* Lo que el local mira todo el día: lo que todavía hay que atender. */
const FB_PENDIENTES = ['nuevo', 'confirmado', 'listo'];

const FB_MAX_LISTA = 100;

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $db = fb_db();
    $admin = fb_exigir_admin();

    /* ---------------------------------------------------------- */
    if ($metodo === 'POST') {
        $d = fb_entrada();
        fb_exigir_csrf($d);

        $id = (int) ($d['id'] ?? 0);
        $estado = (string) ($d['estado'] ?? '');

        if (!in_array($estado, FB_ESTADOS, true)) {
            fb_json(['ok' => false, 'error' => 'Ese estado no existe.'], 422);
        }

        $st = $db->prepare('SELECT estado FROM pedidos WHERE id = ?');
        $st->execute([$id]);
        $previo = $st->fetchColumn();
        if ($previo === false) {
            fb_json(['ok' => false, 'error' => 'No encontré ese pedido.'], 404);
        }

        /* Se permite cualquier cambio, incluso volver atrás. En un
           mostrador se toca el botón equivocado todo el tiempo, y
           tener que pedirle a alguien que arregle la base por un
           clic de más sería peor que dejar corregirlo acá.

           Lo que no se guarda todavía es quién lo cambió ni cuándo
           pasó por cada estado: eso necesitaría una tabla de
           historial. Por ahora queda la fecha del último cambio en
           pedidos.actualizado. */
        $db->prepare('UPDATE pedidos SET estado = ? WHERE id = ?')
           ->execute([$estado, $id]);

        fb_json(['ok' => true, 'id' => $id, 'estado' => $estado, 'previo' => $previo]);
    }

    if ($metodo !== 'GET') {
        fb_morir(405, 'Este endpoint acepta GET y POST.');
    }

    /* ---------------------------------------------------------- */
    /* Filtros                                                     */
    $where = [];
    $args  = [];

    $filtro = (string) ($_GET['filtro'] ?? 'pendientes');
    if ($filtro === 'pendientes') {
        $where[] = 'p.estado IN (' . implode(',', array_fill(0, count(FB_PENDIENTES), '?')) . ')';
        array_push($args, ...FB_PENDIENTES);
    } elseif (in_array($filtro, FB_ESTADOS, true)) {
        $where[] = 'p.estado = ?';
        $args[] = $filtro;
    }
    /* Cualquier otro valor, incluido 'todos', no filtra por estado. */

    $sucursal = (int) ($_GET['sucursal'] ?? 0);
    if ($sucursal > 0) {
        $where[] = 'p.sucursal_id = ?';
        $args[] = $sucursal;
    }

    /* Buscar por número de pedido, por nombre o por teléfono.

       No se adivina cuál de las tres cosas escribió: se buscan las
       tres a la vez. Adivinar fallaba con un teléfono, que es todo
       dígitos y se confundía con un número de pedido.

       El número que ve la gente es 4Q-00042, así que para comparar
       contra el id se le sacan el prefijo y los ceros. */
    $q = trim((string) ($_GET['q'] ?? ''));
    if ($q !== '') {
        $trozos = ["p.nombre LIKE ? ESCAPE '\\\\'", "p.telefono LIKE ? ESCAPE '\\\\'"];
        /* En LIKE, % y _ son comodines. Alguien que busca "100_g"
           no está pidiendo un comodín, así que se escapan; la barra
           invertida se declara con ESCAPE para que valga en MySQL
           tenga el modo que tenga. */
        $patron = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $q) . '%';
        $args[] = $patron;
        $args[] = $patron;

        /* El prefijo se saca ANTES de quedarse con los dígitos: el
           "4" de "4Q" es un dígito, así que "4Q-00042" sin esta
           línea se leía como el pedido 400042. */
        $sinPrefijo = preg_replace('/^\s*4\s*q[\s\-_.]*/i', '', $q) ?? $q;
        $soloDigitos = ltrim(preg_replace('/\D+/', '', $sinPrefijo) ?? '', '0');
        if ($soloDigitos !== '' && strlen($soloDigitos) <= 9) {
            $trozos[] = 'p.id = ?';
            $args[] = (int) $soloDigitos;
        }
        $where[] = '(' . implode(' OR ', $trozos) . ')';
    }

    $filtroSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    /* El orden depende de para qué se está mirando la lista.

       Viendo lo que falta atender, es una cola: primero el que más
       esperó. Con los más nuevos arriba, el pedido de hace dos
       horas queda al final de la pantalla, que es justo el que no
       hay que olvidarse.

       Viendo lo ya entregado o cancelado, en cambio, es un
       historial y lo que interesa es lo último que pasó. */
    $cola = $filtro === 'pendientes' || in_array($filtro, FB_PENDIENTES, true);
    $orden = $cola ? 'p.creado ASC, p.id ASC' : 'p.creado DESC, p.id DESC';

    /* ESCAPE '\\' acompaña al escapado de % y _ de más arriba. En
       MySQL la barra ya es el carácter de escape por omisión, pero
       declararlo deja de depender de la configuración del motor. */
    $st = $db->prepare(
        "SELECT p.id, p.estado, p.total, p.nota, p.canal, p.creado, p.actualizado,
                p.nombre, p.telefono, p.correo, p.cliente_id,
                s.nombre AS sucursal
         FROM pedidos p
         JOIN sucursales s ON s.id = p.sucursal_id
         $filtroSql
         ORDER BY $orden
         LIMIT " . FB_MAX_LISTA);
    $st->execute($args);
    $pedidos = $st->fetchAll();

    /* Los renglones de todos los pedidos de la página, en una sola
       consulta. Uno por pedido serían cien consultas para una
       pantalla que el local deja abierta y se actualiza sola. */
    $porPedido = [];
    if ($pedidos) {
        $ids = array_column($pedidos, 'id');
        $huecos = implode(',', array_fill(0, count($ids), '?'));
        $st = $db->prepare(
            "SELECT pedido_id, nombre, etiqueta, cantidad, subtotal
             FROM pedido_items WHERE pedido_id IN ($huecos) ORDER BY id");
        $st->execute($ids);
        foreach ($st->fetchAll() as $i) {
            $porPedido[(int) $i['pedido_id']][] = $i;
        }
    }

    foreach ($pedidos as &$p) {
        $p['numero'] = fb_numero_pedido((int) $p['id']);
        $p['items']  = $porPedido[(int) $p['id']] ?? [];
    }
    unset($p);

    /* Cuántos hay en cada estado, para los botones de filtro. Va
       sin los demás filtros aplicados: son el panorama completo. */
    $st = $db->query('SELECT estado, COUNT(*) AS n FROM pedidos GROUP BY estado');
    $cuentas = array_fill_keys(FB_ESTADOS, 0);
    foreach ($st->fetchAll() as $f) {
        $cuentas[$f['estado']] = (int) $f['n'];
    }
    $cuentas['pendientes'] = array_sum(array_map(
        static fn(string $e): int => $cuentas[$e], FB_PENDIENTES));
    $cuentas['todos'] = array_sum(array_map(
        static fn(string $e): int => $cuentas[$e], FB_ESTADOS));

    fb_json([
        'ok'         => true,
        'pedidos'    => $pedidos,
        'cuentas'    => $cuentas,
        /* Consulta propia y no fb_sucursales(): aquella le saca el
           id a cada sucursal, porque está armada para exportar
           productos.js, y acá el id es justamente lo que necesita
           el filtro. */
        'sucursales' => $db->query(
            'SELECT id, nombre FROM sucursales WHERE activa = 1 ORDER BY orden, id'
        )->fetchAll(),
        'tope'       => FB_MAX_LISTA,
        'cola'       => $cola,
        'admin'      => $admin['nombre'],
    ]);

} catch (Throwable $e) {
    $cfg = fb_config();
    fb_morir(500, 'No pude traer los pedidos.'
        . (!empty($cfg['depurar']) ? ' ' . $e->getMessage() : ''));
}
