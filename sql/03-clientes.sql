-- ============================================================
-- Fiambrería 4 Quesos — clientes, tokens y consentimientos
--
-- Segunda migración. Requiere que 01-esquema.sql ya esté corrido,
-- porque clientes referencia a sucursales.
--
--   mysql -u root -P 3307 < sql/03-clientes.sql
-- ============================================================

USE fiambreria_4quesos;

-- pedidos.cliente_id apunta a clientes, así que la tabla de
-- pedidos tiene que irse antes. Volver a correr este archivo
-- BORRA LOS PEDIDOS: hay que correr 05 de nuevo después.
DROP TABLE IF EXISTS pedido_items;
DROP TABLE IF EXISTS pedidos;

DROP TABLE IF EXISTS consentimientos;
DROP TABLE IF EXISTS tokens;
DROP TABLE IF EXISTS clientes;

-- ------------------------------------------------------------
-- Clientes
--
-- Nunca se guarda la contraseña: se guarda lo que devuelve
-- password_hash(), que no se puede revertir. Si alguien se lleva
-- la base, no se lleva las contraseñas.
-- ------------------------------------------------------------
CREATE TABLE clientes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(80)  NOT NULL,
  apellido   VARCHAR(80)  NULL,
  -- 190 y no 255: con utf8mb4 cada carácter ocupa hasta 4 bytes y
  -- un índice único no puede pasar de 767 bytes en InnoDB viejo.
  -- 190 × 4 = 760, entra justo y ningún correo real llega a tanto.
  correo     VARCHAR(190) NOT NULL,
  telefono   VARCHAR(40)  NULL,
  -- password_hash() con el algoritmo por omisión devuelve 60
  -- caracteres hoy, pero el día que PHP cambie a uno más largo el
  -- campo tiene que aguantarlo. Por eso 255 y no 60.
  clave_hash VARCHAR(255) NOT NULL,
  sucursal_preferida SMALLINT UNSIGNED NULL,
  verificado TINYINT(1)   NOT NULL DEFAULT 0,
  rol        ENUM('cliente','admin') NOT NULL DEFAULT 'cliente',
  activo     TINYINT(1)   NOT NULL DEFAULT 1,
  -- Freno a la prueba de contraseñas por fuerza bruta.
  intentos_fallidos SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  bloqueado_hasta   DATETIME NULL,
  ultimo_ingreso    DATETIME NULL,
  creado      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clientes_correo (correo),
  CONSTRAINT fk_cliente_sucursal FOREIGN KEY (sucursal_preferida)
    REFERENCES sucursales (id) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY idx_clientes_verificado (verificado, activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tokens de verificación y de recuperación
--
-- Se guarda el hash del token, no el token. Es el mismo criterio
-- que con las contraseñas: el enlace que recibe la persona por
-- correo permite entrar, así que quien lea la base no debe poder
-- reconstruirlo.
--
-- Un token vence y se usa una sola vez: 'usado' se completa al
-- consumirlo para que un enlace reenviado no sirva dos veces.
-- ------------------------------------------------------------
CREATE TABLE tokens (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT UNSIGNED NOT NULL,
  tipo       ENUM('verificacion','recuperacion') NOT NULL,
  token_hash CHAR(64)  NOT NULL COMMENT 'sha256 del token en hexadecimal',
  vence      DATETIME  NOT NULL,
  usado      DATETIME  NULL,
  creado     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_token (token_hash),
  KEY idx_tokens_cliente (cliente_id, tipo, usado),
  CONSTRAINT fk_token_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Consentimientos
--
-- No es una casilla en la ficha del cliente: es un registro de
-- cada vez que alguien aceptó o dejó de aceptar algo, con la fecha,
-- la versión del texto que leyó y desde qué dirección lo hizo.
--
-- La Ley 25.326 pide consentimiento libre, expreso e informado. Si
-- mañana alguien reclama que nunca aceptó recibir ofertas, lo que
-- responde es esta tabla. Una casilla booleana en 'clientes' solo
-- diría cómo está hoy, no qué aceptó ni cuándo.
--
-- Nunca se borra una fila: retirar el consentimiento agrega una
-- fila nueva con otorgado = 0. El estado vigente es la última.
-- ------------------------------------------------------------
CREATE TABLE consentimientos (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT UNSIGNED NOT NULL,
  tipo       ENUM('terminos','ofertas') NOT NULL,
  otorgado   TINYINT(1)  NOT NULL,
  version    VARCHAR(20) NOT NULL COMMENT 'Versión del texto que se le mostró',
  -- VARBINARY(16) guarda IPv4 e IPv6 con INET6_ATON(). La dirección
  -- es dato personal, y se guarda justamente porque es la prueba.
  ip         VARBINARY(16) NULL,
  agente     VARCHAR(255)  NULL,
  fecha      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_consent_cliente (cliente_id, tipo, fecha),
  CONSTRAINT fk_consent_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Estado vigente de cada consentimiento: la última fila de cada
-- cliente y tipo. Es lo que hay que consultar antes de mandar una
-- oferta, nunca la tabla directa.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_consentimiento_vigente AS
SELECT c.cliente_id, c.tipo, c.otorgado, c.version, c.fecha
FROM consentimientos c
JOIN (
  SELECT cliente_id, tipo, MAX(id) AS ultimo
  FROM consentimientos GROUP BY cliente_id, tipo
) u ON u.ultimo = c.id;

-- ------------------------------------------------------------
-- A quién se le puede escribir una oferta: verificado, activo y
-- con el consentimiento de ofertas vigente en sí.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_suscriptores_ofertas AS
SELECT cl.id, cl.nombre, cl.apellido, cl.correo
FROM clientes cl
JOIN v_consentimiento_vigente v
  ON v.cliente_id = cl.id AND v.tipo = 'ofertas' AND v.otorgado = 1
WHERE cl.activo = 1 AND cl.verificado = 1;
