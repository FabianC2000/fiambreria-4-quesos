-- ============================================================
-- Fiambrería 4 Quesos — recuperación de contraseña
--
-- Tercera migración. Requiere 03-clientes.sql.
--
--   mysql -u root -P 3307 < sql/04-recuperacion.sql
--
-- o pegándolo en la pestaña SQL de phpMyAdmin.
--
-- A diferencia de 01 y 02, esta NO borra ni recrea nada: cuando se
-- corre ya puede haber clientes registrados. Se puede correr dos
-- veces sin romper nada.
--
-- La tabla 'tokens' de 03 ya contempla el tipo 'recuperacion', así
-- que no hay que tocarla.
-- ============================================================

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
-- Dos detalles de esta línea, que no son adorno:
--
--   · El nombre de la tabla va con la base adelante
--     (fiambreria_4quesos.clientes) en vez de un USE arriba del
--     archivo. Así da igual qué base esté seleccionada cuando se
--     ejecuta: no hay forma de que termine apuntando a otra.
--
--   · IF NOT EXISTS hace que correr el archivo de nuevo no dé
--     error. Es de MariaDB, que es lo que trae XAMPP. Si algún día
--     el hosting resulta ser MySQL de verdad, que no lo acepta, hay
--     que sacarle esas tres palabras y correrlo una sola vez.
-- ------------------------------------------------------------
ALTER TABLE fiambreria_4quesos.clientes
  ADD COLUMN IF NOT EXISTS clave_cambiada DATETIME NULL
    COMMENT 'Última vez que se cambió la contraseña; invalida sesiones anteriores'
    AFTER clave_hash;

-- ------------------------------------------------------------
-- Comprobación: tiene que listar una fila, clave_cambiada.
-- Si no lista nada, la columna no se creó.
-- ------------------------------------------------------------
SHOW COLUMNS FROM fiambreria_4quesos.clientes LIKE 'clave_cambiada';
