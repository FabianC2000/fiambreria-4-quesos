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
    panel.querySelector('#enviar-pedido').addEventListener('click', enviarPorWhatsapp);

    const sel = panel.querySelector('#select-sucursal');
    sel.value = String(FB.sucursalIndice());
    sel.addEventListener('change', () => {
      FB.elegirSucursal(Number(sel.value));
      FB.aviso(`Retirás en ${FB.sucursalActual().nombre}`);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cerrar();
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

  /* ---------- pedido por WhatsApp ---------- */
  function enviarPorWhatsapp() {
    if (!items.length) { FB.aviso('Primero agregá productos al carrito'); return; }

    const usuario  = FB.usuarios && FB.usuarios.actual();
    const sucursal = FB.sucursalActual();

    let texto = '¡Hola 4 Quesos! Quiero hacer este pedido:\n\n';
    items.forEach((it) => {
      const d = datosItem(it);
      if (d) texto += `• ${d.cantidad} x ${d.producto.nombre} (${d.opcion.etiqueta}) — ${FB.precio(d.subtotal)}\n`;
    });
    texto += `\nTotal: ${FB.precio(total())}`;
    texto += `\nRetiro en: ${sucursal.nombre} (${sucursal.direccion})`;
    if (usuario) texto += `\nA nombre de: ${usuario.nombre}`;

    /* Cambiá este número por el del local (formato internacional, sin + ni espacios) */
    /* El número vive en FB.empresa, en productos.js */
    const numero = FB.empresa.whatsapp;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank');
  }

  /* ---------- arranque ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    construirPanel();
    actualizarContador();
    pintar();
  });

  return { agregar, quitar, vaciar, abrir, cerrar, actualizarContador, total, unidades, items: () => items };
})();