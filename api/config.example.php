<?php
/* Copiá este archivo como config.php y poné tus datos.
   config.php NO se sube al repositorio: está en .gitignore porque
   lleva la contraseña de la base y la clave del correo. Este ejemplo
   sí se sube, para que cualquiera sepa qué hay que completar. */

return [
    /* ------------------------------------------------------------
       Base de datos
       ------------------------------------------------------------ */

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
       pantalla y devuelve los enlaces de verificación y de
       contraseña nueva en la respuesta, para poder probar sin
       servidor de correo.

       EN EL HOSTING VA EN false. Con true, cualquiera que apriete
       "olvidé mi contraseña" con la dirección de otra persona
       recibe el enlace para entrar a esa cuenta. */
    'depurar' => true,

    /* Dirección desde la que se sirve el sitio. Se usa para armar
       los enlaces que van por correo, que tienen que ser absolutos.
       En el hosting: https://tudominio.com.ar */
    'url_base' => 'http://localhost/fiambreria',

    /* ------------------------------------------------------------
       Correo
       ------------------------------------------------------------ */

    /* 'archivo' guarda los mensajes en almacen/correos/ como .html
       que se abren con doble clic. Es el modo para desarrollar: no
       necesita internet y el enlace funciona igual.
       'smtp' los manda de verdad. */
    'correo_modo' => 'archivo',

    /* Quién figura como remitente. En Brevo esta dirección tiene que
       estar validada: o un dominio verificado (lo recomendable, pide
       cargar unos registros DNS) o una casilla confirmada por
       correo. Si no está validada, Brevo rechaza el envío. */
    'correo_desde'        => 'hola@4quesos.com.ar',
    'correo_desde_nombre' => 'Fiambrería 4 Quesos',
    /* A dónde contesta la gente si le da "responder". Dejalo vacío
       para que conteste a 'correo_desde'. */
    'correo_responder'    => '',

    /* ------------------------------------------------------------
       Relay SMTP   (solo hace falta con correo_modo => 'smtp')

       Estos datos son de Brevo, que tiene plan gratuito de 300
       correos por día y no pide tarjeta. Sirve cualquier otro relay
       que hable SMTP con STARTTLS.

       Cómo conseguirlos:
         1. Crear la cuenta en brevo.com
         2. Panel → SMTP & API → pestaña SMTP
         3. Copiar el "login" (es una dirección de correo) y generar
            una clave SMTP

       OJO: la clave SMTP no es la API key. Son dos cosas distintas
       y el relay solo acepta la clave SMTP. Y el usuario es el
       login, nunca 'smtp-relay.brevo.com': ponerle el nombre del
       servidor como usuario es el error que más veces termina en un
       "535 credenciales rechazadas".
       ------------------------------------------------------------ */
    'smtp_servidor' => 'smtp-relay.brevo.com',
    /* 587 arranca sin cifrar y sube a TLS con STARTTLS; 465 cifra
       desde el primer byte. Los dos sirven. */
    'smtp_puerto'   => 587,
    'smtp_usuario'  => '',
    'smtp_clave'    => '',

    /* Segundos de espera. Si el relay no contesta, el registro de un
       cliente no puede quedarse colgado: con 15 ya es bastante. */
    'smtp_espera'   => 15,

    /* Ruta a un archivo de autoridades certificantes, para poder
       verificar el certificado del relay. En XAMPP suele estar en
       C:\xampp\php\extras\ssl\cacert.pem
       Si lo dejás vacío, PHP usa el que tenga configurado; en
       Windows muchas veces no tiene ninguno y el envío falla con
       "certificate verify failed". */
    'smtp_ca'       => '',

    /* No lo pongas en false salvo para averiguar si el problema es
       el certificado: sin verificar, cualquiera que esté en la misma
       red puede hacerse pasar por el relay y quedarse con la clave
       SMTP. La solución de verdad es completar 'smtp_ca'. */
    'smtp_verificar' => true,
];
