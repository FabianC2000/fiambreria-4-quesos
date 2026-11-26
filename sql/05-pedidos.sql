-- ============================================================
-- Fiambrería 4 Quesos — pedidos
--
-- Cuarta migración. Requiere 01, 02, 03 y 04.
--
--   mysql -u root -P 3307 < sql/05-pedidos.sql
--
-- Crea las tablas desde cero, así que se puede correr de nuevo si
-- algo sale mal: borra los pedidos que hubiera. No la corras dos
-- veces cuando ya haya pedidos de verdad.
-- ============================================================

DROP TABLE IF EXISTS fiambreria_4quesos.pedido_items;
DROP TABLE IF EXISTS fiambreria_4quesos.pedidos;

-- ------------------------------------------------------------
-- Pedidos
--
-- El cliente puede ser NULL: si alguna vez se permite pedir sin
-- cuenta, o si una persona ejerce su derecho a que borren sus
-- datos, el pedido tiene que sobrevivir sin ella. Por eso también
-- se copian acá el nombre y el teléfono: un pedido sin a quién
-- entregárselo no sirve de nada.
--
-- (Si alguien pide la baja de sus datos, no alcanza con borrar la
-- fila de 'clientes': hay que vaciar también estos tres campos en
-- sus pedidos viejos. La base sola no lo hace.)
--
-- El número que ve la gente (4Q-00042) no se guarda: se arma con
-- el id al mostrarlo. Guardarlo sería tener dos fuentes para el
-- mismo dato y la posibilidad de que se contradigan.
-- ------------------------------------------------------------
CREATE TABLE fiambreria_4quesos.pedidos (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  cliente_id  INT UNSIGNED NULL,
  sucursal_id SMALLINT UNSIGNED NOT NULL,

  -- Copia del contacto en el momento del pedido. Si la persona
  -- después cambia su teléfono, el pedido viejo tiene que seguir
  -- mostrando al que se le avisó.
  nombre      VARCHAR(120) NOT NULL,
  telefono    VARCHAR(40)  NULL,
  correo      VARCHAR(190) NULL,

  estado      ENUM('nuevo','confirmado','listo','entregado','cancelado')
                NOT NULL DEFAULT 'nuevo',

  -- En pesos enteros, como el resto de los precios del sistema.
  -- Lo calcula el servidor sumando los items; nunca llega del
  -- navegador.
  total       INT UNSIGNED NOT NULL,

  nota        VARCHAR(500) NULL COMMENT 'Lo que el cliente quiera aclarar',

  -- Por dónde entró. Hoy todos son 'web', pero el día que el local
  -- cargue a mano un pedido que llegó por teléfono va a querer
  -- distinguirlos en el tablero.
  canal       ENUM('web','whatsapp','local') NOT NULL DEFAULT 'web',

  creado      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_pedido_cliente FOREIGN KEY (cliente_id)
    REFERENCES fiambreria_4quesos.clientes (id) ON DELETE SET NULL ON UPDATE CASCADE,
  -- RESTRICT: una sucursal con pedidos no se borra. Si cierra, se
  -- marca activa = 0 y los pedidos viejos siguen sabiendo de dónde
  -- se retiraban.
  CONSTRAINT fk_pedido_sucursal FOREIGN KEY (sucursal_id)
    REFERENCES fiambreria_4quesos.sucursales (id) ON DELETE RESTRICT ON UPDATE CASCADE,

  -- "Mis pedidos", del más nuevo al más viejo.
  KEY idx_pedidos_cliente (cliente_id, creado),
  -- La pantalla del local: lo que falta preparar, primero lo viejo.
  KEY idx_pedidos_estado (estado, creado),
  KEY idx_pedidos_sucursal (sucursal_id, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- Renglones del pedido
--
-- La decisión importante de todo este archivo: cada renglón
-- guarda una COPIA del nombre, la presentación y el precio.
--
-- Podría guardar solo producto_id y unidad, y salir a buscar el
-- precio cuando haga falta mostrarlo. Sería un error. Los precios
-- de la fiambrería cambian seguido; si el pedido mirara la tabla
-- de precios, un pedido de marzo mostraría los precios de agosto y
-- el total no coincidiría con lo que la persona pagó. Peor todavía
-- si el producto se da de baja: el renglón quedaría sin nombre.
--
-- Por eso producto_id es solo una referencia para estadísticas, y
-- admite NULL: si el producto desaparece, el renglón sigue
-- diciendo qué se vendió y a cuánto.
-- ------------------------------------------------------------
CREATE TABLE fiambreria_4quesos.pedido_items (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pedido_id   INT UNSIGNED NOT NULL,
  producto_id VARCHAR(20)  NULL,

  nombre      VARCHAR(120) NOT NULL COMMENT 'Copia: cómo se llamaba el producto ese día',
  unidad      ENUM('g100','media','kg','u1','u2','u6') NOT NULL,
  etiqueta    VARCHAR(40)  NOT NULL COMMENT 'Copia: "100 g", "Llevando 6"…',

  -- Precio de UNA de estas presentaciones, no del kilo ni de la
  -- unidad suelta. "Llevando 6" es un precio por las seis.
  precio      INT UNSIGNED NOT NULL,
  cantidad    SMALLINT UNSIGNED NOT NULL,
  subtotal    INT UNSIGNED NOT NULL COMMENT 'precio * cantidad, ya calculado',

  CONSTRAINT fk_item_pedido FOREIGN KEY (pedido_id)
    REFERENCES fiambreria_4quesos.pedidos (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_item_producto FOREIGN KEY (producto_id)
    REFERENCES fiambreria_4quesos.productos (id) ON DELETE SET NULL ON UPDATE CASCADE,

  -- Un pedido de cero unidades no es un pedido.
  CONSTRAINT chk_item_cantidad CHECK (cantidad > 0),

  KEY idx_items_pedido (pedido_id),
  -- Para el tablero: qué se vende más.
  KEY idx_items_producto (producto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- Vista para la pantalla del local: un pedido por fila, con el
-- número que ve la gente, cuántos renglones tiene y de dónde se
-- retira. Lo que haría falta leer de un vistazo.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW fiambreria_4quesos.v_pedidos AS
SELECT p.id,
       CONCAT('4Q-', LPAD(p.id, 5, '0')) AS numero,
       p.cliente_id,
       p.nombre,
       p.telefono,
       p.correo,
       p.estado,
       p.total,
       p.nota,
       p.canal,
       p.creado,
       s.nombre AS sucursal,
       COUNT(i.id)            AS renglones,
       COALESCE(SUM(i.cantidad), 0) AS unidades
FROM fiambreria_4quesos.pedidos p
JOIN fiambreria_4quesos.sucursales s ON s.id = p.sucursal_id
LEFT JOIN fiambreria_4quesos.pedido_items i ON i.pedido_id = p.id
-- Se nombran todas las columnas no agregadas, por lo mismo que en
-- v_catalogo: con ONLY_FULL_GROUP_BY activo, confiar en que el
-- motor deduzca la dependencia funcional no es portable.
GROUP BY p.id, p.cliente_id, p.nombre, p.telefono, p.correo,
         p.estado, p.total, p.nota, p.canal, p.creado, s.nombre;


-- ------------------------------------------------------------
-- Comprobación: tienen que aparecer las dos tablas y la vista.
-- ------------------------------------------------------------
SELECT TABLE_NAME, TABLE_TYPE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'fiambreria_4quesos'
  AND TABLE_NAME IN ('pedidos', 'pedido_items', 'v_pedidos')
ORDER BY TABLE_NAME;
