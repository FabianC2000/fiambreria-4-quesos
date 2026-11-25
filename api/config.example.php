<?php
/* Copiá este archivo como config.php y poné tus datos.
   config.php NO se sube al repositorio: está en .gitignore porque
   lleva la contraseña de la base. Este ejemplo sí se sube, para que
   cualquiera sepa qué hay que completar. */

return [
    /* En XAMPP recién instalado el usuario es root y la contraseña
       está vacía. En el hosting te los da el panel cuando creás la
       base, y nunca son root. */
    'host'   => 'localhost',
    'base'   => 'fiambreria_4quesos',
    'u'      => 'root',
    'clave'  => '',
    'puerto' => 3306,

    /* true mientras desarrollás: muestra el error de la base en
       pantalla. En el hosting va en false, o un error de SQL le
       cuenta a cualquiera cómo se llaman tus tablas. */
    'depurar' => true,
];
