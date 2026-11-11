/* ============================================================
   productos.js
   Datos del catálogo + utilidades compartidas.
   Este archivo tiene que cargarse ANTES que los demás.
   ============================================================ */

/* Espacio de nombres único del sitio, para no ensuciar window */
const FB = {};

/* ============================================================
   DATOS DE LA EMPRESA  ←  TODO LO QUE SE CAMBIA A MANO VA ACÁ
   ------------------------------------------------------------
   Antes el teléfono estaba escrito en 8 lugares de 5 archivos.
   Ahora está una sola vez: cambiás acá y cambia en todo el sitio
   (header, footer, botón flotante, carrito, contacto, cómo pedir).

   whatsapp : solo números, con código de país y el 9 de celular.
              Argentina: 54 + 9 + característica sin el 0 +
              número sin el 15.  Ejemplo: 388 400-1122 -> 5493884001122
   telefono : como querés que se LEA en pantalla.
   Las direcciones y horarios de cada sucursal NO van acá:
   están en FB.sucursales, más abajo en este mismo archivo.
   ------------------------------------------------------------ */
FB.empresa = {
  nombre:   'Fiambrería 4 Quesos',
  whatsapp: '5493884380100',
  telefono: '388 438-0100',
  correo:   'hola@4quesos.com.ar',
  redes: {
    instagram: 'https://www.instagram.com/fiambreria4queso/',   /* pegá acá el link, ej: https://instagram.com/4quesos */
    facebook:  'https://www.facebook.com/profile.php?id=100063546760294&locale=es_LA'    /* vacío = el ícono no se muestra */
  },

  /* Cómo se ve el botón flotante, según qué archivo pusiste en
     assets/imagenes/logo/whatsapp.svg :
       'blanco'  -> círculo blanco. Para el logo VERDE de Meta.
       'verde'   -> círculo verde.  Para el logo BLANCO de Meta.
       'ninguno' -> sin círculo, la imagen ocupa todo. Para el
                    ícono completo, el que ya trae su propio fondo.
     Si el archivo no está, el botón se dibuja verde igual y
     funciona lo mismo. */
  whatsappBoton: 'verde'
};

/* ------------------------------------------------------------
   RAÍZ DEL SITIO
   Las páginas internas están en subcarpetas, así que cada HTML
   define window.RAIZ ('' en index.html, '../' en las demás).
   ------------------------------------------------------------ */
FB.raiz = (typeof window.RAIZ === 'string') ? window.RAIZ : '';
FB.ruta = (r) => FB.raiz + r;

/* ------------------------------------------------------------
   IMAGEN DE RESPALDO
   Mientras no haya fotos en assets/imagenes/, se dibuja este
   SVG. Cuando pongas las fotos reales se usan solas.
   ------------------------------------------------------------ */
FB.respaldo = function (texto = '4Q', variante = 'claro') {
  const oscuro = variante === 'oscuro';
  const fondo  = oscuro ? '#2A2130' : '#F1EAE1';
  const trazo  = oscuro ? '#E5A93C' : '#4A2E56';
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
       <rect width="400" height="400" fill="${fondo}"/>
       <circle cx="200" cy="200" r="54" fill="none" stroke="${trazo}" stroke-width="1.5" opacity=".3"/>
       <text x="200" y="210" font-family="Georgia,serif" font-size="26" fill="${trazo}"
             fill-opacity=".45" text-anchor="middle">${texto}</text>
     </svg>`);
};

/* Se le engancha a cada <img>: si la foto no existe, pone el respaldo.
   'oscuro' se usa donde encima va texto blanco (ofertas, logo). */
FB.alFallarImagen = function (img, texto, variante) {
  img.onerror = null;
  img.src = FB.respaldo(texto, variante);
};

/* ------------------------------------------------------------
   LAS FOTOS
   Regla única: si "img" tiene nombre de archivo, se pide la foto.
   Si dice null, se dibuja el respaldo y NO se le pide nada al
   servidor. Antes se pedían las 36 fotos aunque no existieran y
   cada una daba error 404: eso es lo que hacía lenta la carga.

   PARA AGREGAR UNA FOTO: subila a su carpeta y escribí su nombre
   en el campo img. No hay ninguna otra lista que tocar.
   ------------------------------------------------------------ */
FB.foto = function (carpeta, img, texto, variante) {
  return img
    ? FB.ruta('assets/imagenes/' + carpeta + '/' + img)
    : FB.respaldo(texto, variante);
};

/* ------------------------------------------------------------
   PRECIOS
   ------------------------------------------------------------ */
FB.precio = (n) =>
  '$ ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 });

/* Opciones de venta según el tipo de producto.
   - fiambre  -> por 100 g, por kilo y media barra
   - unidad   -> por unidad, llevando 2 y llevando 6  */
FB.opciones = function (p) {
  if (p.tipo === 'fiambre') {
    return [
      { id: 'g100',  etiqueta: '100 g',        unidad: 'los 100 g',  precio: p.precios.g100, cantidad: 1 },
      { id: 'media', etiqueta: 'Media barra',  unidad: 'media barra', precio: p.precios.media, cantidad: 1 },
      { id: 'kg',    etiqueta: '1 kg',         unidad: 'el kilo',     precio: p.precios.kg,    cantidad: 1 }
    ];
  }
  return [
    { id: 'u1', etiqueta: '1 unidad',   unidad: 'c/u',          precio: p.precios.u1, cantidad: 1 },
    { id: 'u2', etiqueta: 'Llevando 2', unidad: 'las 2 u.',     precio: p.precios.u2, cantidad: 2 },
    { id: 'u6', etiqueta: 'Llevando 6', unidad: 'las 6 u.',     precio: p.precios.u6, cantidad: 6 }
  ];
};

/* ------------------------------------------------------------
   ÍCONOS DE CATEGORÍA
   Dibujos de línea, no fotos: a 24 o 40 píxeles una foto de
   producto se vuelve una mancha, y el ícono se entiende igual
   de chico. Mismo trazo que los íconos del header (1.75) para
   que todo el sitio se vea de un solo set.

   PARA CAMBIAR UN ÍCONO
   1. Buscalo en lucide.dev o en tabler-icons.io (los dos son
      gratis, 24x24 y de línea, igual que estos). Apretá "Copy SVG".
   2. De lo que copiaste, pegá SÓLO lo que está entre <svg> y
      </svg> — los <path>, <circle>, etc. El resto lo pone svg().

        limpieza: svg(`<path d="acá lo que copiaste"/>`),

   3. Guardá y refrescá con Ctrl+F5. Listo.

   TRES COSAS QUE LO ROMPEN
   - Que el dibujo venga en otra medida. Si el <svg> original dice
     viewBox="0 0 48 48" y no "0 0 24 24", va a salir cortado o
     diminuto: en ese caso pegá el <svg> entero como está, sin
     usar svg(), y cambiale los colores por currentColor.
   - Que el ícono sea macizo en vez de de línea. Los de acá se
     dibujan con el borde (fill="none"), así que uno relleno sale
     invisible. Agregale a cada path: fill="currentColor"
     stroke="none".
   - Que traiga un color fijo, tipo stroke="#000000". Cambialo por
     currentColor, si no el ícono no se pone blanco cuando la
     categoría queda seleccionada en el menú.

   Si una categoría no tiene su dibujo acá, se usa el de 'general'
   y no se rompe nada.
   ------------------------------------------------------------ */
(function () {
  const t = 'fill="none" stroke="currentColor" stroke-width="1.75" ' +
            'stroke-linecap="round" stroke-linejoin="round"';
  const svg = (d) => `<svg viewBox="0 0 24 24" ${t}>${d}</svg>`;
  const punto = (x, y) => `<circle cx="${x}" cy="${y}" r=".95" fill="currentColor" stroke="none"/>`;

  FB.iconosCategoria = {
    /* Feta de salame: rodaja con su grano */
    fiambres: svg(`<circle cx="12" cy="12" r="8.4"/>
      ${punto(9.4, 9.8)}${punto(14.4, 10.9)}${punto(11.4, 14.8)}${punto(14.9, 14.6)}`),
    /* Cuña de queso con ojos */
    quesos: svg(`<path d="M3.6 15.8 14 6.6a7.6 7.6 0 0 1 6.4 7.5v1.7a.9.9 0 0 1-.9.9H4.5a.9.9 0 0 1-.9-.9Z"/>
      <circle cx="9.2" cy="14" r="1.05"/><circle cx="14.6" cy="12.9" r="1.05"/>`),
    /* Tabla de picada */
    picadas: svg(`<path d="M3.4 14.6h17.2a3.6 3.6 0 0 1-3.6 3.6H7a3.6 3.6 0 0 1-3.6-3.6Z"/>
      <circle cx="8.6" cy="11" r="2.1"/><circle cx="14.3" cy="11.5" r="1.7"/>`),
    /* Cartón de leche. Más ancho que la botella de Bebidas y con
       el pico a dos aguas, para que no se confundan de un vistazo. */
    lacteos: svg(`<path d="M6.4 9.6h11.2v10.1a1.3 1.3 0 0 1-1.3 1.3H7.7a1.3 1.3 0 0 1-1.3-1.3Z"/>
      <path d="m6.4 9.6 2.4-4.5h6.4l2.4 4.5"/><path d="M8.8 5.1h6.4"/>
      <path d="M9.6 13.8h4.4"/>`),
    /* Lata de conserva */
    almacen: svg(`<ellipse cx="12" cy="6.4" rx="5.8" ry="2.4"/>
      <path d="M6.2 6.4v11.2c0 1.33 2.6 2.4 5.8 2.4s5.8-1.07 5.8-2.4V6.4"/>
      <path d="M6.2 12.4c0 1.33 2.6 2.4 5.8 2.4s5.8-1.07 5.8-2.4"/>`),
    /* Pan: con la cúpula y los cortes al bies. Chato y sin cortes
       visibles se leía como una cápsula. */
    panificados: svg(`<path d="M4 13.6a8 8 0 0 1 16 0v4a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 17.6Z"/>
      <path d="m8.9 7.4-1.5 4M12.7 6.7l-1.6 4.3M16.3 8.4l-1.3 3.4"/>`),
    /* Botella */
    bebidas: svg(`<path d="M10 2.9h4v2.6l1.6 2.5a5 5 0 0 1 .8 2.7v8.2a2 2 0 0 1-2 2H9.6a2 2 0 0 1-2-2v-8.2a5 5 0 0 1 .8-2.7L10 5.5Z"/>
      <path d="M7.6 12.9h8.8"/>`),
    /* Copo de nieve */
    congelados: svg(`<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>
      <path d="m9.6 4.9 2.4 2.3 2.4-2.3M9.6 19.1l2.4-2.3 2.4 2.3"/>`),
    /* Cupcake: pirotina con pliegues, crema y cereza */
    reposteria: svg(`<path d="M7.3 13.4h9.4l-1 6.5a1.4 1.4 0 0 1-1.4 1.2H9.7a1.4 1.4 0 0 1-1.4-1.2Z"/>
      <path d="M10.4 13.4v7.7M13.6 13.4v7.7"/>
      <path d="M7.3 13.4a4.7 4.7 0 0 1 9.4 0"/><circle cx="12" cy="6.6" r="1.2"/>`),
    /* Caramelo envuelto */
    golosinas: svg(`<path d="M9 9.4h6a2.6 2.6 0 0 1 0 5.2H9a2.6 2.6 0 0 1 0-5.2Z"/>
      <path d="M6.4 12 3 8.8v6.4Z"/><path d="M17.6 12 21 8.8v6.4Z"/>`),
    /* Rociador */
    limpieza: svg(`<rect x="8.4" y="9.2" width="7.2" height="11.8" rx="2"/>
      <path d="M10.4 9.2V6.1h3.2"/><path d="m10.4 6.1-3-1.5"/>
      <path d="M5.3 3.4h.01M3.6 5.6h.01M4.6 8.2h.01"/>`),
    /* Cucurucho: la bocha sobresale a los dos lados, si queda
       del mismo ancho que el cono parece una pala. */
    helados: svg(`<path d="M8.4 12.4h7.2l-3 8.3a.63.63 0 0 1-1.2 0Z"/>
      <path d="M7.1 12.4a4.9 4.9 0 0 1 9.8 0"/><path d="M9.5 15.6h4.2"/>`),
    /* Taza con vapor */
    desayuno: svg(`<path d="M4.4 8.8h11.2v5.6a4.6 4.6 0 0 1-4.6 4.6H9a4.6 4.6 0 0 1-4.6-4.6Z"/>
      <path d="M15.6 10.4h1.5a2.6 2.6 0 0 1 0 5.2h-1.5"/>
      <path d="M3.2 21.6h13.6"/>
      <path d="M7.6 5.8V3.9M10 5.8V3.4M12.4 5.8V3.9"/>`),
    /* Aceituna con su carozo y la hoja */
    aceitunas: svg(`<ellipse cx="10.4" cy="14.6" rx="4.5" ry="5.7"/>
      <ellipse cx="10.4" cy="14.6" rx="1.3" ry="2.1"/>
      <path d="M13.3 9.8c1-2.6 3.5-4 6-4 0 2.7-1.8 5.2-4.5 5.6"/>`),
    /* El que se usa si una categoría nueva todavía no tiene dibujo */
    general: svg(`<path d="M5 8h14l-1.1 11.3a1.8 1.8 0 0 1-1.8 1.6H7.9a1.8 1.8 0 0 1-1.8-1.6Z"/>
      <path d="M8.8 8V6.4a3.2 3.2 0 0 1 6.4 0V8"/>`)
  };
})();

FB.icono = (id) => FB.iconosCategoria[id] || FB.iconosCategoria.general;

/* Foto si la categoría tiene una cargada, dibujo si no. Se pueden
   ir reemplazando de a una, no hace falta tener las 14.
   Si el archivo no existe o está mal escrito el nombre, vuelve el
   dibujo solo: nunca queda el cuadradito de imagen rota. */
FB.marcaCategoria = function (c) {
  if (!c) return '';
  if (!c.img) return FB.icono(c.id);
  return `<img src="${FB.ruta('assets/imagenes/productos/categorias/' + c.img)}" alt=""
               loading="lazy" onerror="this.outerHTML = FB.icono('${c.id}')">`;
};

/* ------------------------------------------------------------
   CATEGORÍAS
   Esta lista es la que se ve entera en el menú del header y en la
   página de categorías. La portada muestra sólo algunas: ver
   FB.catsPortada, más abajo.

   img: null  -> se dibuja el ícono de arriba.
   img: 'x.webp' -> se usa esa foto, que tiene que estar en
                    assets/imagenes/productos/categorias/
   La foto pide recorte cuadrado y un solo producto centrado; una
   foto ancha con varias cosas no se entiende a 28 píxeles.
   ------------------------------------------------------------ */
FB.categorias = [
  { id:'fiambres', nombre:'Fiambres', detalle:'Jamones, salames y mortadelas', img:'fiambres.webp',
    subs:[ {id:'jamones',nombre:'Jamones'}, {id:'embutidos',nombre:'Salames y embutidos'},
           {id:'ahumados',nombre:'Ahumados'} ] },
  { id:'quesos', nombre:'Quesos', detalle:'De máquina, de rallar y especiales', img:'quesos.webp',
    subs:[ {id:'de-maquina',nombre:'De máquina'}, {id:'duros',nombre:'Duros y de rallar'},
           {id:'para-cocinar',nombre:'Para cocinar'} ] },
  { id:'picadas', nombre:'Picadas', detalle:'Armadas para compartir', img:'picadas.webp',
    subs:[ {id:'armadas',nombre:'Picadas armadas'}, {id:'tablas',nombre:'Tablas'} ] },
  { id:'lacteos', nombre:'Lácteos', detalle:'Leche, cremas y manteca', img:'lacteos.webp',
    subs:[ {id:'leches',nombre:'Leches'}, {id:'cremas',nombre:'Cremas y mantecas'} ] },
  { id:'almacen', nombre:'Almacén', detalle:'Aceites, conservas y aderezos', img:'almacen.webp',
    subs:[ {id:'aderezos',nombre:'Aderezos'}, {id:'aceites',nombre:'Aceites'},
           {id:'conservas',nombre:'Conservas'} ] },
  { id:'panificados', nombre:'Panificados', detalle:'Pan, pebetes y tostadas', img:'panificados.webp',
    subs:[ {id:'pan',nombre:'Panes'}, {id:'sandwich',nombre:'Pebetes y sándwich'} ] },
  { id:'bebidas', nombre:'Bebidas', detalle:'Gaseosas, vinos y cervezas', img:'bebidas.webp',
    subs:[ {id:'vinos',nombre:'Vinos'}, {id:'cervezas',nombre:'Cervezas'},
           {id:'sin-alcohol',nombre:'Sin alcohol'} ] },
  { id:'congelados', nombre:'Congelados', detalle:'Rebozados, papas y empanadas', img:'congelados.webp',
    subs:[ {id:'para-freir',nombre:'Para freír'}, {id:'empanadas',nombre:'Empanadas'} ] },
  { id:'desayuno', nombre:'Desayuno', detalle:'Café, yerba, té y galletitas', img:'desayuno.webp',
    subs:[] },
  { id:'aceitunas', nombre:'Aceitunas', detalle:'Verdes, negras y encurtidos', img:'aceitunas.webp',
    subs:[] },
  { id:'helados', nombre:'Helados', detalle:'Potes, palitos y bombones', img:'helados.webp',
    subs:[] },
  { id:'reposteria', nombre:'Repostería', detalle:'Harinas, coberturas y decoración', img:'reposteria.webp',
    subs:[] },
  { id:'golosinas', nombre:'Golosinas', detalle:'Chocolates, caramelos y alfajores', img:'golosinas.webp',
    subs:[] },
  { id:'limpieza', nombre:'Limpieza', detalle:'Lavandina, detergentes y multiuso', img:'limpieza.webp',
    subs:[] }
];

/* Las que salen en la tira de la portada. El menú y la página de
   categorías muestran TODAS; acá va una selección corta, porque la
   portada es para entrar rápido a lo que más se busca. El orden de
   esta lista es el orden en que se ven. */
FB.catsPortada = ['fiambres','lacteos','bebidas','helados','golosinas','reposteria','limpieza','desayuno','aceitunas'];
FB.catsDePortada = () =>
  FB.catsPortada.map((id) => FB.categorias.find((c) => c.id === id)).filter(Boolean);

FB.nombreCategoria = (id) => {
  const c = FB.categorias.find((x) => x.id === id);
  return c ? c.nombre : id;
};

/* --- Subcategorías: el segundo paso del menú guiado --- */
FB.subcategorias = (catId) => {
  const c = FB.categorias.find((x) => x.id === catId);
  return c && c.subs ? c.subs : [];
};
FB.nombreSub = (catId, subId) => {
  const x = FB.subcategorias(catId).find((s) => s.id === subId);
  return x ? x.nombre : subId;
};
FB.porSub = (catId, subId) =>
  FB.productos.filter((p) => p.categoria === catId && p.sub === subId);
FB.contarSub = (catId, subId) => FB.porSub(catId, subId).length;

/* ------------------------------------------------------------
   PRODUCTOS
   tipo: 'fiambre' (100 g / media barra / kg) o 'unidad'
   img:  nombre del archivo dentro de assets/imagenes/productos/
   ------------------------------------------------------------ */
FB.productos = [
  { id:'p01', nombre:'Jamón cocido natural', marca:'Paladini', categoria:'fiambres', sub:'jamones', tipo:'fiambre',
    img:null, /* subí la foto y poné aquí: 'jamon-cocido.jpg' */ destacado:true, etiqueta:'Más vendido',
    precios:{ g100:1290, media:8900, kg:16900 } },

  { id:'p02', nombre:'Jamón crudo estacionado', marca:'Cagnoli', categoria:'fiambres', sub:'jamones', tipo:'fiambre',
    img:null, /* subí la foto y poné aquí: 'jamon-crudo.jpg' */ destacado:true,
    precios:{ g100:3450, media:24500, kg:47900 } },

  { id:'p03', nombre:'Salame tipo Milán', marca:'La Pampa', categoria:'fiambres', sub:'embutidos', tipo:'fiambre',
    img:null, /* subí la foto y poné aquí: 'salame-milan.jpg' */ destacado:true, etiqueta:'Oferta',
    precios:{ g100:1690, media:11200, kg:21500 } },

  { id:'p04', nombre:'Mortadela con pistachos', marca:'Vitali', categoria:'fiambres', sub:'embutidos', tipo:'fiambre',
    img:null, /* subí la foto y poné aquí: 'mortadela.jpg' */
    precios:{ g100:1150, media:7600, kg:14500 } },

  { id:'p05', nombre:'Bondiola ahumada', marca:'Paladini', categoria:'fiambres', sub:'ahumados', tipo:'fiambre',
    img:null, /* subí la foto y poné aquí: 'bondiola.jpg' */ destacado:true,
    precios:{ g100:2390, media:16400, kg:31500 } },

  { id:'p06', nombre:'Lomito ahumado', marca:'Cagnoli', categoria:'fiambres', sub:'ahumados', tipo:'fiambre',
    img:null, /* subí la foto y poné aquí: 'lomito.jpg' */
    precios:{ g100:2190, media:14900, kg:28900 } },

  { id:'p07', nombre:'Queso de máquina Danbo', marca:'La Serenísima', categoria:'quesos', sub:'de-maquina', tipo:'fiambre',
    img:null, /* subí la foto y poné aquí: 'danbo.jpg' */ destacado:true, etiqueta:'Oferta',
    precios:{ g100:1490, media:9900, kg:18900 } },

  { id:'p08', nombre:'Queso cremoso', marca:'Verónica', categoria:'quesos', sub:'de-maquina', tipo:'fiambre',
    img:null, /* subí la foto y poné aquí: 'cremoso.jpg' */
    precios:{ g100:1390, media:9200, kg:17600 } },

  { id:'p09', nombre:'Queso Pategrás', marca:'Ilolay', categoria:'quesos', sub:'duros', tipo:'fiambre',
    img:null, /* subí la foto y poné aquí: 'pategras.jpg' */
    precios:{ g100:1790, media:11900, kg:22900 } },

  { id:'p10', nombre:'Queso Sardo para rallar', marca:'Santa Rosa', categoria:'quesos', sub:'duros', tipo:'fiambre',
    img:null, /* subí la foto y poné aquí: 'sardo.jpg' */ destacado:true,
    precios:{ g100:2290, media:15600, kg:29900 } },

  { id:'p11', nombre:'Provoleta para parrilla', marca:'Tregar', categoria:'quesos', sub:'para-cocinar', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'provoleta.jpg' */ etiqueta:'Nuevo',
    precios:{ u1:3890, u2:7200, u6:20400 } },

  { id:'p12', nombre:'Picada clásica para 2', marca:'4 Quesos', categoria:'picadas', sub:'armadas', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'picada-2.jpg' */ destacado:true, etiqueta:'Más vendido',
    precios:{ u1:12900, u2:24500, u6:69900 } },

  { id:'p13', nombre:'Picada premium para 4', marca:'4 Quesos', categoria:'picadas', sub:'armadas', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'picada-4.jpg' */ destacado:true,
    precios:{ u1:24900, u2:47900, u6:136900 } },

  { id:'p14', nombre:'Tabla de quesos y frutos secos', marca:'4 Quesos', categoria:'picadas', sub:'tablas', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'tabla-quesos.jpg' */ etiqueta:'Nuevo',
    precios:{ u1:18900, u2:36500, u6:104900 } },

  { id:'p15', nombre:'Leche entera 1 L', marca:'La Serenísima', categoria:'lacteos', sub:'leches', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'leche.jpg' */
    precios:{ u1:1450, u2:2750, u6:7900 } },

  { id:'p16', nombre:'Crema Chantilly 1 kg + manga 500 g', marca:'Ledevit', categoria:'lacteos', sub:'cremas', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'ledevit-chantilly.jpg' */ etiqueta:'Oferta', destacado:true, antes:6800, semana:true,
    precios:{ u1:4990, u2:9500, u6:27900 } },

  { id:'p17', nombre:'Manteca 200 g', marca:'Ilolay', categoria:'lacteos', sub:'cremas', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'manteca.jpg' */
    precios:{ u1:2290, u2:4400, u6:12600 } },

  { id:'p18', nombre:'Mayonesa clásica cremosa 500 g', marca:'Sabormax', categoria:'almacen', sub:'aderezos', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'mayonesa-sabormax.jpg' */ etiqueta:'Oferta', destacado:true, antes:2859,
    precios:{ u1:1999, u2:3800, u6:10900 } },

  { id:'p19', nombre:'Aceite de oliva 500 ml', marca:'Nucete', categoria:'almacen', sub:'aceites', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'aceite-oliva.jpg' */
    precios:{ u1:6900, u2:13200, u6:37900 } },

  { id:'p20', nombre:'Aceitunas verdes 360 g', marca:'Nucete', categoria:'almacen', sub:'conservas', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'aceitunas.jpg' */
    precios:{ u1:2490, u2:4700, u6:13400 } },

  { id:'p21', nombre:'Pebetes x 6', marca:'Panadería del barrio', categoria:'panificados', sub:'sandwich', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'pebetes.jpg' */ destacado:true,
    precios:{ u1:2200, u2:4200, u6:11900 } },

  { id:'p22', nombre:'Pan de campo 500 g', marca:'Panadería del barrio', categoria:'panificados', sub:'pan', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'pan-campo.jpg' */
    precios:{ u1:2900, u2:5500, u6:15900 } },

  { id:'p23', nombre:'Vino Malbec 750 ml', marca:'Finca Jujuy', categoria:'bebidas', sub:'vinos', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'vino-malbec.jpg' */ destacado:true,
    precios:{ u1:7900, u2:15000, u6:42900 } },

  { id:'p24', nombre:'Gaseosa línea 2,25 L', marca:'Coca-Cola', categoria:'bebidas', sub:'sin-alcohol', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'gaseosa.jpg' */
    precios:{ u1:3290, u2:6300, u6:17900 } },

  { id:'p25', nombre:'Cerveza artesanal 500 ml', marca:'Volcán', categoria:'bebidas', sub:'cervezas', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'cerveza.jpg' */ etiqueta:'Nuevo',
    precios:{ u1:3490, u2:6600, u6:18900 } },

  { id:'p26', nombre:'Empanadas congeladas x 12', marca:'La Casera', categoria:'congelados', sub:'empanadas', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'empanadas.jpg' */ destacado:true,
    precios:{ u1:9900, u2:19000, u6:54900 } },

  { id:'p27', nombre:'Papas bastón 1 kg', marca:'McCain', categoria:'congelados', sub:'para-freir', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'papas.jpg' */
    precios:{ u1:4790, u2:9100, u6:25900 } },

  { id:'p28', nombre:'Milanesas de pollo x 6', marca:'Granja Norte', categoria:'congelados', sub:'para-freir', tipo:'unidad',
    img:null, /* subí la foto y poné aquí: 'milanesas.jpg' */
    precios:{ u1:8900, u2:17000, u6:48900 } }
];

/* Búsquedas y filtros */
/* Sin tildes y en minúscula de los dos lados: nadie escribe
   "jamón" con tilde en el celular, y hasta ahora esa búsqueda
   no devolvía nada. */
FB.plano = (t) => (t || '').toString().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

FB.buscar = function (texto) {
  const t = FB.plano(texto).trim();
  if (!t) return [];
  return FB.productos.filter((p) =>
    FB.plano(p.nombre).includes(t) ||
    FB.plano(p.marca).includes(t) ||
    FB.plano(FB.nombreCategoria(p.categoria)).includes(t)
  );
};

FB.porId = (id) => FB.productos.find((p) => p.id === id);
FB.porCategoria = (cat) =>
  cat === 'todas' ? FB.productos.slice() : FB.productos.filter((p) => p.categoria === cat);
FB.destacados = () => FB.productos.filter((p) => p.destacado);
/* En oferta = los que tienen precio anterior. Para sumar uno,
   agregale al producto  antes:<precio viejo>  y bajale el precio. */
FB.enOferta = () => FB.productos.filter((p) => p.antes);

/* La página de ofertas se divide en dos: las de la semana, que son
   las que querés destacar, y el resto ordenado por rubro.
   Para que una oferta pase a "de la semana", agregale  semana:true
   al producto; para sacarla, borrá esa palabra y cae sola en el
   grupo de su categoría. */
FB.ofertasSemana = () => FB.enOferta().filter((p) => p.semana);

/* Las que no son de la semana, agrupadas por categoría y en el
   mismo orden que FB.categorias, para que no baile entre visitas. */
FB.ofertasAgrupadas = function () {
  const resto = FB.enOferta().filter((p) => !p.semana);
  return FB.categorias
    .map((c) => ({ id: c.id, nombre: c.nombre,
                   productos: resto.filter((p) => p.categoria === c.id) }))
    .filter((g) => g.productos.length);
};

/* ------------------------------------------------------------
   ¿ABIERTO AHORA? Y HORARIO DE HOY

   El reloj de la compu del visitante puede estar en otro país, así
   que la hora se pide siempre en la zona de Jujuy. Si el navegador
   es muy viejo y no soporta zonas, se usa su reloj local: puede
   errarle por unas horas, pero nunca rompe la página.
   ------------------------------------------------------------ */
const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
const MAPA_DIAS   = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };

FB.ahoraJujuy = function () {
  try {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Jujuy',
      weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    const dato = (t) => (partes.find((x) => x.type === t) || {}).value;
    const indice = MAPA_DIAS[dato('weekday')];
    if (indice === undefined) throw new Error('dia desconocido');
    /* 'hour24' devuelve 24 a la medianoche en algunos navegadores. */
    const hora = parseInt(dato('hour'), 10) % 24;
    return { dia: DIAS_SEMANA[indice], minutos: hora * 60 + parseInt(dato('minute'), 10) };
  } catch (e) {
    const d = new Date();
    return { dia: DIAS_SEMANA[d.getDay()], minutos: d.getHours() * 60 + d.getMinutes() };
  }
};

const aMinutos = (t) => {
  const [h, m] = (t || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/* '08:30' -> '8:30' y '13:00' -> '13', como se dice acá. */
const horaCorta = (t) => (t || '').replace(/^0/, '').replace(/:00$/, '');

/* Devuelve, para una sucursal:
     texto   -> 'Hoy 8:30 a 13 y 17 a 21:30' (o 'Hoy cerrado')
     abierto -> true / false, o null si la sucursal no tiene
                'horarios' cargados: ahí no se inventa nada y se
                devuelve el texto de siempre.
     hasta   -> hora en que cierra el turno en curso, si está abierta.
     resumen -> la frase corta para la barra de arriba. */
FB.horarioHoy = function (s) {
  if (!s) return { texto: '', abierto: null, hasta: null, resumen: '' };
  const ahora  = FB.ahoraJujuy();
  const turnos = s.horarios && s.horarios[ahora.dia];
  if (!turnos) {
    const t = s.horario || '';
    return { texto: t, abierto: null, hasta: null, resumen: t };
  }
  if (!turnos.length) {
    return { texto: 'Hoy cerrado', abierto: false, hasta: null, resumen: 'Hoy cerrado' };
  }
  const enCurso = turnos.find(([desde, hasta]) =>
    ahora.minutos >= aMinutos(desde) && ahora.minutos < aMinutos(hasta));
  const texto = 'Hoy ' + turnos
    .map(([desde, hasta]) => `${horaCorta(desde)} a ${horaCorta(hasta)}`)
    .join(' y ');

  /* Si todavía falta para abrir, decir a qué hora: es lo que el
     cliente necesita saber antes de salir de la casa. */
  const proximo = turnos.find(([desde]) => ahora.minutos < aMinutos(desde));
  const resumen = enCurso ? `Abierto hasta ${horaCorta(enCurso[1])}`
                : proximo ? `Cerrado · abre ${horaCorta(proximo[0])}`
                          : 'Cerrado por hoy';

  return { texto, abierto: Boolean(enCurso), hasta: enCurso ? enCurso[1] : null, resumen };
};

/* ------------------------------------------------------------
   SUCURSALES (las usan sucursales.html, el footer y la barra de arriba)

   Dos campos para los horarios, y los dos hay que tocar si cambian:
     horario   -> el texto completo que se lee en sucursales.html
     horarios  -> los mismos datos pero en números, para que el sitio
                  calcule solo si está abierto y qué horario es hoy.
                  Cada día es una lista de turnos [desde, hasta] en
                  formato 24 h. Un día cerrado se escribe así: lun:[]
   ------------------------------------------------------------ */
FB.sucursales = [
  { nombre:'Fiambreria 4 Quesos - Monterrico',
    direccion:'Santa Fe 111 esquina Jujuy, Monterrico',
    tel:'388 438-0100',
    horario:'Lun a vier 8:30 a 13:00 y 17:00 a 21:30 · Sáb 8:30 a 13:00 y 16:30 a 20:30 · Dom 9:00 a 12:15',
    horarios:{
      lun:[['08:30','13:00'],['17:00','21:30']],
      mar:[['08:30','13:00'],['17:00','21:30']],
      mie:[['08:30','13:00'],['17:00','21:30']],
      jue:[['08:30','13:00'],['17:00','21:30']],
      vie:[['08:30','13:00'],['17:00','21:30']],
      sab:[['08:30','13:00'],['16:30','20:30']],
      dom:[['09:00','12:15']]
    },
    img:'01-sucursal-1-frente.webp' },

  { nombre:'Fiambreria 4 Quesos - Perico',
    direccion:'San José 1327, Perico',
    tel:'388 310-2497',
    horario:'Lun a Sáb 8:30 a 13:00 y 17:00 a 21:30 · Dom 9:00 a 12:00',
    horarios:{
      lun:[['08:30','13:00'],['17:00','21:30']],
      mar:[['08:30','13:00'],['17:00','21:30']],
      mie:[['08:30','13:00'],['17:00','21:30']],
      jue:[['08:30','13:00'],['17:00','21:30']],
      vie:[['08:30','13:00'],['17:00','21:30']],
      sab:[['08:30','13:00'],['17:00','21:30']],
      dom:[['09:00','12:00']]
    },
    img:'02-sucursal-2-frente.webp' }
];

/* En el pie ya se ve la marca arriba, así que repetir
   "Fiambreria 4 Quesos - " en cada sucursal es ruido: esto deja
   solo la parte que distingue (Monterrico, Perico). La página de
   sucursales sigue mostrando el nombre completo. */
FB.nombreCorto = function (nombre) {
  if (!nombre) return '';
  const limpio = nombre.replace(/^\s*fiambrer[íi]a?\s*4\s*quesos\s*[-–·|]?\s*/i, '').trim();
  return limpio || nombre;
};

/* Fotos de adentro del local (se muestran en sucursales.html) */
FB.fotosLocal = [
  { img:'04-sucursal-2-noche.webp',     texto:'El cartel de la entrada' },
  { img:'03-interior-almacen.webp', texto:'Góndola de almacén y conservas' },
  { img:'05-interior-estanterias.webp', texto:'Vinos, aceites y encurtidos' }
];

/* ------------------------------------------------------------
   SUCURSAL DE RETIRO
   El local no hace envíos: todos los pedidos se retiran. Por eso
   la sucursal elegida se guarda y viaja en el pedido.
   ------------------------------------------------------------ */
const CLAVE_SUCURSAL = 'fiambreria_sucursal';

FB.sucursalIndice = function () {
  const i = FB.leer(CLAVE_SUCURSAL, 0);
  return (typeof i === 'number' && FB.sucursales[i]) ? i : 0;
};

FB.sucursalActual = () => FB.sucursales[FB.sucursalIndice()];

FB.elegirSucursal = function (i) {
  if (!FB.sucursales[i]) return;
  FB.guardar(CLAVE_SUCURSAL, i);
  FB.refrescarSucursal();
};

/* Deja al día cualquier lugar que muestre la sucursal elegida:
   la barra superior, el carrito, etc. */
FB.refrescarSucursal = function () {
  const s = FB.sucursalActual();
  document.querySelectorAll('[data-sucursal-elegida]').forEach((el) => {
    el.textContent = FB.nombreCorto(s.nombre);
  });
  /* La barra de arriba decía un horario fijo. Ahora dice el de hoy
     de la sucursal elegida, calculado con la hora de Jujuy. */
  const hoy = FB.horarioHoy(s);
  document.querySelectorAll('[data-horario-hoy]').forEach((el) => {
    el.textContent = hoy.resumen;
    el.title = hoy.texto;
  });
  const sel = document.getElementById('select-sucursal');
  if (sel) sel.value = String(FB.sucursalIndice());
};

/* ------------------------------------------------------------
   Aviso flotante reutilizable
   ------------------------------------------------------------ */
FB.aviso = function (mensaje) {
  let caja = document.querySelector('.aviso');
  if (!caja) {
    caja = document.createElement('div');
    caja.className = 'aviso';
    document.body.appendChild(caja);
  }
  const tilde = (FB.ico && FB.ico.ok) ||
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6.5 9.5 17 4 11.5"/></svg>';
  caja.innerHTML = `${tilde}<span>${mensaje}</span>`;
  caja.setAttribute('role', 'status');
  caja.classList.add('visible');
  clearTimeout(FB._avisoTimer);
  FB._avisoTimer = setTimeout(() => caja.classList.remove('visible'), 2600);
};

/* ------------------------------------------------------------
   Guardado local tolerante a fallos
   ------------------------------------------------------------ */
FB.guardar = function (clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* modo privado */ }
};
FB.leer = function (clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v ? JSON.parse(v) : porDefecto;
  } catch (e) { return porDefecto; }
};