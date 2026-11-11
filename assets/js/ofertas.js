/* ============================================================
   ofertas.js
   Tarjetas de ofertas de la portada. El banner grande cambia
   SOLO cada 5 segundos (fundido), sin que el usuario toque nada.
   Los puntitos de abajo a la derecha permiten adelantar, pero
   la rotación automática sigue igual.
   ============================================================ */
 
FB.ofertas = (function () {
 
  /* ----------------------------------------------------------
     DATOS DE LAS OFERTAS
     img: archivo dentro de assets/imagenes/ofertas/
     Mientras no estén las imágenes, se dibuja un fondo de
     respaldo con los colores del logo.
     ---------------------------------------------------------- */
  const lista = [
    {
      etiqueta:'Día de la Madre',
      titulo:'Picada especial para mamá',
      texto:'Jamón crudo, salames, quesos, aceitunas, frutos secos y grisines. Armada en el momento.',
      ahora:null, antes:null,          /* el banner no trae precio */
      img:'picada-dia-madre.webp',
      productoId:'p13'
    },
    {
      etiqueta:'35% de descuento',
      titulo:'Ledevit Chantilly',
      texto:'Crema para relleno y cobertura. Caja de 1 kg más manga de 500 g, lista para batir.',
      ahora:4990, antes:6800,
      img:'ledevit-chantilly.webp',
      productoId:'p16'
    },
    {
      etiqueta:'30% de descuento',
      titulo:'Mayonesa clásica Sabormax',
      texto:'Cremosa, pote de 500 g. Precio final hasta agotar stock.',
      ahora:1999, antes:2859,
      img:'mayonesa-sabormax.webp',
      productoId:'p18'
    }
  ];
 
  const SEGUNDOS = 5;          // cada cuánto cambia el banner
  let indice = 0;
  let reloj  = null;
 
  /* ---------- plantillas ----------
     Los banners del proveedor ya traen título, precio y descuento
     dibujados. En la portada no les encimamos texto: sólo los
     botones. El texto completo queda para las tarjetas chicas y
     para la página de ofertas. */
  function capaBanner(o) {
    return `
      <div class="banner-capa banner-capa-min">
        <div class="banner-acciones">
          <button class="btn btn-oro" data-agregar="${o.productoId}">Agregar al pedido</button>
          <a class="btn btn-linea-claro" href="${FB.ruta('ofertas/ofertas.html')}">Ver todas</a>
        </div>
      </div>`;
  }
 
  function capa(o, chica) {
    return `
      <div class="banner-capa">
        <span class="banner-etiqueta">${o.etiqueta}</span>
        <h3 class="banner-titulo">${o.titulo}</h3>
        ${chica ? '' : `<p class="banner-texto">${o.texto}</p>`}
        <div class="banner-precio">
          ${o.ahora
            ? `<span class="ahora">${FB.precio(o.ahora)}</span>
               ${o.antes ? `<span class="antes">${FB.precio(o.antes)}</span>` : ''}`
            : `<span class="ahora consultar">Consultar precio</span>`}
        </div>
        ${chica ? '' : `
          <div class="banner-acciones">
            <button class="btn btn-oro" data-agregar="${o.productoId}">Agregar al pedido</button>
            <a class="btn btn-linea-claro" href="${FB.ruta('ofertas/ofertas.html')}">Ver todas</a>
          </div>`}
      </div>`;
  }
 
  function imagen(o) {
    return `<img src="${FB.foto('ofertas', o.img, 'OFERTA', 'oscuro')}" alt="${o.titulo}"
                 onerror="FB.alFallarImagen(this,'OFERTA','oscuro')">`;
  }
 
  /* ---------- portada ---------- */
  function pintarPortada() {
    const cont = document.getElementById('ofertas-portada');
    if (!cont) return;
 
    const grandes   = lista.slice(0, 3);   // van en el banner rotativo
    const laterales = lista.slice(3, 5);   // van en las dos tarjetas del costado
 
    /* Hoy hay 3 ofertas y ninguna lateral: el banner ocupa todo el
       ancho. Cuando cargues una cuarta, aparecen solas al costado. */
    cont.classList.toggle('solo-banner', laterales.length === 0);
 
    cont.innerHTML = `
      <div class="banner-rotativo" id="banner-rotativo">
        ${grandes.map((o, i) => `
          <article class="banner-slide ${i === 0 ? 'activo' : ''}">
            ${imagen(o)}${capaBanner(o)}
          </article>`).join('')}
        <div class="banner-puntos" id="banner-puntos">
          ${grandes.map((o, i) => `
            <button class="${i === 0 ? 'activo' : ''}" data-ir="${i}"
                    aria-label="Ver oferta: ${o.titulo}"></button>`).join('')}
        </div>
      </div>
 
      <div class="ofertas-laterales">
        ${laterales.map((o) => `
          <a class="tarjeta-oferta" href="${FB.ruta('ofertas/ofertas.html')}">
            ${imagen(o)}${capa(o, true)}
          </a>`).join('')}
      </div>`;
 
    engancharBotones(cont);
 
    /* Los puntos adelantan; el conteo de 5 s se reinicia */
    cont.querySelectorAll('#banner-puntos button').forEach((p) => {
      p.addEventListener('click', () => {
        mostrar(Number(p.dataset.ir));
        arrancar();
      });
    });
 
    /* Se frena mientras el usuario está leyendo o navegando con
       el teclado dentro del banner, y cuando la pestaña no se ve */
    const banner = cont.querySelector('#banner-rotativo');
    banner.addEventListener('mouseenter', frenar);
    banner.addEventListener('mouseleave', arrancar);
    banner.addEventListener('focusin', frenar);
    banner.addEventListener('focusout', arrancar);
    document.addEventListener('visibilitychange', () => {
      document.hidden ? frenar() : arrancar();
    });
 
    arrancar();
  }
 
  function mostrar(i) {
    const slides = document.querySelectorAll('#banner-rotativo .banner-slide');
    const puntos = document.querySelectorAll('#banner-puntos button');
    if (!slides.length) return;
    indice = (i + slides.length) % slides.length;
    slides.forEach((s, n) => {
      const act = n === indice;
      s.classList.toggle('activo', act);
      s.setAttribute('aria-hidden', String(!act));
    });
    puntos.forEach((p, n) => {
      p.classList.toggle('activo', n === indice);
      p.setAttribute('aria-current', String(n === indice));
    });
  }
 
  function frenar() { clearInterval(reloj); reloj = null; }
 
  function arrancar() {
    frenar();
    reloj = setInterval(() => mostrar(indice + 1), SEGUNDOS * 1000);
  }
 
  /* ---------- página de ofertas ---------- */
  function pintarPagina() {
    const cont = document.getElementById('grilla-ofertas');
    if (!cont) return;
    cont.innerHTML = lista.map((o) => `
      <article class="tarjeta-oferta tarjeta-oferta-grande">
        ${imagen(o)}
        <div class="banner-capa">
          <span class="banner-etiqueta">${o.etiqueta}</span>
          <h3 class="banner-titulo">${o.titulo}</h3>
          <p class="banner-texto">${o.texto}</p>
          <!-- La picada no tiene precio cerrado: sin este corte
               salía "$ 0", que en una página de ofertas se lee como
               un error de la tienda. -->
          <div class="banner-precio">
            ${o.ahora
              ? `<span class="ahora">${FB.precio(o.ahora)}</span>
                 ${o.antes ? `<span class="antes">${FB.precio(o.antes)}</span>` : ''}`
              : `<span class="ahora consultar">Consultar precio</span>`}
          </div>
          <div class="banner-acciones">
            <button class="btn btn-oro" data-agregar="${o.productoId}">Agregar al pedido</button>
          </div>
        </div>
      </article>`).join('');
    engancharBotones(cont);
  }
 
  function engancharBotones(cont) {
    cont.querySelectorAll('[data-agregar]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        FB.carrito.agregar(b.dataset.agregar);
      });
    });
  }
 
  document.addEventListener('DOMContentLoaded', () => {
    pintarPortada();
    pintarPagina();
  });
 
  return { lista, pintarPortada, pintarPagina };
})();