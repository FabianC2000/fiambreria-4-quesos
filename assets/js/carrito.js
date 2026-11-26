/* ============================================================
   carrito.js
   Carrito de compras: agregar, sumar, restar, quitar, total.
   Se guarda en el navegador, así que no se pierde al cambiar
   de página ni al cerrar el sitio.
   ============================================================ */

FB.carrito = (function () {

  const CLAVE = 'fiambreria_carrito';
  let items = FB.leer(CLAVE, []);   // [{id, opcion, cantidad}]

  /* ---------- helpers ---------- */
  function persistir() {
    FB.guardar(CLAVE, items);
    actualizarContador();
    pintar();
  }

  function datosItem(it) {
    const p = FB.porId(it.id);
    if (!p) return null;
    const op = FB.opciones(p).find((o) => o.id === it.opcion) || FB.opciones(p)[0];
    return { producto: p, opcion: op, cantidad: it.cantidad, subtotal: op.precio * it.cantidad };
  }

  function total() {
    return items.reduce((acc, it) => {
      const d = datosItem(it);
      return acc + (d ? d.subtotal : 0);
    }, 0);
  }

  function unidades() {
    return items.reduce((acc, it) => acc + it.cantidad, 0);
  }

  /* ---------- acciones ---------- */
  function agregar(id, opcionId, cantidad = 1) {
    const p = FB.porId(id);
    if (!p) return;
    const op = opcionId || FB.opciones(p)[0].id;
    const existente = items.find((it) => it.id === id && it.opcion === op);
    if (existente) existente.cantidad += cantidad;
    else items.push({ id, opcion: op, cantidad });
    persistir();
    const nombreOp = FB.opciones(p).find((o) => o.id === op).etiqueta;
    FB.aviso(`${p.nombre} (${nombreOp}) se agregó al carrito`);
  }

  function cambiar(indice, delta) {
    const it = items[indice];
    if (!it) return;
    it.cantidad += delta;
    if (it.cantidad < 1) items.splice(indice, 1);
    persistir();
  }

  function quitar(indice) {
    items.splice(indice, 1);
    persistir();
  }

  function vaciar() {
    items = [];
    persistir();
  }

  /* ---------- contador del header ---------- */
  let relojLatido = null;

  function actualizarContador() {
    const c = document.getElementById('contador-carrito');
    if (!c) return;
    const previo = Number(c.textContent) || 0;
    const n = unidades();
    c.textContent = n;
    c.style.display = n > 0 ? 'grid' : 'none';

    /* Un latido corto cuando sube: confirma el click sin distraer.
       Con clicks repetidos se reinicia, no se acumula. */
    if (n > previo) {
      c.classList.add('late');
      clearTimeout(relojLatido);
      relojLatido = setTimeout(() => c.classList.remove('late'), 140);
    }
  }

  /* ---------- panel lateral ---------- */
  function construirPanel() {
    if (document.getElementById('panel-carrito')) return;

    const fondo = document.createElement('div');
    fondo.className = 'fondo-oscuro';
    fondo.id = 'fondo-carrito';
    fondo.addEventListener('click', cerrar);

    const panel = document.createElement('aside');
    panel.className = 'panel-carrito';
    panel.id = 'panel-carrito';
    panel.setAttribute('aria-label', 'Carrito de compras');
    panel.innerHTML = `
      <div class="panel-cabecera">
        <h3>${FB.ico.carrito} Mi pedido</h3>
        <button class="btn-cerrar" id="cerrar-carrito" aria-label="Cerrar carrito">
          ${FB.ico.cerrar}
        </button>
      </div>
      <div class="panel-items" id="items-carrito"></div>
      <div class="panel-pie">
        <div class="campo campo-retiro">
          <label for="select-sucursal">Retirás en</label>
          <select id="select-sucursal">
            ${FB.sucursales.map((s, i) => `<option value="${i}">${s.nombre} — ${s.direccion}</option>`).join('')}
          </select>
          <small>No hacemos envíos: el pedido se retira por el local.</small>
        </div>
        <div class="fila-total"><span>Total del pedido</span><strong id="total-carrito">$ 0</strong></div>
        <button class="btn btn-oro btn-bloque" id="enviar-pedido">Enviar pedido por WhatsApp</button>
        <button class="btn-texto" id="vaciar-carrito">Vaciar carrito</button>
      </div>`;

    document.body.appendChild(fondo);
    document.body.appendChild(panel);

    panel.querySelector('#cerrar-carrito').addEventListener('click', cerrar);
    panel.querySelector('#vaciar-carrito').addEventListener('click', () => {
      if (items.length) { vaciar(); FB.aviso('Carrito vacío'); }
    });
    panel.querySelector('#enviar-pedido').addEventListener('click', finalizar);

    const sel = panel.querySelector('#select-sucursal');
    sel.value = String(FB.sucursalIndice());
    sel.addEventListener('change', () => {
      FB.elegirSucursal(Number(sel.value));
      FB.aviso(`Retirás en ${FB.sucursalActual().nombre}`);
    });
  }

  function pintar() {
    const cont = document.getElementById('items-carrito');
    if (!cont) return;

    if (!items.length) {
      cont.innerHTML = `
        <div class="carrito-vacio">
          ${FB.ico.carrito}
          <p class="titulo">Tu pedido está vacío</p>
          <p>Elegí del catálogo y lo vas viendo acá.</p>
        </div>`;
    } else {
      cont.innerHTML = items.map((it, i) => {
        const d = datosItem(it);
        if (!d) return '';
        return `
          <article class="item-carrito">
            <img src="${FB.foto('productos', d.producto.img, '4Q')}"
                 alt="${d.producto.nombre}"
                 onerror="FB.alFallarImagen(this,'4Q')">
            <div class="item-info">
              <h4>${d.producto.nombre}</h4>
              <div class="op">${d.opcion.etiqueta} · ${FB.precio(d.opcion.precio)}</div>
              <div class="precio">${FB.precio(d.subtotal)}</div>
              <div class="item-controles">
                <button data-accion="menos" data-i="${i}" aria-label="Quitar uno">−</button>
                <span>${d.cantidad}</span>
                <button data-accion="mas" data-i="${i}" aria-label="Agregar uno">+</button>
                <button class="item-quitar" data-accion="quitar" data-i="${i}">Quitar</button>
              </div>
            </div>
          </article>`;
      }).join('');

      cont.querySelectorAll('button[data-accion]').forEach((b) => {
        b.addEventListener('click', () => {
          const i = Number(b.dataset.i);
          if (b.dataset.accion === 'mas') cambiar(i, 1);
          else if (b.dataset.accion === 'menos') cambiar(i, -1);
          else quitar(i);
        });
      });
    }

    const t = document.getElementById('total-carrito');
    if (t) t.textContent = FB.precio(total());
  }

  /* Quién abrió el panel, para devolverle el foco al cerrar */
  let disparador = null;

  function abrir() {
    /* Si quedó mostrando la confirmación del pedido anterior, se
       tira y se arma de nuevo. Reemplazar solo el pie dejaría el
       panel sin el selector de sucursal ni el botón de pedir hasta
       que alguien recargue la página. */
    const previo = document.getElementById('panel-carrito');
    if (previo && previo.dataset.estado === 'confirmado') {
      previo.remove();
      const fondoViejo = document.getElementById('fondo-carrito');
      if (fondoViejo) fondoViejo.remove();
    }

    construirPanel();
    pintar();
    disparador = document.activeElement;
    document.getElementById('panel-carrito').classList.add('abierto');
    document.getElementById('fondo-carrito').classList.add('abierto');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const x = document.getElementById('cerrar-carrito');
      if (x) x.focus();
    });
  }

  function cerrar() {
    const p = document.getElementById('panel-carrito');
    const f = document.getElementById('fondo-carrito');
    if (!p || !p.classList.contains('abierto')) return;
    p.classList.remove('abierto');
    if (f) f.classList.remove('abierto');
    document.body.style.overflow = '';
    if (disparador && document.contains(disparador)) disparador.focus();
    disparador = null;
  }

  /* ============================================================
     FINALIZAR EL PEDIDO

     Hay dos caminos, según si la persona tiene la sesión abierta:

     · Con cuenta: el pedido se guarda en la base y recibe un
       número (4Q-00042). Después se le ofrece abrir WhatsApp con
       ese número adentro, así el local puede buscarlo en el panel
       y los dos hablan de lo mismo.

     · Sin cuenta: exactamente lo de siempre, WhatsApp y nada más.
       No se obliga a registrarse para comprar; quien no quiere
       cuenta sigue pidiendo como hasta ahora, solo que sin
       historial.

     El sitio publicado en GitHub Pages no tiene PHP, así que ahí
     siempre corre el segundo camino.
     ============================================================ */

  function textoPedido(sucursal, numero) {
    let texto = '¡Hola 4 Quesos! Quiero hacer este pedido';
    texto += numero ? ` (${numero}):\n\n` : ':\n\n';
    items.forEach((it) => {
      const d = datosItem(it);
      if (d) texto += `• ${d.cantidad} x ${d.producto.nombre} (${d.opcion.etiqueta}) — ${FB.precio(d.subtotal)}\n`;
    });
    texto += `\nTotal: ${FB.precio(total())}`;
    texto += `\nRetiro en: ${sucursal.nombre} (${sucursal.direccion})`;
    const usuario = FB.usuarios && FB.usuarios.actual();
    if (usuario) texto += `\nA nombre de: ${usuario.nombre}`;
    return texto;
  }

  function enlaceWhatsapp(texto) {
    /* El número vive en FB.empresa, en productos.js */
    return `https://wa.me/${FB.empresa.whatsapp}?text=${encodeURIComponent(texto)}`;
  }

  function anotarMetrica(sucursal) {
    /* Queda anotado antes de salir a WhatsApp: una vez que el foco
       se va a otra pestaña no hay garantía de que este código siga
       corriendo. El tablero cuenta pedidos iniciados, no cobrados. */
    if (!FB.metricas) return;
    FB.metricas.registrar('pedido', {
      items: items.map((it) => ({ id: it.id, op: it.opcion, cant: it.cantidad })),
      total: total(),
      suc: FB.nombreCorto ? FB.nombreCorto(sucursal.nombre) : sucursal.nombre
    });
  }

  /* Devuelve el pedido guardado, o null si no se pudo. */
  async function guardarPedido(sucursal) {
    /* El token CSRF se pide recién ahora y no al cargar la página:
       el carrito puede haber estado abierto un buen rato. */
    const r = await fetch(FB.ruta('api/yo.php'), {
      credentials: 'same-origin', cache: 'no-store'
    });
    const yo = await r.json();
    if (!yo.sesion) {
      throw new Error('sin sesion');
    }

    const resp = await fetch(FB.ruta('api/pedidos.php'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csrf: yo.csrf,
        sucursal_id: sucursal.id,
        items: items.map((it) => ({
          id: it.id, unidad: it.opcion, cantidad: it.cantidad
        }))
      })
    });
    const d = await resp.json();
    if (!resp.ok || !d.ok) {
      /* Se devuelve el motivo del servidor, que está escrito para
         que lo lea una persona. */
      throw new Error(d.error || 'No pude guardar el pedido.');
    }
    return d;
  }

  /* Reemplaza el contenido del panel por la confirmación. */
  function pintarConfirmacion(pedido, enlace) {
    const panel = document.getElementById('panel-carrito');
    if (!panel) return;
    const cuerpo = panel.querySelector('#items-carrito');
    const pie    = panel.querySelector('.panel-pie');
    if (!cuerpo || !pie) return;

    /* La marca que lee abrir() para saber que este panel hay que
       rehacerlo antes de volver a mostrarlo. */
    panel.dataset.estado = 'confirmado';

    cuerpo.innerHTML =
      '<div class="pedido-listo">' +
        '<p class="pedido-numero">' + pedido.numero + '</p>' +
        '<p class="pedido-texto">Guardamos tu pedido de <strong>' +
          FB.precio(pedido.total) + '</strong> para retirar en ' +
          pedido.sucursal + '.</p>' +
        '<p class="pedido-texto">Avisanos por WhatsApp así lo preparamos. ' +
          'El número del pedido ya va en el mensaje.</p>' +
      '</div>';

    /* Un enlace y no un window.open: después de esperar la
       respuesta del servidor, el navegador ya no considera que la
       ventana la pide la persona y el bloqueador de ventanas la
       frena. Con un enlace que se toca, no hay nada que bloquear. */
    pie.innerHTML =
      '<a class="btn btn-oro btn-bloque" id="ir-whatsapp" target="_blank" ' +
         'rel="noopener" href="' + enlace + '">Avisar por WhatsApp</a>' +
      '<a class="btn-texto" href="' + FB.ruta('cuenta/pedidos.html') + '">Ver mis pedidos</a>';
  }

  async function finalizar() {
    if (!items.length) { FB.aviso('Primero agregá productos al carrito'); return; }

    const sucursal = FB.sucursalActual();
    const boton = document.getElementById('enviar-pedido');
    const conCuenta = !!(FB.usuarios && FB.usuarios.actual());

    /* Sin cuenta: el camino de siempre. window.open va acá, sin
       ningún await en el medio, así el navegador lo acepta. */
    if (!conCuenta) {
      anotarMetrica(sucursal);
      window.open(enlaceWhatsapp(textoPedido(sucursal, null)), '_blank');
      return;
    }

    const textoOriginal = boton ? boton.textContent : '';
    if (boton) { boton.disabled = true; boton.textContent = 'Guardando…'; }

    try {
      const pedido = await guardarPedido(sucursal);
      anotarMetrica(sucursal);
      const enlace = enlaceWhatsapp(textoPedido(sucursal, pedido.numero));
      /* El carrito se vacía recién acá: el pedido ya quedó
         guardado, así que no hay nada que perder, y dejarlo lleno
         invitaría a mandar el mismo pedido dos veces. El texto de
         WhatsApp ya está armado más arriba. */
      pintarConfirmacion(pedido, enlace);
      items = [];
      FB.guardar(CLAVE, items);
      actualizarContador();
    } catch (e) {
      if (boton) { boton.disabled = false; boton.textContent = textoOriginal; }
      FB.aviso(e.message === 'sin sesion'
        ? 'Se cerró tu sesión. Volvé a entrar y mandá el pedido.'
        : e.message || 'No pude guardar el pedido. Probá de nuevo.');
    }
  }

  /* ---------- arranque ---------- */
  /* Escape acá y no adentro de construirPanel(): el panel se puede
     rehacer, y cada vez que se rehiciera quedaría otro oyente
     escuchando la misma tecla. */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrar();
  });

  document.addEventListener('DOMContentLoaded', () => {
    construirPanel();
    actualizarContador();
    pintar();
  });

  return { agregar, quitar, vaciar, abrir, cerrar, actualizarContador, total, unidades, items: () => items };
})();