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
