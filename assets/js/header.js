/* ============================================================
   header.js
   Dibuja el header (barra superior + logo, buscador, usuario,
   carrito + barra de secciones) y el footer en TODAS las
   páginas, para no repetir el mismo HTML siete veces.

   Cada página sólo necesita:
     <div id="sitio-header"></div>  ... contenido ...  <div id="sitio-footer"></div>
   y en el <body> un atributo data-pagina="inicio|categorias|..."
   para que se marque el link activo.
   ============================================================ */

(function () {

  /* Íconos SVG en línea, un solo set: mismo grosor de trazo (1.75),
     mismas terminaciones redondeadas, misma caja de 24. Las marcas
     (WhatsApp, Instagram, Facebook) van rellenas porque su glifo
     oficial es así. */
  const t = 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
  const ico = {
    lupa:`<svg viewBox="0 0 24 24" ${t}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>`,
    usuario:`<svg viewBox="0 0 24 24" ${t}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    carrito:`<svg viewBox="0 0 24 24" ${t}><circle cx="9" cy="20" r="1.4"/><circle cx="19" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.1a1.8 1.8 0 0 0 1.8 1.4h8.2a1.8 1.8 0 0 0 1.8-1.4L21.5 7H6"/></svg>`,
    menu:`<svg viewBox="0 0 24 24" ${t}><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
    pin:`<svg viewBox="0 0 24 24" ${t}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="2.6"/></svg>`,
    reloj:`<svg viewBox="0 0 24 24" ${t}><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 1.8"/></svg>`,
    tel:`<svg viewBox="0 0 24 24" ${t}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>`,
    mail:`<svg viewBox="0 0 24 24" ${t}><rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m3 7.5 9 5.5 9-5.5"/></svg>`,
    etiqueta:`<svg viewBox="0 0 24 24" ${t}><path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.3"/></svg>`,
    grilla:`<svg viewBox="0 0 24 24" ${t}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>`,
    caja:`<svg viewBox="0 0 24 24" ${t}><path d="M20.5 8.5V20h-17V8.5M2 3.5h20v5H2zM10 12.5h4"/></svg>`,
    ayuda:`<svg viewBox="0 0 24 24" ${t}><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6"/><path d="M12 16.8h.01"/></svg>`,
    chat:`<svg viewBox="0 0 24 24" ${t}><path d="M21 12a8 8 0 0 1-8 8H8l-5 2 1.4-4.2A8 8 0 1 1 21 12z"/></svg>`,
    ok:`<svg viewBox="0 0 24 24" ${t}><path d="M20 6.5 9.5 17 4 11.5"/></svg>`,
    escudo:`<svg viewBox="0 0 24 24" ${t}><path d="M12 2.5 20 6v6c0 5-3.4 8.6-8 9.5C7.4 20.6 4 17 4 12V6z"/><path d="m8.8 12 2.2 2.2 4.2-4.6"/></svg>`,
    tarjeta:`<svg viewBox="0 0 24 24" ${t}><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 14.5h3.5"/></svg>`,
    wsp:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.4.2-.6.1a8.6 8.6 0 0 1-4-4c-.1-.2-.1-.4.1-.6l1-.9c.2-.2.2-.5.1-.7-.1-.3-.8-1.8-1-2.1-.2-.4-.5-.4-.8-.4h-.7c-.3 0-.7.2-1 .5-.4.4-1.2 1.3-1.2 2.9 0 1.7 1.1 3.3 1.3 3.5.2.3 2.4 3.8 5.9 5.2 2.9 1.1 3.5.9 4.2.8.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.6.2-1.8 0-.2-.2-.3-.3-.4zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/></svg>`,
    face:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V5.5h-3c-2.3 0-4 1.8-4 4V12H7.5v3.5H10V22h3.5v-6.5H17l.5-3.5h-4v-2c0-.6.4-1 1-1z"/></svg>`,
    insta:`<svg viewBox="0 0 24 24" ${t}><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none"/></svg>`,
    cerrar:`<svg viewBox="0 0 24 24" ${t}><path d="M18 6 6 18M6 6l12 12"/></svg>`,
    mas:`<svg viewBox="0 0 24 24" ${t}><path d="M12 5.5v13M5.5 12h13"/></svg>`,
    /* Flechas del recorrido guiado */
    flecha:`<svg viewBox="0 0 24 24" ${t}><path d="m9 5 7 7-7 7"/></svg>`,
    volver:`<svg viewBox="0 0 24 24" ${t}><path d="m15 5-7 7 7 7"/></svg>`,
    abajo:`<svg viewBox="0 0 24 24" ${t}><path d="m5 9 7 7 7-7"/></svg>`
  };
  FB.ico = ico;

  /* Secciones de la barra inferior */
  const secciones = [
    { id:'categorias',  texto:'Categorías',  href:'categorias/categorias.html',  icono:ico.grilla, menu:true },
    { id:'ofertas',     texto:'Ofertas',     href:'ofertas/ofertas.html',        icono:ico.etiqueta },
    { id:'productos',   texto:'Productos',   href:'productos/productos.html',    icono:ico.caja },
    { id:'sucursales',  texto:'Sucursales',  href:'sucursales/sucursales.html',  icono:ico.pin },
    { id:'como-pedir',  texto:'Cómo pedir',  href:'como-pedir/como_pedir.html',  icono:ico.ayuda },
    { id:'contacto',    texto:'Contacto',    href:'contacto/contacto.html',      icono:ico.chat }
  ];

  const pagina = document.body.dataset.pagina || 'inicio';

  /* ==========================================================
     HEADER
     ========================================================== */
  function html_header() {
    return `
    <!-- Barra superior -->
    <div class="barra-superior">
      <div class="contenedor">
        <div class="barra-superior-izq">
          <span class="barra-dato">${ico.pin} Retirás en <strong data-sucursal-elegida>${FB.nombreCorto(FB.sucursales[0].nombre)}</strong></span>
          <span class="barra-dato">${ico.reloj} <strong data-horario-hoy>${FB.horarioHoy(FB.sucursales[0]).resumen}</strong></span>
          <span class="barra-dato">${ico.caja} Pedí online y <strong>retiralo por el local</strong></span>
        </div>
        <div class="barra-superior-der">
          <a href="${FB.ruta('como-pedir/como_pedir.html')}">¿Cómo pedir?</a>
          <a href="tel:+54${FB.empresa.telefono.replace(/\D/g, '')}">${FB.empresa.telefono}</a>
        </div>
      </div>
    </div>

    <!-- Header principal -->
    <div class="header-principal">
      <div class="contenedor header-grid">

        <a class="logo" href="${FB.ruta('index.html')}" aria-label="Fiambrería 4 Quesos, ir al inicio">
          <img src="${FB.ruta('assets/imagenes/logo/logo-dark.webp')}" alt="Fiambrería 4 Quesos"
               onerror="FB.alFallarImagen(this,'4Q','oscuro')">
        </a>

        <div class="buscador">
          <form id="form-buscar" role="search" autocomplete="off">
            <input type="search" id="campo-buscar" name="q"
                   placeholder="Buscar jamón, queso, picada…" aria-label="Buscar productos">
            <button type="submit" aria-label="Buscar">${ico.lupa}</button>
          </form>
          <div class="sugerencias" id="sugerencias"></div>
        </div>

        <div class="header-acciones">
          <button class="accion" id="btn-usuario" aria-label="Mi cuenta">
            ${ico.usuario}
            <span class="accion-texto">
              <span class="chico" id="usuario-chico">Ingresá o</span>
              <span class="grande" id="usuario-grande">Registrate</span>
            </span>
          </button>

          <button class="accion" id="btn-carrito" aria-label="Ver carrito">
            ${ico.carrito}
            <span class="contador-carrito" id="contador-carrito" style="display:none">0</span>
            <span class="accion-texto">
              <span class="chico">Mi</span>
              <span class="grande">Pedido</span>
            </span>
          </button>

          <button class="btn-menu" id="btn-menu" aria-label="Abrir menú de secciones">${ico.menu}</button>
        </div>
      </div>
    </div>

    <!-- Barra inferior de secciones -->
    <nav class="barra-secciones" id="barra-secciones" aria-label="Secciones del sitio">
      <div class="contenedor">
        <div class="barra-secciones-lista">
          ${secciones.map((s) => s.menu ? `
            <button type="button" id="btn-categorias"
                    class="abre-menu ${pagina === s.id ? 'activo' : ''}"
                    aria-expanded="false" aria-controls="megamenu" aria-haspopup="true">
              ${s.icono}${s.texto}<span class="chevron">${ico.abajo}</span>
            </button>` : `
            <a href="${FB.ruta(s.href)}" class="${pagina === s.id ? 'activo' : ''}"
               ${pagina === s.id ? 'aria-current="page"' : ''}>
              ${s.icono}${s.texto}
            </a>`).join('')}

          ${html_megamenu()}
        </div>
      </div>
    </nav>`;
  }


  /* ==========================================================
     MENÚ GUIADO DE CATEGORÍAS
     Tres columnas en escritorio (categoría → subcategoría →
     productos): se recorre pasando el mouse, sin tener que
     hacer clic. En celular no entran tres columnas, así que se
     muestra una por vez y se vuelve con la flecha de arriba;
     el nivel visible lo decide data-nivel.

     Cada categoría se muestra con un ícono dibujado y no con
     una foto: a este tamaño la foto no se distingue.
     ========================================================== */
  function html_megamenu() {
    const cats = FB.categorias.map((c) => `
      <li>
        <button type="button" class="mm-opcion" data-cat="${c.id}">
          <span class="mm-icono">${FB.marcaCategoria(c)}</span>
          <span class="mm-texto">
            <span class="mm-nombre">${c.nombre}</span>
            <span class="mm-detalle">${c.detalle}</span>
          </span>
          <span class="mm-flecha">${ico.flecha}</span>
        </button>
      </li>`).join('');

    return `
    <div class="megamenu" id="megamenu" data-nivel="1" hidden>
      <div class="megamenu-caja">
        <div class="mm-nivel mm-cats">
          <p class="mm-titulo">Categorías</p>
          <ul class="mm-lista">${cats}</ul>
        </div>

        <div class="mm-nivel mm-subs">
          <button type="button" class="mm-volver" data-ir="1">${ico.volver} Categorías</button>
          <p class="mm-titulo" id="mm-titulo-subs"></p>
          <ul class="mm-lista" id="mm-lista-subs"></ul>
          <a class="mm-ver-todo" id="mm-ver-cat" href="#">Ver toda la categoría ${ico.flecha}</a>
        </div>

        <div class="mm-nivel mm-prods">
          <button type="button" class="mm-volver" data-ir="2">${ico.volver} Volver</button>
          <p class="mm-titulo" id="mm-titulo-prods"></p>
          <ul class="mm-lista" id="mm-lista-prods"></ul>
          <a class="mm-ver-todo" id="mm-ver-sub" href="#">Ver todos ${ico.flecha}</a>
        </div>
      </div>
    </div>`;
  }

  function activarMegamenu() {
    const btn   = document.getElementById('btn-categorias');
    const panel = document.getElementById('megamenu');
    if (!btn || !panel) return;

    /* En celular el recorrido es por clic; en escritorio el mouse
       ya alcanza y pedir clic de más molesta. */
    const chico = () => window.matchMedia('(max-width:760px)').matches;
    let cat = null, relojCierre = null;
    const irA = (n) => { panel.dataset.nivel = String(n); };

    function marcar(lista, el) {
      panel.querySelectorAll(lista).forEach((x) => x.classList.remove('activo'));
      if (el) el.classList.add('activo');
    }

    function pintarSubs(idCat) {
      const c = FB.categorias.find((x) => x.id === idCat);
      if (!c) return;
      cat = idCat;
      document.getElementById('mm-titulo-subs').textContent = c.nombre;

      const ver = document.getElementById('mm-ver-cat');
      ver.href = FB.ruta('productos/productos.html') + '?cat=' + idCat;
      ver.innerHTML = `Ver todo en ${c.nombre} ${ico.flecha}`;

      /* Una categoría sin subcategorías cargadas: hay que vaciar
         el tercer nivel, si no queda colgado lo de la anterior. */
      if (!c.subs.length) {
        document.getElementById('mm-lista-subs').innerHTML =
          '<li class="mm-vacio">Todavía no cargamos productos en esta categoría.</li>';
        document.getElementById('mm-titulo-prods').textContent = c.nombre;
        document.getElementById('mm-lista-prods').innerHTML =
          '<li class="mm-vacio">Próximamente.</li>';
        document.getElementById('mm-ver-sub').href = ver.href;
        return;
      }

      document.getElementById('mm-lista-subs').innerHTML = c.subs.map((x) => `
        <li>
          <button type="button" class="mm-opcion" data-sub="${x.id}">
            <span class="mm-texto">
              <span class="mm-nombre">${x.nombre}</span>
              <span class="mm-detalle">${FB.contarSub(idCat, x.id)} producto${FB.contarSub(idCat, x.id) === 1 ? '' : 's'}</span>
            </span>
            <span class="mm-flecha">${ico.flecha}</span>
          </button>
        </li>`).join('');

      engancharSubs();
      pintarProductos(c.subs[0].id);
      marcar('[data-sub]', panel.querySelector('[data-sub]'));
    }

    function pintarProductos(idSub) {
      document.getElementById('mm-titulo-prods').textContent = FB.nombreSub(cat, idSub);
      const lista = FB.porSub(cat, idSub);
      document.getElementById('mm-lista-prods').innerHTML = lista.length
        ? lista.map((p) => {
            const op = FB.opciones(p)[0];
            return `<li>
              <a class="mm-producto" href="${FB.ruta('productos/productos.html')}?q=${encodeURIComponent(p.nombre)}">
                <img src="${FB.foto('productos', p.img, '4Q')}" alt="" loading="lazy"
                     onerror="FB.alFallarImagen(this,'4Q')">
                <span class="mm-texto">
                  <span class="mm-nombre">${p.nombre}</span>
                  <span class="mm-detalle">${p.marca}</span>
                </span>
                <span class="mm-precio">${FB.precio(op.precio)}</span>
              </a></li>`; }).join('')
        : '<li class="mm-vacio">Próximamente.</li>';

      document.getElementById('mm-ver-sub').href =
        FB.ruta('productos/productos.html') + '?cat=' + cat + '&sub=' + idSub;
      panel.querySelectorAll('.mm-producto').forEach((a) => a.addEventListener('click', cerrar));
    }

    function engancharCats() {
      panel.querySelectorAll('[data-cat]').forEach((b) => {
        const entrar = () => { if (!chico()) { pintarSubs(b.dataset.cat); marcar('[data-cat]', b); } };
        b.addEventListener('mouseenter', entrar);
        b.addEventListener('focus', entrar);
        b.addEventListener('click', () => { pintarSubs(b.dataset.cat); marcar('[data-cat]', b); irA(2); });
      });
    }
    function engancharSubs() {
      panel.querySelectorAll('[data-sub]').forEach((b) => {
        const entrar = () => { if (!chico()) { pintarProductos(b.dataset.sub); marcar('[data-sub]', b); } };
        b.addEventListener('mouseenter', entrar);
        b.addEventListener('focus', entrar);
        b.addEventListener('click', () => { pintarProductos(b.dataset.sub); marcar('[data-sub]', b); irA(3); });
      });
    }

    engancharCats();
    panel.querySelectorAll('.mm-volver').forEach((b) =>
      b.addEventListener('click', () => irA(Number(b.dataset.ir))));

    /* Arranca con la primera categoría pintada: en escritorio se
       ven las tres columnas desde que se abre, no dos vacías. */
    const primera = FB.categorias[0];
    if (primera) { pintarSubs(primera.id); marcar('[data-cat]', panel.querySelector('[data-cat]')); }

    function abrir() {
      clearTimeout(relojCierre);
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add('abierto'));
      btn.setAttribute('aria-expanded', 'true');
      irA(1);
    }
    function cerrar() {
      if (panel.hidden) return;
      panel.classList.remove('abierto');
      btn.setAttribute('aria-expanded', 'false');
      clearTimeout(relojCierre);
      relojCierre = setTimeout(() => { panel.hidden = true; }, 160);
    }

    btn.addEventListener('click', (e) => { e.stopPropagation(); panel.hidden ? abrir() : cerrar(); });
    document.addEventListener('click', (e) => {
      if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) cerrar();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) { cerrar(); btn.focus(); }
    });
    /* Al tocar en celular el foco puede no ir a ningún lado
       (relatedTarget null) y eso NO es motivo para cerrar. */
    panel.addEventListener('focusout', (e) => {
      if (!e.relatedTarget) return;
      if (!panel.contains(e.relatedTarget) && e.relatedTarget !== btn) cerrar();
    });
  }

  /* ==========================================================
     FOOTER (se apila solo en celular)
     ========================================================== */


  function html_footer() {
    const faq = FB.ruta('como-pedir/como_pedir.html');
    const legales = [
      ['Quiénes somos', 'quienes-somos/quienes-somos.html'],
      ['Políticas del sitio', 'politicas/politicas.html'],
      ['Términos y condiciones', 'terminos/terminos.html']
    ];

    return `
    <div class="contenedor footer-top">

      <div class="footer-marca">
        <div class="logo logo-chico">
          <img src="${FB.ruta('assets/imagenes/logo/logo-dark.webp')}" alt="${FB.empresa.nombre}"
               onerror="FB.alFallarImagen(this,'4Q','oscuro')">
        </div>
        <p>Fiambres, quesos y picadas cortados al momento, en Jujuy.</p>
        <!-- Una red sin link es un ícono que no lleva a ningún lado:
             solo se dibuja la que tenga dirección cargada. -->
        <div class="redes">
          <a href="https://wa.me/${FB.empresa.whatsapp}" aria-label="WhatsApp" target="_blank" rel="noopener">${ico.wsp}</a>
          ${FB.empresa.redes.instagram
            ? `<a href="${FB.empresa.redes.instagram}" aria-label="Instagram" target="_blank" rel="noopener">${ico.insta}</a>` : ''}
          ${FB.empresa.redes.facebook
            ? `<a href="${FB.empresa.redes.facebook}" aria-label="Facebook" target="_blank" rel="noopener">${ico.face}</a>` : ''}
        </div>
      </div>

      <!-- Dónde y cuándo: para un local que solo vende por retiro,
           es lo que más se busca en el pie. -->
      <div>
        <h4>Dónde retirar</h4>
        <div class="footer-sucursales">
        ${FB.sucursales.map((x) => `
          <div class="footer-dato">${ico.pin}<span><strong>${FB.nombreCorto(x.nombre)}</strong><br>${x.direccion}<br>
            ${x.tel ? `<a href="tel:+54${x.tel.replace(/\D/g, '')}">${x.tel}</a><br>` : ''}
            <span class="footer-horario">${FB.horarioHoy(x).texto}</span></span></div>`).join('')}
        </div>
      </div>

      <div>
        <h4>Contacto</h4>
        <!-- El número ya figura debajo de cada sucursal, así que acá
             va la acción, no el dato repetido. -->
        <div class="footer-dato">${ico.wsp}<span><a href="https://wa.me/${FB.empresa.whatsapp}" target="_blank" rel="noopener">Pedir por WhatsApp</a></span></div>
        <div class="footer-dato">${ico.mail}<span><a href="mailto:${FB.empresa.correo}">${FB.empresa.correo}</a></span></div>
        <div class="footer-dato">${ico.ayuda}<span><a href="${faq}#faq">Preguntas frecuentes</a></span></div>
      </div>
    </div>

    <!-- Los enlaces legales viven acá abajo, chicos: ocupaban una
         columna entera para algo que se consulta una vez al año. -->
    <div class="contenedor footer-abajo">
      <span>© ${new Date().getFullYear()} ${FB.empresa.nombre}</span>
      <nav class="footer-legales">
        ${legales.map(([t, u]) => `<a href="${FB.ruta(u)}">${t}</a>`).join('')}
        <a href="${FB.ruta('contacto/contacto.html')}">Contacto</a>
      </nav>
      <span>Sitio desarrollado por <a href="#">FabianC Innovations</a></span>
    </div>`;
  }

  /* ==========================================================
     ARRANQUE
     ========================================================== */
  document.addEventListener('DOMContentLoaded', () => {

    const contH = document.getElementById('sitio-header');
    const contF = document.getElementById('sitio-footer');
    if (contH) contH.innerHTML = html_header();
    if (contF) { contF.className = 'footer'; contF.innerHTML = html_footer(); }

    /* Los enlaces sueltos de WhatsApp que están escritos en el HTML
       se completan desde acá, así el número sigue viviendo en un
       solo lugar. En el HTML alcanza con  <a data-wsp>  */
    document.querySelectorAll('[data-wsp]').forEach((a) => {
      a.href = 'https://wa.me/' + FB.empresa.whatsapp;
      a.target = '_blank'; a.rel = 'noopener';
    });

    /* Botón flotante de WhatsApp */
    if (!document.querySelector('.wsp-flotante')) {
      const a = document.createElement('a');
      a.className = 'wsp-flotante estilo-' + (FB.empresa.whatsappBoton || 'blanco');
      a.href = 'https://wa.me/' + FB.empresa.whatsapp;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', 'Escribinos por WhatsApp');
      /* Si está el logo oficial de WhatsApp en
         assets/imagenes/logo/whatsapp.svg, lo usa; si no está,
         queda el ícono de globito y el botón funciona igual. */
      a.innerHTML = `<img src="${FB.ruta('assets/imagenes/logo/whatsapp.svg')}" alt=""
                          onload="this.closest('.wsp-flotante').classList.add('con-logo')"
                          onerror="this.outerHTML = FB.ico.wsp">`;
      document.body.appendChild(a);
    }

    /* --- menú de secciones en celular --- */
    const btnMenu = document.getElementById('btn-menu');
    const barra   = document.getElementById('barra-secciones');
    if (btnMenu && barra) {
      btnMenu.setAttribute('aria-expanded', 'false');
      btnMenu.setAttribute('aria-controls', 'barra-secciones');
      btnMenu.addEventListener('click', () => {
        const abierto = barra.classList.toggle('abierto');
        btnMenu.setAttribute('aria-expanded', String(abierto));
      });
    }

    /* --- usuario y carrito --- */
    const btnUsuario = document.getElementById('btn-usuario');
    if (btnUsuario) btnUsuario.addEventListener('click', () => FB.usuarios.abrirModal());

    const btnCarrito = document.getElementById('btn-carrito');
    if (btnCarrito) btnCarrito.addEventListener('click', () => FB.carrito.abrir());

    FB.carrito.actualizarContador();
    FB.usuarios.refrescarHeader();
    FB.refrescarSucursal();
    activarMegamenu();

    /* --- buscador con sugerencias --- */
    const form  = document.getElementById('form-buscar');
    const campo = document.getElementById('campo-buscar');
    const caja  = document.getElementById('sugerencias');

    if (campo && caja) {
      campo.addEventListener('input', () => {
        const t = campo.value.trim();
        if (t.length < 2) { caja.classList.remove('abierto'); return; }

        const r = FB.buscar(t).slice(0, 6);
        if (!r.length) {
          caja.innerHTML = `<div class="sugerencias-vacio">No encontramos “${t}”. Probá con otra palabra.</div>`;
        } else {
          caja.innerHTML = r.map((p) => {
            const op = FB.opciones(p)[0];
            return `
              <a class="sugerencia" href="${FB.ruta('productos/productos.html')}?q=${encodeURIComponent(p.nombre)}">
                <img src="${FB.foto('productos', p.img, '4Q')}" alt="${p.nombre}"
                     onerror="FB.alFallarImagen(this,'4Q')">
                <span>
                  <span class="sugerencia-nombre">${p.nombre}</span><br>
                  <span class="sugerencia-cat">${p.marca} · ${FB.nombreCategoria(p.categoria)}</span>
                </span>
                <span class="sugerencia-precio">${FB.precio(op.precio)}</span>
              </a>`;
          }).join('');
        }
        caja.classList.add('abierto');
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.buscador')) caja.classList.remove('abierto');
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const t = campo.value.trim();
        if (!t) return;
        window.location.href = FB.ruta('productos/productos.html') + '?q=' + encodeURIComponent(t);
      });
    }

    /* --- boletín del footer --- */
  });
})();