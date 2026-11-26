/* ============================================================
   usuarios.js — sesión del cliente en el frente

   Antes acá vivía un registro de mentira: los usuarios y las
   contraseñas quedaban guardados en el navegador del visitante.
   Servía para mostrar la pantalla, pero no era una cuenta real y
   no daba ninguna seguridad.

   Ahora la sesión la maneja el servidor (api/yo.php, ingresar.php,
   salir.php) y este archivo solo tiene lo que el encabezado
   necesita: quién está conectado y cómo salir.

   El sitio también se publica estático en GitHub Pages, donde no
   hay PHP. Ahí no hay sesión posible: estas funciones devuelven
   "nadie conectado" y el botón lleva a la pantalla de ingreso, que
   explica la situación. Nada se rompe.
   ============================================================ */

FB.usuarios = (function () {
  'use strict';

  let sesion = null;        // null = nadie, o {nombre, apellido, correo, rol}
  let consultado = false;   // ya se le preguntó al servidor
  let hayBackend = true;

  /* El nombre lo elige la persona al registrarse y solo se valida
     por largo, así que puede traer cualquier cosa adentro. Antes de
     armar HTML con él hay que escaparlo. */
  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------------------------------------------------------- */
  async function consultar() {
    if (consultado) return sesion;
    consultado = true;
    try {
      const r = await fetch(FB.ruta('api/yo.php'), {
        credentials: 'same-origin', cache: 'no-store'
      });
      if (!r.ok) throw new Error('estado ' + r.status);
      const d = await r.json();
      sesion = d.sesion ? d.cliente : null;
    } catch (e) {
      /* Sin PHP (sitio estático) o con XAMPP apagado. No es un error
         para mostrarle a nadie: simplemente no hay cuentas. */
      hayBackend = false;
      sesion = null;
    }
    return sesion;
  }

  /* Lo usa el carrito para encabezar el pedido con el nombre.
     Es síncrono a propósito: devuelve lo último que se sabe. */
  const actual = () => sesion;

  function refrescarHeader() {
    const chico  = document.getElementById('usuario-chico');
    const grande = document.getElementById('usuario-grande');
    if (!chico || !grande) return;
    if (sesion) {
      chico.textContent  = 'Hola,';
      grande.textContent = (sesion.nombre || '').split(' ')[0];
    } else {
      chico.textContent  = 'Ingresá o';
      grande.textContent = 'Registrate';
    }
  }

  /* El botón del encabezado. Sin sesión lleva a ingresar; con
     sesión abre un menú chico para salir. */
  function abrirModal() {
    if (!sesion) {
      location.href = FB.ruta('cuenta/ingresar.html');
      return;
    }
    menu();
  }

  function menu() {
    cerrarModal();
    const ancla = document.getElementById('btn-usuario');
    if (!ancla) return;

    const caja = document.createElement('div');
    caja.id = 'menu-usuario';
    caja.className = 'menu-usuario';
    const apellido = sesion.apellido ? ' ' + sesion.apellido : '';
    caja.innerHTML =
      '<p class="menu-usuario-quien">' + esc(sesion.nombre) + esc(apellido) +
      '<span>' + esc(sesion.correo) + '</span></p>' +
      '<a href="' + FB.ruta('cuenta/pedidos.html') + '">Mis pedidos</a>' +
      '<button type="button" id="menu-salir">Cerrar sesión</button>';
    document.body.appendChild(caja);

    const r = ancla.getBoundingClientRect();
    caja.style.top  = (window.scrollY + r.bottom + 8) + 'px';
    /* Alineado con el borde derecho del botón, sin salirse de la pantalla. */
    caja.style.left = Math.max(8, window.scrollX + r.right - caja.offsetWidth) + 'px';

    document.getElementById('menu-salir').addEventListener('click', salir);
    /* En el próximo ciclo: si no, el mismo clic que abre el menú lo cierra. */
    setTimeout(() => document.addEventListener('click', afuera), 0);
    document.addEventListener('keydown', escapar);
  }

  function afuera(ev) {
    const caja = document.getElementById('menu-usuario');
    if (caja && !caja.contains(ev.target) && ev.target.id !== 'btn-usuario') cerrarModal();
  }
  function escapar(ev) { if (ev.key === 'Escape') cerrarModal(); }

  function cerrarModal() {
    const caja = document.getElementById('menu-usuario');
    if (caja) caja.remove();
    document.removeEventListener('click', afuera);
    document.removeEventListener('keydown', escapar);
  }

  async function salir() {
    cerrarModal();
    try {
      /* El token CSRF se pide recién ahora: el de la carga inicial
         pudo haber cambiado si la sesión se renovó mientras tanto. */
      const r = await fetch(FB.ruta('api/yo.php'), { credentials: 'same-origin', cache: 'no-store' });
      const d = await r.json();
      await fetch(FB.ruta('api/salir.php'), {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf: d.csrf })
      });
    } catch (e) { /* si falla, igual se limpia del lado del cliente */ }
    sesion = null;
    refrescarHeader();
    if (FB.aviso) FB.aviso('Cerraste la sesión');
  }

  /* Registrar e ingresar ya no ocurren en el encabezado: tienen su
     propia pantalla. Se dejan por si queda alguna llamada vieja. */
  const registrar = () => { location.href = FB.ruta('cuenta/registro.html'); };
  const ingresar  = () => { location.href = FB.ruta('cuenta/ingresar.html'); };

  document.addEventListener('DOMContentLoaded', async () => {
    await consultar();
    refrescarHeader();
  });

  return {
    abrirModal, cerrarModal, registrar, ingresar, salir,
    actual, refrescarHeader, consultar,
    get hayBackend() { return hayBackend; }
  };
})();
