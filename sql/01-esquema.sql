-- ============================================================
-- Fiambrería 4 Quesos — esquema del catálogo
--
-- Primera etapa de la base: catálogo, sucursales y datos del
-- comercio. Clientes y pedidos van en una migración posterior.
--
-- Para ejecutarlo en XAMPP:
--   mysql -u root < sql/01-esquema.sql
-- o pegarlo en phpMyAdmin con la pestaña SQL.
-- ============================================================

-- ------------------------------------------------------------
-- ESTE ARCHIVO EMPIEZA DE CERO: borra la base entera y la vuelve
-- a crear. Se lleva puesto todo, incluidos los clientes y los
-- pedidos que hubiera.
--
-- Después hay que correr, en este orden:
--   02-catalogo.sql   03-clientes.sql
--   04-recuperacion.sql   05-pedidos.sql
--
-- Antes borraba tabla por tabla, pero con las migraciones que se
-- fueron sumando dejó de alcanzar: clientes.sucursal_preferida
-- apunta a sucursales y pedidos apunta a las dos, así que el
-- borrado fallaba a mitad de camino y dejaba la base rota. Tirar
-- la base entera no tiene ese problema, y además dice con todas
-- las letras lo que hace.
-- ------------------------------------------------------------
DROP DATABASE IF EXISTS fiambreria_4quesos;

CREATE DATABASE fiambreria_4quesos
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fiambreria_4quesos;

-- ------------------------------------------------------------
-- Datos del comercio
--
-- Clave/valor en lugar de una fila con veinte columnas: el local
-- va a querer agregar un TikTok o un segundo teléfono y eso no
-- debería exigir un ALTER TABLE.
-- ------------------------------------------------------------
CREATE TABLE empresa (
  clave       VARCHAR(40)  NOT NULL PRIMARY KEY,
  valor       TEXT         NULL,
  descripcion VARCHAR(160) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Categorías y subcategorías
--
-- El id es el mismo texto que ya usa el sitio ('fiambres',
-- 'lacteos'): así los enlaces que hoy están publicados siguen
-- funcionando y no hay que traducir nada en el front.
-- ------------------------------------------------------------
CREATE TABLE categorias (
  id         VARCHAR(30)  NOT NULL PRIMARY KEY,
  nombre     VARCHAR(60)  NOT NULL,
  detalle    VARCHAR(120) NULL,
  img        VARCHAR(80)  NULL,
  orden      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  en_portada TINYINT(1)   NOT NULL DEFAULT 0,
  KEY idx_categorias_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subcategorias (
  categoria_id VARCHAR(30) NOT NULL,
  id           VARCHAR(30) NOT NULL,
  nombre       VARCHAR(60) NOT NULL,
  orden        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (categoria_id, id),
  CONSTRAINT fk_sub_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Productos
--
-- 'activo' en lugar de borrar: un producto que se deja de vender
-- sigue estando en pedidos viejos, y borrarlo dejaría esos pedidos
-- sin a qué apuntar. Las bajas archivan.
-- ------------------------------------------------------------
CREATE TABLE productos (
  id           VARCHAR(20)  NOT NULL PRIMARY KEY,
  nombre       VARCHAR(120) NOT NULL,
  marca        VARCHAR(60)  NULL,
  categoria_id VARCHAR(30)  NOT NULL,
  sub_id       VARCHAR(30)  NULL,
  tipo         ENUM('fiambre','unidad') NOT NULL,
  img          VARCHAR(120) NULL,
  destacado    TINYINT(1)   NOT NULL DEFAULT 0,
  etiqueta     VARCHAR(40)  NULL,
  -- Precio anterior, solo cuando el producto está en oferta.
  -- En pesos enteros: el local no cobra centavos y un entero no
  -- arrastra los errores de redondeo de un decimal flotante.
  antes        INT UNSIGNED NULL,
  semana       TINYINT(1)   NOT NULL DEFAULT 0,
  activo       TINYINT(1)   NOT NULL DEFAULT 1,
  orden        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  creado       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_producto_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias (id) ON UPDATE CASCADE,
  -- RESTRICT y no SET NULL: MySQL exige que todas las columnas de
  -- una clave foránea con SET NULL admitan NULL, y categoria_id no
  -- puede admitirlo (un producto sin categoría no existe). Con
  -- RESTRICT, borrar una subcategoría que todavía tiene productos
  -- falla en voz alta en lugar de dejarlos sueltos: primero hay que
  -- reasignarlos. Un producto con sub_id NULL no queda alcanzado,
  -- porque una clave foránea con un NULL se da por satisfecha.
  CONSTRAINT fk_producto_sub FOREIGN KEY (categoria_id, sub_id)
    REFERENCES subcategorias (categoria_id, id) ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY idx_productos_categoria (categoria_id, activo),
  KEY idx_productos_oferta (antes),
  KEY idx_productos_destacado (destacado),
  -- El buscador del sitio busca por nombre y por marca.
  FULLTEXT KEY ft_productos (nombre, marca)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Precios
--
-- Tabla aparte y no seis columnas en productos: un fiambre usa
-- g100/media/kg y un envasado usa u1/u2/u6, así que la mitad de
-- las columnas estaría siempre vacía. Además, el día que aparezca
-- una unidad nueva se agrega un valor al ENUM y nada más.
-- ------------------------------------------------------------
CREATE TABLE precios (
  producto_id VARCHAR(20) NOT NULL,
  unidad      ENUM('g100','media','kg','u1','u2','u6') NOT NULL,
  valor       INT UNSIGNED NOT NULL,
  PRIMARY KEY (producto_id, unidad),
  CONSTRAINT fk_precio_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Sucursales y horarios
--
-- Los horarios en filas, un turno por fila: así el sitio pregunta
-- "¿está abierto ahora?" con una consulta en vez de interpretar un
-- texto. Hoy eso se calcula en JavaScript sobre datos escritos a
-- mano en dos lugares; acá queda en uno solo.
-- ------------------------------------------------------------
CREATE TABLE sucursales (
  id        SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(80)  NOT NULL,
  direccion VARCHAR(160) NULL,
  tel       VARCHAR(40)  NULL,
  img       VARCHAR(120) NULL,
  horario   VARCHAR(255) NULL COMMENT 'Texto que se muestra en la página de sucursales',
  orden     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  activa    TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE horarios (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sucursal_id  SMALLINT UNSIGNED NOT NULL,
  dia          ENUM('lun','mar','mie','jue','vie','sab','dom') NOT NULL,
  desde        TIME NOT NULL,
  hasta        TIME NOT NULL,
  CONSTRAINT fk_horario_sucursal FOREIGN KEY (sucursal_id)
    REFERENCES sucursales (id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_turno (sucursal_id, dia, desde),
  KEY idx_horarios_dia (sucursal_id, dia),
  -- Un turno que termina antes de empezar es un error de carga,
  -- no un turno que cruza la medianoche: el local cierra de noche.
  CONSTRAINT chk_turno CHECK (hasta > desde)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Vista de conveniencia: el catálogo como lo consume el sitio,
-- con los precios ya puestos en columnas.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_catalogo AS
SELECT p.id, p.nombre, p.marca, p.categoria_id, p.sub_id, p.tipo, p.img,
       p.destacado, p.etiqueta, p.antes, p.semana, p.orden,
       c.nombre AS categoria_nombre,
       MAX(CASE WHEN pr.unidad = 'g100'  THEN pr.valor END) AS precio_g100,
       MAX(CASE WHEN pr.unidad = 'media' THEN pr.valor END) AS precio_media,
       MAX(CASE WHEN pr.unidad = 'kg'    THEN pr.valor END) AS precio_kg,
       MAX(CASE WHEN pr.unidad = 'u1'    THEN pr.valor END) AS precio_u1,
       MAX(CASE WHEN pr.unidad = 'u2'    THEN pr.valor END) AS precio_u2,
       MAX(CASE WHEN pr.unidad = 'u6'    THEN pr.valor END) AS precio_u6
FROM productos p
JOIN categorias c ON c.id = p.categoria_id
LEFT JOIN precios pr ON pr.producto_id = p.id
WHERE p.activo = 1
-- Se agrupa también por c.nombre: con ONLY_FULL_GROUP_BY activo
-- (predeterminado en MySQL 8) agrupar solo por p.id obliga al motor
-- a deducir que c.nombre depende funcionalmente de p.id a través del
-- JOIN. Lo deduce, pero no en todas las versiones; nombrarlo cuesta
-- nada y saca la duda.
GROUP BY p.id, c.nombre;
