<?php
/* Copiá este archivo como config.php y poné tus datos.
   config.php NO se sube al repositorio: está en .gitignore porque
   lleva la contraseña de la base. Este ejemplo sí se sube, para que
   cualquiera sepa qué hay que completar. */

return [
    /* En XAMPP recién instalado el usuario es root y la contraseña
       está vacía. En el hosting te los da el panel cuando creás la
       base, y nunca son root. */
    /* 127.0.0.1 y no 'localhost': en Windows, localhost resuelve
       primero a ::1 (IPv6) y MariaDB de XAMPP escucha solo en IPv4,
       así que PDO recibe un "conexión rechazada" (error 2002) aunque
       el motor esté andando. Con la IP escrita así no hay ambigüedad.
       En Linux y en el hosting, 'localhost' funciona igual. */
    'host'   => '127.0.0.1',
    'base'   => 'fiambreria_4quesos',
    'u'      => 'root',
    'clave'  => '',
    /* 3306 es el puerto normal, pero si ya tenés otro MySQL
       instalado (MySQL Workbench, por ejemplo) ese se queda con el
       3306 y XAMPP arranca en 3307. El puerto real lo muestra el
       panel de XAMPP al lado de MySQL. */
    'puerto' => 3306,

    /* true mientras desarrollás: muestra el error de la base en
       pantalla. En el hosting va en false, o un error de SQL le
       cuenta a cualquiera cómo se llaman tus tablas. */
    'depurar' => true,
];
