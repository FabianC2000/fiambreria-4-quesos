-- ============================================================
-- Fiambrería 4 Quesos — recuperación de contraseña
--
-- Tercera migración. Requiere 03-clientes.sql.
--
--   mysql -u root -P 3307 < sql/04-recuperacion.sql
--
-- A diferencia de las anteriores, esta NO borra ni recrea nada:
-- agrega una columna a una tabla que ya puede tener clientes
-- registrados. Se puede correr dos veces sin romper nada.
--
-- La tabla 'tokens' de 03 ya contempla el tipo 'recuperacion', así
-- que no hay que tocarla.
-- ============================================================

USE fiambreria_4quesos;

-- ------------------------------------------------------------
-- clientes.clave_cambiada
--
-- Guarda cuándo se cambió la contraseña por última vez. Sirve para
-- cerrar las sesiones abiertas en otros dispositivos: al validar una
-- sesión se compara el momento en que empezó contra esta fecha, y si
-- es anterior, la sesión se descarta.
--
-- Sin esto, cambiar la contraseña no echa a nadie: quien hubiera
-- entrado con la contraseña vieja seguiría adentro, que es justo el
-- caso que uno quiere cortar cuando sospecha que se la robaron.
--
-- MySQL no acepta "ADD COLUMN IF NOT EXISTS" (MariaDB sí), así que
-- se consulta information_schema y se arma la sentencia según
-- corresponda. Así la migración sirve en XAMPP y en el hosting.
-- ------------------------------------------------------------
SET @existe = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'clientes'
    AND COLUMN_NAME  = 'clave_cambiada'
);

SET @sql = IF(@existe = 0,
  'ALTER TABLE clientes
     ADD COLUMN clave_cambiada DATETIME NULL
       COMMENT "Última vez que se cambió la contraseña; invalida sesiones anteriores"
       AFTER clave_hash',
  'SELECT "La columna clave_cambiada ya estaba" AS aviso');

PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;

-- ------------------------------------------------------------
-- Comprobación: tiene que listar clave_cambiada.
-- ------------------------------------------------------------
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'clientes'
  AND COLUMN_NAME = 'clave_cambiada';
