# Fiambrería 4 Quesos

Sitio de catálogo y pedidos para **Fiambrería 4 Quesos**, un almacén y fiambrería
con dos sucursales en Jujuy, Argentina (Monterrico y Perico).

El local no hace reparto a domicilio: todos los pedidos se retiran por sucursal.
Eso ordena todo el sitio, que está armado alrededor de un solo recorrido —
**elegir → armar el pedido → retirar**— y termina en un mensaje de WhatsApp ya escrito.

## Cómo está hecho

HTML5, CSS3 y JavaScript, sin framework y sin paso de compilación. Se abre con
doble clic en `index.html` y funciona.

- Todo el código cuelga de un único objeto global, `FB`, definido en
  `assets/js/productos.js`, que tiene que cargar primero.
- Cada página declara su raíz en `window.RAIZ` y las rutas se arman desde ahí,
  así que el sitio funciona igual en la raíz de un dominio o dentro de una subcarpeta.
- El encabezado y el pie están escritos una sola vez, en `assets/js/header.js`,
  y se insertan en las diez páginas.
- Las tipografías (Fraunces e Inter, variables) están servidas desde el propio
  sitio en `.woff2`: no depende de Google Fonts.

## Dónde se cambian los datos del local

Todo lo que el negocio necesita editar vive en **`assets/js/productos.js`**, separado del código:

| Qué | Dónde |
|---|---|
| Nombre, WhatsApp, teléfono, correo y redes | `FB.empresa`, arriba de todo |
| Categorías del catálogo | `FB.categorias` |
| Categorías que se muestran en la portada | `FB.catsPortada` |
| Productos y precios | `FB.productos` |
| Sucursales, direcciones y horarios | `FB.sucursales` |

Los horarios van en dos campos por sucursal: `horario`, el texto que se lee en la
página, y `horarios`, los mismos datos en números. Con el segundo el sitio calcula
solo si el local está abierto, usando la hora de Jujuy y no el reloj del visitante.
**Si cambian los horarios hay que tocar los dos.**

## Panel de administración y tablero

En `/admin/` hay dos pantallas internas:

- **`admin/panel.html`** — importa el catálogo desde un Excel. Descargás la
  plantilla (viene con todos los productos actuales y una hoja con los valores
  que acepta cada columna), editás los precios, la subís y el panel te muestra
  qué cambia antes de aplicar nada: altas, modificaciones campo por campo, y qué
  productos dejarían de figurar. Si hay un error de carga no deja seguir.
  Al confirmar genera un `productos.js` actualizado para que reemplaces el que
  está en `assets/js/`.

- **`admin/tablero.html`** — indicadores. La mitad de arriba es la salud del
  catálogo (cuántos productos, cuáles sin foto, qué categorías están vacías) y
  se calcula sobre los datos del sitio. La mitad de abajo es la demanda
  (pedidos, búsquedas sin resultado, reparto por sucursal) y sale del registro
  de uso del navegador.

**Estas dos pantallas no se publican en internet y el flujo de GitHub Pages las
excluye a propósito.** No tienen autenticación y no pueden tenerla: en un sitio
estático cualquier contraseña viaja dentro del código. Se usan en local, con
XAMPP. El día que haya un backend con login de verdad, se saca la exclusión del
archivo `.github/workflows/publicar.yml`.

El registro de uso vive en el navegador de cada dispositivo, así que el tablero
muestra lo de esa máquina y no la suma de todos los clientes. El propio tablero
lo aclara en pantalla y permite exportar e importar el registro para consolidar
varios equipos a mano.

## Base de datos

El catálogo está migrado a MySQL. La base es la fuente de verdad; el archivo
`assets/js/productos.js` pasó a ser una exportación.

Para montarla en XAMPP:

```bash
mysql -u root < sql/01-esquema.sql
mysql -u root < sql/02-catalogo.sql
mysql -u root < sql/03-clientes.sql
mysql -u root < sql/04-recuperacion.sql
mysql -u root < sql/05-pedidos.sql
cp api/config.example.php api/config.php    # y completá usuario y clave
```

Si XAMPP arrancó MySQL en otro puerto —pasa cuando ya hay un MySQL Workbench
ocupando el 3306— hay que agregárselo a cada línea: `mysql -u root -P 3307 < …`,
y poner el mismo número en `'puerto'` dentro de `config.php`.

`01`, `02`, `03` y `05` borran y recrean sus tablas. `04` no, porque para cuando
se corre ya puede haber clientes registrados: usa `ALTER TABLE` y se puede
correr dos veces sin romper nada. Si ya hay pedidos de verdad, `05` tampoco se
corre de nuevo: los borra.

`01-esquema.sql` crea las tablas: `empresa`, `categorias`, `subcategorias`,
`productos`, `precios`, `sucursales` y `horarios`, más la vista `v_catalogo`
que devuelve cada producto con sus precios ya en columnas.
`02-catalogo.sql` carga los datos actuales: 14 categorías, 20 subcategorías,
28 productos, 84 precios, 2 sucursales y 26 turnos horarios.

Dos decisiones que conviene conocer antes de tocar el esquema:

- **Los precios van en una tabla aparte, no en columnas de `productos`.** Un
  fiambre se vende por 100 g, media barra y kilo; un envasado por unidad, 2 y 6.
  Con columnas fijas la mitad quedaría siempre vacía.
- **Los productos no se borran, se archivan** (`activo = 0`). Un producto
  borrado dejaría sin referencia a los pedidos viejos que lo incluyen.

### `api/`

- **`catalogo.php`** — devuelve todo el catálogo en JSON, con la misma forma que
  hoy tiene `FB` en productos.js. Es lo que va a consumir el sitio cuando esté
  en un hosting con PHP.
- **`exportar-js.php`** — regenera `assets/js/productos.js` desde la base. Es el
  puente mientras el sitio público siga siendo estático en GitHub Pages: cambiás
  precios en la base, corrés esto, subís el archivo. Escribe en el disco, así
  que solo responde desde `localhost`; deja un `.bak` antes de pisar nada.
- **`config.php`** no está en el repositorio porque lleva la contraseña de la
  base y la clave del correo. Copiá `config.example.php`.

## Cuentas de cliente

`03-clientes.sql` agrega `clientes`, `tokens` y `consentimientos`;
`04-recuperacion.sql` suma la columna que permite cerrar sesiones viejas.

Los endpoints son `registro.php`, `ingresar.php`, `verificar.php`, `salir.php`,
`yo.php`, `olvide.php`, `restablecer.php` y `reenviar.php`, y las pantallas
están en `cuenta/`.

Tres decisiones que conviene conocer:

- **El consentimiento es un registro fechado, no una casilla.** Cada vez que
  alguien acepta o deja de aceptar algo se agrega una fila con la fecha, la
  versión del texto que leyó, la IP y el navegador. Una casilla diría cómo está
  hoy; esto dice qué aceptó y cuándo, que es lo único que sirve si alguien
  reclama. Para mandar ofertas hay que consultar `v_suscriptores_ofertas`,
  nunca la tabla directa.
- **Pedir la contraseña nueva contesta siempre lo mismo**, exista o no la
  cuenta. Si dijera "ese correo no está registrado", cualquiera podría
  averiguar quién es cliente probando direcciones. En el registro sí se avisa
  que el correo ya está tomado: ahí la alternativa sería dejar a alguien sin
  poder registrarse sin entender por qué.
- **Cambiar la contraseña cierra las sesiones abiertas en otros dispositivos**,
  comparando `clientes.clave_cambiada` contra el momento en que empezó cada
  sesión. Sin eso, cambiarla no echaría a nadie, que es justo lo que uno quiere
  cuando sospecha que se la robaron.

### Pedidos

`05-pedidos.sql` agrega `pedidos` y `pedido_items`, más la vista `v_pedidos`
para la pantalla del local. El endpoint es `api/pedidos.php`: `POST` guarda,
`GET` lista los del cliente y `GET ?id=` trae el detalle.

El carrito sigue funcionando igual para quien no tiene cuenta —arma el mensaje
y abre WhatsApp— y no se obliga a nadie a registrarse para comprar. Con la
sesión abierta, el pedido se guarda primero, recibe un número (`4Q-00042`) y
ese número va adentro del mensaje de WhatsApp, así el local puede buscarlo.

Tres decisiones que conviene conocer:

- **Del navegador se acepta qué se pide, nunca cuánto sale.** El POST toma
  producto, presentación y cantidad; los precios los busca el servidor en la
  tabla `precios` y calcula el total él. Si el total llegara del navegador,
  cualquiera podría pedir dos kilos de crudo a cincuenta pesos cambiando un
  número en la consola del navegador.
- **Cada renglón guarda una copia del nombre, la presentación y el precio.**
  Los precios de la fiambrería cambian seguido; si el pedido mirara la tabla
  de precios, un pedido de marzo mostraría los precios de agosto y el total no
  coincidiría con lo que la persona pagó. Por eso `producto_id` admite `NULL`:
  si el producto se da de baja, el renglón sigue diciendo qué se vendió y a
  cuánto.
- **La confirmación no abre WhatsApp sola, ofrece un enlace para abrirlo.**
  Después de esperar la respuesta del servidor el navegador ya no considera
  que la ventana la pidió la persona, y el bloqueador de ventanas emergentes
  la frena. Con un enlace que se toca no hay nada que bloquear.

### La pantalla del local

`admin/pedidos.html` muestra lo que entra y permite cambiar el estado
(`nuevo` → `confirmado` → `listo` → `entregado`, o `cancelado`). Filtra por
estado y por sucursal, busca por número, nombre o teléfono, y se actualiza
sola cada 45 segundos mientras la pestaña esté a la vista.

Esta pantalla **sí pide sesión**, a diferencia de la del catálogo: muestra
nombres, teléfonos y compras de otras personas. Hace falta una cuenta con rol
de administración, y eso se da una sola vez desde la base:

```sql
UPDATE clientes SET rol = 'admin' WHERE correo = 'tucorreo@ejemplo.com';
```

A propósito no hay forma de hacerlo desde el sitio: si la hubiera, sería el
primer lugar donde buscaría cualquiera.

Dos detalles que no son adorno:

- **A quien no es administrador se le contesta 404, no 403.** Un 403 diría
  "existe pero no podés"; un 404 no confirma siquiera que la pantalla exista.
- **Los pendientes salen con los más viejos arriba.** Es una cola de trabajo:
  el pedido de hace dos horas es el que no hay que olvidarse. Las listas de
  entregados y cancelados, en cambio, son historial y van al revés.

Lo que todavía no guarda: quién cambió cada estado y cuándo pasó por cada uno.
Eso necesitaría una tabla de historial; por ahora queda la fecha del último
cambio en `pedidos.actualizado`.

### Correo

`api/correo.php` tiene dos modos, que se eligen con `correo_modo`:

- **`archivo`** (para desarrollar): guarda cada mensaje en `almacen/correos/`
  como un `.html` que se abre con doble clic. No necesita internet.
- **`smtp`**: manda de verdad. `api/smtp.php` es un cliente SMTP propio, de unas
  doscientas líneas, sin dependencias: habla STARTTLS, autentica, y arma el
  mensaje en dos versiones (texto y HTML) con los acentos codificados como
  manda el RFC 2047. Está probado contra un servidor SMTP de prueba, incluidos
  los casos que tienen que fallar: credenciales rechazadas, certificado que no
  se puede verificar, servidor que no contesta y servidor sin STARTTLS (ahí
  corta en vez de mandar la clave en claro).

Para Brevo hacen falta `smtp_usuario` y `smtp_clave` en `config.php`. La clave
es una **clave SMTP** generada en el panel, no la API key, y el usuario es el
login de la cuenta, nunca `smtp-relay.brevo.com`.

## Ejecutarlo localmente

No necesita servidor, pero con uno se evitan las restricciones de `file://`:

```bash
python -m http.server 8000
```

Y abrir `http://localhost:8000`.

## Estado

El sitio está terminado como interfaz. Falta contenido que depende del local:
las fotos de varios productos, algunos precios y los datos legales definitivos
de las páginas de términos y políticas, que además necesitan revisión de alguien
con formación legal antes de publicarse como válidas.

Pendientes del lado técnico:

- Avisarle al cliente por correo cuando su pedido queda listo para retirar.
  El sistema de correo ya está; falta decidir si suma o es ruido, porque de
  todos modos hay una conversación de WhatsApp abierta.
- Guardar quién cambió cada estado de un pedido y cuándo.
- Antes de abrir el formulario al público, Víctor Hugo Farfán, como responsable
  de la base, tiene que inscribirla en el Registro Nacional de Bases de Datos de
  la AAIP. El trámite es gratuito y se hace en línea; lo pide el artículo 21 de
  la Ley 25.326.
