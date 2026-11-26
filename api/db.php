<?php
declare(strict_types=1);

/* Conexión a MySQL y utilidades compartidas.
   Todo lo que toque la base pasa por acá. */

/* PHP sin zona horaria configurada usa la del servidor, que en XAMPP
   y en la mayoría de los hostings no es la de acá. Sin esta línea,
   la hora de los pedidos, las fechas de alta de clientes y el
   cálculo de "¿está abierto ahora?" quedarían corridos varias horas
   sin que nada avise. Se fija una sola vez, para todo el backend. */
date_default_timezone_set('America/Argentina/Jujuy');

function fb_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }
    $ruta = __DIR__ . '/config.php';
    if (!is_file($ruta)) {
        fb_morir(500, 'Falta api/config.php. Copiá api/config.example.php y completalo.');
    }
    $config = require $ruta;
    return $config;
}

function fb_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $c = fb_config();
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                   $c['host'], $c['puerto'] ?? 3306, $c['base']);
    try {
        $pdo = new PDO($dsn, $c['u'], $c['clave'], [
            /* Excepciones en vez de códigos de error silenciosos: un
               fallo de base tiene que cortar, no seguir con datos a medias. */
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            /* Consultas preparadas de verdad, no emuladas: es lo que
               deja afuera la inyección de SQL. */
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        /* El mensaje crudo de PDO incluye usuario y host. Solo se
           muestra con depurar activado, nunca en producción. */
        $detalle = !empty($c['depurar']) ? ' ' . $e->getMessage() : '';

        /* Los dos tropiezos habituales merecen una explicación en
           castellano en vez del código del motor a secas. */
        $pista = '';
        if (str_contains($e->getMessage(), '2002')) {
            $pista = ' Nadie está escuchando en ' . $c['host'] . ':' . ($c['puerto'] ?? 3306) . '.'
                   . ' Revisá que MySQL esté iniciado en el panel de XAMPP,'
                   . " y que 'host' sea 127.0.0.1 y no localhost (en Windows,"
                   . ' localhost resuelve a IPv6 y MariaDB escucha en IPv4).';
        } elseif (str_contains($e->getMessage(), '1045')) {
            $pista = ' El usuario o la contraseña de api/config.php no son los que espera la base.';
        } elseif (str_contains($e->getMessage(), '1049')) {
            $pista = " La base '" . $c['base'] . "' no existe todavía: corré sql/01-esquema.sql.";
        }
        fb_morir(500, 'No pude conectarme a la base de datos.' . $pista . $detalle);
    }
    return $pdo;
}

function fb_json($datos, int $codigo = 200): void
{
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fb_morir(int $codigo, string $mensaje): void
{
    fb_json(['ok' => false, 'error' => $mensaje], $codigo);
}

/* Varias pantallas internas no deben quedar expuestas mientras no
   haya login de verdad. Esto no es seguridad: es un cerrojo para no
   dejar abierto por descuido lo que todavía no tiene puerta. */
function fb_solo_local(): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if (!in_array($ip, ['127.0.0.1', '::1', 'localhost'], true)) {
        fb_morir(403, 'Esta herramienta solo se puede usar desde la misma computadora que sirve el sitio.');
    }
}

/* ------------------------------------------------------------
   Lectura del catálogo
   ------------------------------------------------------------ */

/* Devuelve los productos con la misma forma que usa el sitio hoy,
   para que el front no tenga que cambiar nada. */
function fb_productos(PDO $db): array
{
    $filas = $db->query('SELECT * FROM v_catalogo ORDER BY orden, id')->fetchAll();
    $salida = [];
    foreach ($filas as $f) {
        $p = [
            'id'        => $f['id'],
            'nombre'    => $f['nombre'],
            'categoria' => $f['categoria_id'],
            'tipo'      => $f['tipo'],
        ];
        if ($f['marca'] !== null && $f['marca'] !== '') $p['marca'] = $f['marca'];
        if ($f['sub_id'] !== null && $f['sub_id'] !== '') $p['sub'] = $f['sub_id'];
        $p['img'] = $f['img'];
        if ((int) $f['destacado'] === 1) $p['destacado'] = true;
        if ($f['etiqueta'] !== null && $f['etiqueta'] !== '') $p['etiqueta'] = $f['etiqueta'];
        if ($f['antes'] !== null) $p['antes'] = (int) $f['antes'];
        if ((int) $f['semana'] === 1) $p['semana'] = true;

        $unidades = $f['tipo'] === 'fiambre'
            ? ['g100' => 'precio_g100', 'media' => 'precio_media', 'kg' => 'precio_kg']
            : ['u1' => 'precio_u1', 'u2' => 'precio_u2', 'u6' => 'precio_u6'];
        $precios = [];
        foreach ($unidades as $clave => $columna) {
            if ($f[$columna] !== null) $precios[$clave] = (int) $f[$columna];
        }
        $p['precios'] = $precios;
        $salida[] = $p;
    }
    return $salida;
}

function fb_categorias(PDO $db): array
{
    $cats = $db->query('SELECT id, nombre, detalle, img FROM categorias ORDER BY orden, id')->fetchAll();
    $subs = $db->query('SELECT categoria_id, id, nombre FROM subcategorias ORDER BY categoria_id, orden, id')->fetchAll();
    $porCat = [];
    foreach ($subs as $s) {
        $porCat[$s['categoria_id']][] = ['id' => $s['id'], 'nombre' => $s['nombre']];
    }
    foreach ($cats as &$c) {
        $c['subs'] = $porCat[$c['id']] ?? [];
    }
    return $cats;
}

/* Cómo se llama cada presentación para una persona.

   Tiene que decir lo mismo que FB.opciones() en productos.js, que
   es lo que ve el cliente cuando elige. Si algún día se agrega una
   unidad al ENUM de 'precios', hay que tocar los dos lugares.

   Ojo con las de unidad: 'u6' no es el precio de una unidad sino el
   de las seis juntas. Por eso la etiqueta dice "Llevando 6" y no
   "6 unidades": en el pedido, cantidad 2 de 'u6' son doce. */
function fb_etiqueta_unidad(string $unidad): string
{
    return [
        'g100'  => '100 g',
        'media' => 'Media barra',
        'kg'    => '1 kg',
        'u1'    => '1 unidad',
        'u2'    => 'Llevando 2',
        'u6'    => 'Llevando 6',
    ][$unidad] ?? $unidad;
}

/* El número que ve la gente. Se arma con el id en vez de guardarlo
   en una columna: con dos fuentes para el mismo dato, tarde o
   temprano se contradicen. */
function fb_numero_pedido(int $id): string
{
    return '4Q-' . str_pad((string) $id, 5, '0', STR_PAD_LEFT);
}

function fb_sucursales(PDO $db): array
{
    $sucs = $db->query('SELECT id, nombre, direccion, tel, img, horario FROM sucursales WHERE activa = 1 ORDER BY orden, id')->fetchAll();
    $turnos = $db->query('SELECT sucursal_id, dia, TIME_FORMAT(desde, "%H:%i") d, TIME_FORMAT(hasta, "%H:%i") h
                          FROM horarios ORDER BY sucursal_id, FIELD(dia,"lun","mar","mie","jue","vie","sab","dom"), desde')->fetchAll();
    $porSuc = [];
    foreach ($turnos as $t) {
        $porSuc[$t['sucursal_id']][$t['dia']][] = [$t['d'], $t['h']];
    }
    foreach ($sucs as &$s) {
        $s['horarios'] = $porSuc[$s['id']] ?? [];
        unset($s['id']);
    }
    return $sucs;
}

function fb_empresa(PDO $db): array
{
    $filas = $db->query('SELECT clave, valor FROM empresa')->fetchAll();
    $e = [];
    foreach ($filas as $f) $e[$f['clave']] = $f['valor'];
    return [
        'nombre'        => $e['nombre']   ?? '',
        'whatsapp'      => $e['whatsapp'] ?? '',
        'telefono'      => $e['telefono'] ?? '',
        'correo'        => $e['correo']   ?? '',
        'redes'         => [
            'instagram' => $e['instagram'] ?? '',
            'facebook'  => $e['facebook']  ?? '',
        ],
        'whatsappBoton' => $e['whatsapp_boton'] ?? 'blanco',
    ];
}
