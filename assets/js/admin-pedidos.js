/* ============================================================
   admin-pedidos.js — los pedidos, del lado del local

   A diferencia de panel.html, esta pantalla sí necesita sesión:
   muestra nombres, teléfonos y compras de otras personas. Quien
   manda es api/admin-pedidos.php, que exige rol 'admin'; acá
   adentro no hay ninguna comprobación que sirva como seguridad,
   porque cualquiera puede editar este archivo en su navegador.
   Lo de acá es nada más para que la pantalla se entienda.
   ============================================================ */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const api = (a) => FB.ruta('api/' + a);

  /* Todo lo que viene de la base y entra al HTML pasa por acá. El
     nombre lo eligió la persona al registrarse y la nota la
     escribió ella: sin escapar, el local abriría esta pantalla y
     ejecutaría lo que un cliente haya querido dejarle. */
  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const ESTADOS = [
    ['nuevo',      'Nuevo'],
    ['confirmado', 'Confirmado'],
    ['listo',      'Listo'],
    ['entregado',  'Entregado'],
    ['cancelado',  'Cancelado']
  ];
  const NOMBRE_ESTADO = Object.fromEntries(ESTADOS);

  const FILTROS = [
    ['pendientes', 'Pendientes'],
    ['nuevo',      'Nuevos'],
    ['confirmado', 'Confirmados'],
    ['listo',      'Listos'],
    ['entregado',  'Entregados'],
    ['cancelado',  'Cancelados'],
    ['todos',      'Todos']
  ];

  let csrf = '';
  let filtro = 'pendientes';
  let sucursal = 0;
  let busqueda = '';
  let reloj = null;

  /* ---------- utilidades de presentación ---------- */

  function pesos(n) {
    return (FB && FB.precio) ? FB.precio(n) : '$ ' + n;
  }

  /* MySQL devuelve "2026-11-26 03:08:11". new Date() con ese texto
     no es confiable en todos los navegadores, así que se parte. */
  function partes(texto) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(texto || ''));
    return m ? { a: +m[1], me: +m[2], d: +m[3], h: m[4], mi: m[5] } : null;
  }

  /* "hace 12 min" dice más que una hora exacta cuando lo que
     importa es cuánto hace que el pedido está esperando. */
  function cuandoFue(texto) {
    const p = partes(texto);
    if (!p) return '';
    const cuando = new Date(p.a, p.me - 1, p.d, +p.h, +p.mi);
    const minutos = Math.floor((Date.now() - cuando.getTime()) / 60000);
    if (minutos < 1)  return 'recién';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24)   return `hace ${horas} h`;
    return `${p.d}/${p.me} a las ${p.h}:${p.mi}`;
  }

  function horaExacta(texto) {
    const p = partes(texto);
    return p ? `${p.d}/${p.me}/${p.a} ${p.h}:${p.mi}` : '';
  }

  /* El teléfono con los dígitos pelados, para poder tocarlo y
     llamar desde el celular del mostrador. */
  function aTelefono(tel) {
    const d = String(tel || '').replace(/\D/g, '');
    return d.length >= 8 ? '+54' + d : '';
  }

  /* ---------- avisarle al cliente ----------

     Esto NO manda el mensaje solo: abre WhatsApp con el texto ya
     escrito y lo manda la persona que está en el mostrador.

     Mandarlo solo necesitaría la API oficial de Meta, que pide
     verificación del negocio, plantillas aprobadas, pago por
     mensaje y —lo que lo vuelve impracticable acá— un número que
     no esté en uso en la app común de WhatsApp: justo el número
     que el local ya usa con todos sus clientes.

     Tampoco se guarda que el aviso se mandó: desde acá solo se
     sabe que se abrió WhatsApp, no que alguien haya apretado
     enviar, y anotar un aviso que quizá no salió sería peor que no
     anotar nada. */
  function mensajeAviso(p) {
    const nombre = String(p.nombre || '').split(' ')[0];
    const suc = FB.nombreCorto ? FB.nombreCorto(p.sucursal) : p.sucursal;
    const plata = pesos(Number(p.total));

    if (p.estado === 'listo') {
      return `¡Hola ${nombre}! Tu pedido ${p.numero} ya está listo para retirar ` +
             `en ${suc}. Total: ${plata}. ¡Te esperamos!`;
    }
    if (p.estado === 'cancelado') {
      return `Hola ${nombre}, te escribimos por tu pedido ${p.numero}.`;
    }
    if (p.estado === 'entregado') {
      return `¡Hola ${nombre}! Gracias por tu compra (${p.numero}). ` +
             '¡Que lo disfrutes!';
    }
    return `¡Hola ${nombre}! Recibimos tu pedido ${p.numero} por ${plata} ` +
           `para retirar en ${suc}. Te avisamos apenas esté listo.`;
  }

  function textoBotonAviso(estado) {
    if (estado === 'listo')     return 'Avisar que está listo';
    if (estado === 'nuevo')     return 'Confirmarle por WhatsApp';
    if (estado === 'cancelado') return 'Escribirle por WhatsApp';
    return 'Escribirle por WhatsApp';
  }

  function aviso(texto, mal) {
    const c = $('aviso-pedidos');
    if (!c) return;
    c.hidden = false;
    c.className = 'admin-aviso' + (mal ? ' admin-aviso-mal' : '');
    c.innerHTML = '<p>' + texto + '</p>';
  }

  /* ---------- dibujar ---------- */

  function pintarFiltros(cuentas) {
    $('filtros').innerHTML = FILTROS.map(([id, nombre]) => {
      const n = cuentas[id] || 0;
      return `<button type="button" class="filtro-pill" data-filtro="${id}"
                      aria-pressed="${id === filtro}">
                ${esc(nombre)} <span>${n}</span>
              </button>`;
    }).join('');

    $('filtros').querySelectorAll('.filtro-pill').forEach((b) => {
      b.addEventListener('click', () => {
        filtro = b.dataset.filtro;
        cargar();
      });
    });
  }

  function pintarSucursales(sucs) {
    const sel = $('f-sucursal');
    if (sel.dataset.listo === '1') return;
    sel.innerHTML = '<option value="0">Las dos sucursales</option>' +
      sucs.map((s) => `<option value="${esc(s.id)}">${esc(
        FB.nombreCorto ? FB.nombreCorto(s.nombre) : s.nombre)}</option>`).join('');
    sel.dataset.listo = '1';
    sel.addEventListener('change', () => { sucursal = Number(sel.value); cargar(); });
  }

  function tarjeta(p) {
    const tel = aTelefono(p.telefono);
    const items = p.items.map((i) => `
      <li>
        <span class="item-cant">${esc(i.cantidad)}&times;</span>
        <span class="item-nombre">${esc(i.nombre)} <small>${esc(i.etiqueta)}</small></span>
        <span class="item-sub">${esc(pesos(Number(i.subtotal)))}</span>
      </li>`).join('');

    const botones = ESTADOS.map(([id, nombre]) => `
      <button type="button" class="btn-estado" data-id="${esc(p.id)}" data-estado="${id}"
              aria-pressed="${p.estado === id}"
              ${p.estado === id ? 'disabled' : ''}>${esc(nombre)}</button>`).join('');

    /* El aviso se destaca cuando el pedido está listo, que es el
       momento en que de verdad hay algo que decirle. En los demás
       estados queda como una acción más. */
    const avisar = tel
      ? `<a class="btn-avisar${p.estado === 'listo' ? ' btn-avisar-fuerte' : ''}"
             target="_blank" rel="noopener"
             href="https://wa.me/${esc(tel.replace('+', ''))}?text=${
               encodeURIComponent(mensajeAviso(p))}">
           ${esc(textoBotonAviso(p.estado))}
         </a>`
      : '<span class="ped-sin-tel">Sin teléfono cargado, no se le puede escribir.</span>';

    return `
      <article class="tarjeta-ped" data-estado="${esc(p.estado)}" data-id="${esc(p.id)}">
        <header class="ped-cab">
          <div>
            <p class="ped-num">${esc(p.numero)}
              <span class="pastilla">${esc(NOMBRE_ESTADO[p.estado] || p.estado)}</span></p>
            <p class="ped-meta"><time datetime="${esc(p.creado)}"
               title="${esc(horaExacta(p.creado))}">${esc(cuandoFue(p.creado))}</time>
               · ${esc(FB.nombreCorto ? FB.nombreCorto(p.sucursal) : p.sucursal)}</p>
          </div>
          <p class="ped-total">${esc(pesos(Number(p.total)))}</p>
        </header>

        <p class="ped-quien">${esc(p.nombre)}
          ${tel ? `· <a href="tel:${esc(tel)}">${esc(p.telefono)}</a>` : ''}</p>

        <ul class="ped-items">${items}</ul>

        ${p.nota ? `<p class="ped-nota"><strong>Aclaración:</strong> ${esc(p.nota)}</p>` : ''}

        <div class="ped-estados">${botones}</div>
        <div class="ped-avisar">${avisar}</div>
      </article>`;
  }

  function pintar(datos) {
    const caja = $('lista');
    if (!datos.pedidos.length) {
      caja.innerHTML = '<p class="ped-vacio">No hay pedidos que coincidan con este filtro.</p>';
      return;
    }
    caja.innerHTML = datos.pedidos.map(tarjeta).join('');
    if (datos.pedidos.length >= datos.tope) {
      caja.insertAdjacentHTML('beforeend',
        `<p class="ped-vacio">Se muestran los ${datos.tope} más recientes. ` +
        'Si buscás uno más viejo, usá el buscador.</p>');
    }

    caja.querySelectorAll('.btn-estado').forEach((b) => {
      b.addEventListener('click', () => cambiar(b));
    });
  }

  /* ---------- hablar con el servidor ---------- */

  async function cargar(silencioso) {
    const boton = $('btn-refrescar');
    if (!silencioso && boton) { boton.disabled = true; boton.textContent = 'Buscando…'; }
    try {
      const url = api('admin-pedidos.php') +
        `?filtro=${encodeURIComponent(filtro)}` +
        `&sucursal=${encodeURIComponent(String(sucursal))}` +
        `&q=${encodeURIComponent(busqueda)}`;
      const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });

      if (r.status === 401 || r.status === 404) {
        detener();
        $('lista').innerHTML = '';
        $('herramientas').hidden = true;
        aviso(r.status === 401
          ? 'Entrá con tu cuenta para ver los pedidos. ' +
            `<a href="${FB.ruta('cuenta/ingresar.html')}">Iniciar sesión</a>`
          : 'Esta cuenta no es de administración. Si tendría que serlo, ' +
            'hay que marcarla como tal en la base de datos.', true);
        return;
      }
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'respuesta inesperada');

      $('aviso-pedidos').hidden = true;
      $('herramientas').hidden = false;
      pintarSucursales(d.sucursales || []);
      pintarFiltros(d.cuentas || {});
      pintar(d);
      /* Que se note en qué orden está la lista, porque cambia
         según el filtro y si no se nota parece un error. */
      $('orden-aviso').textContent = d.cola
        ? 'Arriba, los que más esperaron.'
        : 'Arriba, los más recientes.';
      /* hour12 en false: sin eso, es-AR devuelve "12:27 a. m." y el
         resto del sitio muestra las horas de corrido. */
      $('actualizado').textContent = 'Actualizado ' +
        new Date().toLocaleTimeString('es-AR',
          { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      aviso('No pude traer los pedidos. ¿XAMPP sigue encendido?', true);
    } finally {
      if (!silencioso && boton) { boton.disabled = false; boton.textContent = 'Actualizar'; }
    }
  }

  async function cambiar(boton) {
    const id = boton.dataset.id;
    const estado = boton.dataset.estado;
    const fila = boton.closest('.tarjeta-ped');

    fila.querySelectorAll('.btn-estado').forEach((b) => { b.disabled = true; });
    try {
      /* El token se pide en el momento: esta pantalla queda abierta
         horas y la sesión pudo haberse renovado. */
      const y = await fetch(api('yo.php'), { credentials: 'same-origin', cache: 'no-store' });
      csrf = (await y.json()).csrf || '';

      const r = await fetch(api('admin-pedidos.php'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf, id: Number(id), estado })
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'no pude cambiarlo');

      /* Se recarga en vez de retocar la tarjeta: cambiar el estado
         mueve el pedido de filtro y cambia las cuentas de arriba. */
      await cargar(true);
    } catch (e) {
      fila.querySelectorAll('.btn-estado').forEach((b) => { b.disabled = false; });
      aviso('No pude cambiar el estado: ' + esc(e.message), true);
    }
  }

  /* ---------- actualización sola ---------- */

  function arrancarReloj() {
    detener();
    /* Solo mientras la pestaña esté a la vista: si el local la deja
       abierta en segundo plano toda la tarde, no tiene sentido
       seguir consultando. */
    reloj = setInterval(() => {
      if (document.visibilityState === 'visible') cargar(true);
    }, 45000);
  }

  function detener() {
    if (reloj) { clearInterval(reloj); reloj = null; }
  }

  document.addEventListener('visibilitychange', () => {
    /* Al volver a la pestaña, lo primero es ver si entró algo. */
    if (document.visibilityState === 'visible') cargar(true);
  });

  /* ---------- arranque ---------- */

  document.addEventListener('DOMContentLoaded', () => {
    $('btn-refrescar').addEventListener('click', () => cargar());

    const buscador = $('f-busqueda');
    let espera = null;
    buscador.addEventListener('input', () => {
      /* Se espera a que deje de tipear: una consulta por tecla
         sería una consulta por tecla. */
      clearTimeout(espera);
      espera = setTimeout(() => { busqueda = buscador.value.trim(); cargar(true); }, 350);
    });
    buscador.form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      clearTimeout(espera);
      busqueda = buscador.value.trim();
      cargar();
    });

    cargar();
    arrancarReloj();
  });
})();
