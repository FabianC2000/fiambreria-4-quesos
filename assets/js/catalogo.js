/* ============================================================
   catalogo.js
   - Tarjeta de producto (reutilizable)
   - Carrusel AUTOMÁTICO de la portada (sin flechas: se mueve
     solo en bucle; si el mouse se apoya encima, se pausa)
   - Grilla de productos con filtros por categoría y orden
   - Grilla de categorías
   - Tarjetas de sucursales y acordeón de "Cómo pedir"
   ============================================================ */

FB.catalogo = (function () {

  /* ==========================================================
     TARJETA DE PRODUCTO
     ========================================================== */
  function tarjeta(p) {
    const ops = FB.opciones(p);
    const op0 = ops[0];
    return `
      <article class="tarjeta-producto" data-id="${p.id}">
        <div class="producto-figura">
          ${p.etiqueta ? `<span class="insignia ${p.etiqueta === 'Nuevo' ? 'nuevo' : ''}">${p.etiqueta}</span>` : ''}
          <img src="${FB.foto('productos', p.img, '4Q')}" alt="${p.nombre}"
               loading="lazy" onerror="FB.alFallarImagen(this,'4Q')">
        </div>
        <div class="producto-cuerpo">
          <span class="producto-marca">${p.marca}</span>
          <h3 class="producto-nombre">${p.nombre}</h3>

          <select class="producto-selector" aria-label="Presentación de ${p.nombre}">
            ${ops.map((o) => `<option value="${o.id}" data-precio="${o.precio}" data-unidad="${o.unidad}">
              ${o.etiqueta} — ${FB.precio(o.precio)}
            </option>`).join('')}
          </select>

          <div class="producto-pie">
            <div class="producto-precio">
              <span class="linea-precio">
                <span class="valor">${FB.precio(op0.precio)}</span>
                ${p.antes ? `<span class="antes">${FB.precio(p.antes)}</span>` : ''}
              </span>
              <span class="unidad">${op0.unidad}</span>
            </div>
            <button class="btn-agregar" aria-label="Agregar ${p.nombre} al carrito">
              ${FB.ico.mas}
            </button>
          </div>
        </div>
      </article>`;
  }

  /* Enganchar el selector de presentación y el botón + */
  function activarTarjetas(contenedor) {
    contenedor.querySelectorAll('.tarjeta-producto').forEach((card) => {
      const sel    = card.querySelector('.producto-selector');
      const valor  = card.querySelector('.producto-precio .valor');
      const unidad = card.querySelector('.producto-precio .unidad');

      const antes = card.querySelector('.producto-precio .antes');

      if (sel) {
        sel.addEventListener('change', () => {
          const o = sel.selectedOptions[0];
          valor.textContent  = FB.precio(o.dataset.precio);
          unidad.textContent = o.dataset.unidad;
          /* El tachado es el de la presentación base: si el cliente
             elige otra, se esconde en vez de mentir. */
          if (antes) antes.hidden = sel.selectedIndex !== 0;
        });
      }

      const btn = card.querySelector('.btn-agregar');
      if (btn) {
        btn.addEventListener('click', () => {
          FB.carrito.agregar(card.dataset.id, sel ? sel.value : null);
        });
      }
    });
  }

  /* ==========================================================
     CARRUSEL AUTOMÁTICO (portada)
     La pista se duplica y se desplaza hasta -50%: al terminar
     vuelve al inicio y no se nota el corte.
     ========================================================== */
  /* La cinta se mueve duplicando las tarjetas y corriéndolas hasta
     la mitad. Para que eso se vea continuo, media cinta tiene que
     ser más ancha que la pantalla: con menos de 6 productos queda
     un hueco que entra y sale, así que esos van en grilla. */
  const MINIMO_CINTA = 6;

  function carrusel(idContenedor, productos, segundosPorTarjeta = 3.4) {
    const cont = document.getElementById(idContenedor);
    if (!cont) return;
    if (productos.length < MINIMO_CINTA) {
      grilla(idContenedor, productos);
      /* El contenedor de una cinta vive fuera de .contenedor para
         ocupar todo el ancho; si cae en grilla hay que devolverle
         el margen, si no las tarjetas quedan pegadas al borde. */
      cont.classList.add('grilla-suelta');
      return;
    }

    const tarjetas = productos.map(tarjeta).join('');
    cont.className = '';
    cont.innerHTML = `
      <div class="carrusel">
        <div class="carrusel-pista" style="--duracion:${(productos.length * segundosPorTarjeta).toFixed(1)}s">
          ${tarjetas}${tarjetas}
        </div>
      </div>`;
    activarTarjetas(cont);
    frenarFueraDePantalla(cont.querySelector('.carrusel-pista'));
  }

  /* Con varias cintas en la misma página no tiene sentido que sigan
     corriendo las que nadie está mirando: gastan batería y en una
     máquina lenta se nota. */
  function frenarFueraDePantalla(pista) {
    if (!pista || !('IntersectionObserver' in window)) return;
    const ojo = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => pista.classList.toggle('quieta', !e.isIntersecting));
    }, { rootMargin: '120px' });
    ojo.observe(pista);
  }

  /* ==========================================================
     CINTA CON FLECHAS (la maneja el usuario)
     A diferencia de la cinta de la portada, esta no se mueve sola:
     avanza de a un producto cuando tocás una flecha. Por debajo es
     un scroll horizontal común, así que en el celular se arrastra
     con el dedo y las flechas son el equivalente para el mouse.
     ========================================================== */
  function carruselManual(idContenedor, productos) {
    const cont = document.getElementById(idContenedor);
    if (!cont || !productos.length) return;

    cont.className = 'cinta-manual';
    cont.innerHTML = `
      <button type="button" class="cinta-flecha izq" aria-label="Ver anteriores">${FB.ico.volver}</button>
      <div class="cinta-manual-pista">${productos.map(tarjeta).join('')}</div>
      <button type="button" class="cinta-flecha der" aria-label="Ver siguientes">${FB.ico.flecha}</button>`;
    activarTarjetas(cont);

    const pista = cont.querySelector('.cinta-manual-pista');
    const izq   = cont.querySelector('.cinta-flecha.izq');
    const der   = cont.querySelector('.cinta-flecha.der');
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* El paso se mide, no se fija: la tarjeta cambia de ancho en
       celular y un número a mano quedaría desfasado. */
    function paso() {
      const t = pista.querySelector('.tarjeta-producto');
      if (!t) return 240;
      const hueco = parseFloat(getComputedStyle(pista).columnGap) || 0;
      return t.getBoundingClientRect().width + hueco;
    }
    function mover(sentido) {
      pista.scrollBy({ left: sentido * paso(),
                       behavior: quieto.matches ? 'auto' : 'smooth' });
    }
    izq.addEventListener('click', () => mover(-1));
    der.addEventListener('click', () => mover(1));

    /* Las flechas se apagan en las puntas, y si entran todos los
       productos de una no aparecen. */
    function revisar() {
      const tope = pista.scrollWidth - pista.clientWidth;
      izq.disabled = pista.scrollLeft <= 2;
      der.disabled = pista.scrollLeft >= tope - 2;
      cont.classList.toggle('sin-flechas', tope <= 2);
    }
    pista.addEventListener('scroll', revisar, { passive: true });
    window.addEventListener('resize', revisar);
    revisar();
  }

  /* ==========================================================
     OFERTAS AGRUPADAS POR CATEGORÍA (ofertas.html)
     Una cinta con flechas por rubro. Los rubros sin ofertas no se
     dibujan: una fila vacía con título se lee como un error.
     ========================================================== */
  function ofertasPorCategoria(idContenedor) {
    const cont = document.getElementById(idContenedor);
    if (!cont) return;
    const grupos = FB.ofertasAgrupadas();

    if (!grupos.length) {
      cont.innerHTML = `
        <div class="sin-resultados">
          <h3>Por ahora todas las ofertas son las de la semana</h3>
          <p>Cuando sumemos más, las vas a ver acá ordenadas por rubro.</p>
        </div>`;
      return;
    }

    cont.innerHTML = grupos.map((g) => `
      <div class="grupo-ofertas">
        <div class="grupo-cabecera">
          <h3>${g.nombre}</h3>
          <a class="grupo-link" href="${FB.ruta('productos/productos.html')}?cat=${g.id}">
            Ver la categoría ${FB.ico.flecha}
          </a>
        </div>
        <div id="cinta-of-${g.id}"></div>
      </div>`).join('');

    grupos.forEach((g) => carruselManual('cinta-of-' + g.id, g.productos));
  }

  /* ==========================================================
     GRILLA SIMPLE (sin filtros)
     ========================================================== */
  function grilla(idContenedor, productos) {
    const cont = document.getElementById(idContenedor);
    if (!cont) return;
    cont.className = 'grilla-productos';
    cont.innerHTML = productos.length
      ? productos.map(tarjeta).join('')
      : `<div class="sin-resultados">No hay productos para mostrar.</div>`;
    activarTarjetas(cont);
  }

  /* ==========================================================
     CATÁLOGO CON FILTROS (productos.html)
     Lee ?cat= y ?q= de la dirección para llegar filtrado desde
     el buscador del header o desde una categoría.
     ========================================================== */
  function catalogoFiltrable(idFiltros, idGrilla) {
    const cFiltros = document.getElementById(idFiltros);
    const cGrilla  = document.getElementById(idGrilla);
    if (!cGrilla) return;

    const url   = new URLSearchParams(location.search);
    let   cat   = url.get('cat') || 'todas';
    let   sub   = url.get('sub') || null;
    let   texto = url.get('q')   || '';
    let   orden = 'relevancia';

    if (cFiltros) {
      cFiltros.className = 'filtros-caja';
      cFiltros.innerHTML = `
        <div class="filtros" id="filtros-cat"></div>
        <div class="filtros filtros-subs" id="filtros-sub"></div>`;
      pintarChipsCat();
      pintarChipsSub();
    }

    function limpiarBuscador() {
      const campo = document.getElementById('campo-buscar');
      if (campo) campo.value = '';
    }

    /* Primer nivel: categorías */
    function pintarChipsCat() {
      const c = document.getElementById('filtros-cat');
      if (!c) return;
      c.innerHTML = `
        <button class="chip ${cat === 'todas' ? 'activo' : ''}" data-cat="todas">Todas</button>
        ${FB.categorias.map((x) =>
          `<button class="chip ${cat === x.id ? 'activo' : ''}" data-cat="${x.id}">${x.nombre}</button>`
        ).join('')}
        <div class="filtros-orden">
          <label for="orden">Ordenar:</label>
          <select id="orden">
            <option value="relevancia">Recomendados</option>
            <option value="menor">Menor precio</option>
            <option value="mayor">Mayor precio</option>
            <option value="az">A - Z</option>
          </select>
        </div>`;

      c.querySelectorAll('[data-cat]').forEach((ch) => {
        ch.addEventListener('click', () => {
          cat = ch.dataset.cat;
          sub = null;            /* cambiar de categoría resetea el segundo nivel */
          texto = '';
          limpiarBuscador();
          pintarChipsCat(); pintarChipsSub(); pintar();
        });
      });
      c.querySelector('#orden').value = orden;
      c.querySelector('#orden').addEventListener('change', (e) => { orden = e.target.value; pintar(); });
    }

    /* Segundo nivel: subcategorías de la categoría elegida */
    function pintarChipsSub() {
      const c = document.getElementById('filtros-sub');
      if (!c) return;
      const subs = cat === 'todas' ? [] : FB.subcategorias(cat);
      if (!subs.length) { c.innerHTML = ''; c.hidden = true; return; }
      c.hidden = false;
      c.innerHTML = `
        <span class="filtros-paso">${FB.nombreCategoria(cat)} ›</span>
        <button class="chip ${!sub ? 'activo' : ''}" data-sub="">Todo</button>
        ${subs.map((x) =>
          `<button class="chip ${sub === x.id ? 'activo' : ''}" data-sub="${x.id}">
             ${x.nombre} <span class="chip-cuenta">${FB.contarSub(cat, x.id)}</span>
           </button>`).join('')}`;

      c.querySelectorAll('[data-sub]').forEach((ch) => {
        ch.addEventListener('click', () => {
          sub = ch.dataset.sub || null;
          texto = '';
          limpiarBuscador();
          pintarChipsSub(); pintar();
        });
      });
    }

    function ordenar(lista) {
      const base = (p) => FB.opciones(p)[0].precio;
      if (orden === 'menor') lista.sort((a, b) => base(a) - base(b));
      if (orden === 'mayor') lista.sort((a, b) => base(b) - base(a));
      if (orden === 'az')    lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      return lista;
    }

    /* Vista por rubros: una cinta con flechas por categoría. Es la
       que se ve al entrar, sin filtrar nada. Apenas elegís una
       categoría o buscás algo se pasa a la grilla de siempre: ahí
       ya acotaste y querés ver todo junto, no de a cinco. */
    function pintarPorRubros() {
      const grupos = FB.categorias
        .map((c) => ({ id: c.id, nombre: c.nombre,
                       productos: ordenar(FB.porCategoria(c.id)) }))
        .filter((g) => g.productos.length);

      cGrilla.className = 'catalogo-rubros';
      cGrilla.innerHTML = grupos.map((g) => `
        <div class="grupo-ofertas">
          <div class="grupo-cabecera">
            <h3>${g.nombre}</h3>
            <button type="button" class="grupo-link" data-ir="${g.id}">
              Ver todo ${FB.ico.flecha}
            </button>
          </div>
          <div id="cinta-cat-${g.id}"></div>
        </div>`).join('');

      grupos.forEach((g) => carruselManual('cinta-cat-' + g.id, g.productos));

      /* "Ver todo" filtra en el lugar, sin recargar la página */
      cGrilla.querySelectorAll('[data-ir]').forEach((b) => {
        b.addEventListener('click', () => {
          cat = b.dataset.ir; sub = null; texto = '';
          limpiarBuscador();
          pintarChipsCat(); pintarChipsSub(); pintar();
          if (cFiltros) cFiltros.scrollIntoView({ block: 'start', behavior: 'smooth' });
        });
      });
    }

    function pintar() {
      const porRubros = !texto && !sub && cat === 'todas';

      let r;
      if (texto)    r = FB.buscar(texto);
      else if (sub) r = FB.porSub(cat, sub);
      else          r = FB.porCategoria(cat);
      ordenar(r);

      const titulo = document.getElementById('titulo-catalogo');
      if (titulo) {
        if (texto)                titulo.textContent = `Resultados para “${texto}” (${r.length})`;
        else if (sub)             titulo.textContent = `${FB.nombreCategoria(cat)} › ${FB.nombreSub(cat, sub)} (${r.length})`;
        else if (cat === 'todas') titulo.textContent = `Todos los productos (${r.length})`;
        else                      titulo.textContent = `${FB.nombreCategoria(cat)} (${r.length})`;
      }

      if (porRubros) { pintarPorRubros(); return; }

      cGrilla.className = 'grilla-productos';
      /* Vacío por búsqueda y vacío por categoría sin cargar no son
         lo mismo: decir "no encontramos" en una categoría nueva
         suena a error del sitio. */
      cGrilla.innerHTML = r.length
        ? r.map(tarjeta).join('')
        : (texto
            ? `<div class="sin-resultados">
                 <h3>No encontramos lo que buscabas</h3>
                 <p>Probá con otra palabra o mirá todas las categorías.</p>
               </div>`
            : `<div class="sin-resultados">
                 <h3>Todavía no cargamos esta categoría</h3>
                 <p>Pronto vas a encontrar acá los productos de ${FB.nombreCategoria(cat)}.
                    Mientras tanto, consultanos por WhatsApp.</p>
               </div>`);
      activarTarjetas(cGrilla);
    }

    /* Si vino una búsqueda, dejarla escrita en el buscador */
    if (texto) {
      const campo = document.getElementById('campo-buscar');
      if (campo) campo.value = texto;
    }

    pintar();
  }

  /* ==========================================================
     CATEGORÍAS
     ========================================================== */
  function categorias(idContenedor, cuantas) {
    const cont = document.getElementById(idContenedor);
    if (!cont) return;
    const datos = cuantas ? FB.categorias.slice(0, cuantas) : FB.categorias;
    cont.className = 'grilla-categorias';
    cont.innerHTML = datos.map((c) => {
      const n = FB.porCategoria(c.id).length;
      return `
        <a class="tarjeta-categoria" href="${FB.ruta('productos/productos.html')}?cat=${c.id}">
          <div class="cat-figura">${FB.marcaCategoria(c)}</div>
          <div class="cat-pie">
            <h3>${c.nombre}</h3>
            <span>${n ? n + ' producto' + (n === 1 ? '' : 's') : 'Próximamente'} · ${c.detalle}</span>
          </div>
        </a>`;
    }).join('');
  }

  /* ==========================================================
     SUCURSALES
     ========================================================== */
  function sucursales(idContenedor) {
    const cont = document.getElementById(idContenedor);
    if (!cont) return;
    const i = FB.ico;
    cont.className = 'grilla-sucursales';

    function pintarSucursales() {
      const elegida = FB.sucursalIndice();
      cont.innerHTML = FB.sucursales.map((s, n) => {
        /* Sin dirección no hay a dónde mandar el mapa: antes que un
           botón que lleva al lugar equivocado, no va ningún botón. */
        const tieneDireccion = s.direccion && !/confirmar/i.test(s.direccion);
        const mapa = 'https://www.google.com/maps/search/?api=1&query=' +
                     encodeURIComponent(s.direccion + ', Jujuy, Argentina');
        /* Abierto o cerrado se calcula con la hora de Jujuy, no se
           escribe a mano: un cartel "Abierto" un domingo a la noche
           hace que el cliente viaje al vicio. */
        const hoy = FB.horarioHoy(s);

        return `
        <article class="tarjeta-sucursal ${n === elegida ? 'elegida' : ''}">
          <div class="foto">
            <img src="${FB.foto('sucursales', s.img, '4Q')}" alt="${s.nombre}"
                 loading="lazy" onerror="FB.alFallarImagen(this,'4Q')">
            <!-- El estado va sobre la foto: así el cuerpo empieza
                 directo en el nombre y las dos tarjetas arrancan a la
                 misma altura. -->
            <span class="estado ${hoy.abierto ? 'abierto' : 'cerrado'}">
              ${hoy.abierto ? 'Abierto ahora' : 'Cerrado ahora'}
            </span>
            ${n === elegida ? `<span class="chapa-elegida">${i.ok} Retirás acá</span>` : ''}
          </div>

          <div class="cuerpo">
            <h3>${s.nombre}</h3>
            <div class="datos-sucursal">
              <div class="dato-sucursal">${i.pin}<span>${s.direccion}</span></div>
              <div class="dato-sucursal">${i.reloj}<span>${s.horario}</span></div>
              <div class="dato-sucursal">${i.tel}<span><a href="tel:+54${s.tel.replace(/[^0-9]/g, '')}">${s.tel}</a></span></div>
            </div>

            <!-- Las acciones quedan al pie: con las dos tarjetas
                 alineadas abajo, la fila se lee de una. -->
            <div class="acciones-sucursal">
              ${n === elegida
                ? `<span class="marca-elegida">${i.ok} Es tu sucursal de retiro</span>`
                : `<button class="btn btn-ciruela" data-elegir="${n}">Retirar acá</button>`}
              ${tieneDireccion
                ? `<a class="btn btn-linea" href="${mapa}" target="_blank" rel="noopener">
                     ${i.pin} Cómo llegar
                   </a>`
                : ''}
            </div>
          </div>
        </article>`;
      }).join('');

      cont.querySelectorAll('[data-elegir]').forEach((b) => {
        b.addEventListener('click', () => {
          FB.elegirSucursal(Number(b.dataset.elegir));
          FB.aviso(`Vas a retirar en ${FB.sucursalActual().nombre}`);
          pintarSucursales();
        });
      });
    }

    pintarSucursales();
  }

  /* ==========================================================
     ACORDEÓN (preguntas de "Cómo pedir")
     ========================================================== */
  function acordeon(selector) {
    /* Si el link del footer apunta a una pregunta, esa arranca
       abierta y la página baja hasta ella: si no, el usuario cae
       en una lista cerrada y tiene que buscarla de nuevo. */
    const pedida = decodeURIComponent(location.hash.slice(1));

    document.querySelectorAll(selector + ' .acordeon-item').forEach((item) => {
      if (pedida && item.id === pedida) {
        item.classList.add('abierto');
        requestAnimationFrame(() => item.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      }
      const boton = item.querySelector('.acordeon-boton');
      boton.setAttribute('aria-expanded', String(item.classList.contains('abierto')));
      boton.addEventListener('click', () => {
        const abierto = item.classList.toggle('abierto');
        boton.setAttribute('aria-expanded', String(abierto));
      });
    });
  }

  /* ==========================================================
     GALERÍA DEL LOCAL (sucursales.html)
     ========================================================== */
  /* Las fotos de adentro del local están guardadas junto con las
     de los frentes, en assets/imagenes/sucursales/. Si algún día
     las movés a otra carpeta, cambiá la ruta de acá abajo. */
  function fotosLocal(idContenedor) {
    const cont = document.getElementById(idContenedor);
    if (!cont || !FB.fotosLocal) return;
    cont.className = 'galeria-local';
    cont.innerHTML = FB.fotosLocal.map((x) => `
      <figure class="foto-local">
        <img src="${FB.foto('sucursales', x.img, '4Q')}" alt="${x.texto}"
             loading="lazy" onerror="FB.alFallarImagen(this,'4Q')">
        <figcaption>${x.texto}</figcaption>
      </figure>`).join('');
  }

  /* ==========================================================
     TIRA DE CATEGORÍAS (acceso rápido en la portada)
     Fila horizontal: ícono arriba, nombre abajo. En celular se
     desliza con el dedo en vez de apilarse, así no empuja el
     resto de la portada hacia abajo.
     ========================================================== */
  function tiraCategorias(idContenedor) {
    const cont = document.getElementById(idContenedor);
    if (!cont) return;
    cont.className = 'tira-categorias';
    cont.innerHTML = FB.catsDePortada().map((c) => `
      <a class="tira-item" href="${FB.ruta('productos/productos.html')}?cat=${c.id}">
        <span class="tira-ico">${FB.marcaCategoria(c)}</span>
        <span class="tira-nombre">${c.nombre}</span>
      </a>`).join('');
  }

  return { tarjeta, activarTarjetas, carrusel, carruselManual, ofertasPorCategoria,
           grilla, catalogoFiltrable,
           categorias, tiraCategorias, sucursales, acordeon, fotosLocal };
})();