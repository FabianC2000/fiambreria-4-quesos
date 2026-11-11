/* ============================================================
   usuarios.js
   Registro e ingreso de usuarios desde el ícono del header.

   IMPORTANTE: esto es sólo la parte visual (front-end). Los
   datos quedan guardados en el navegador del visitante, así que
   NO sirve como seguridad real. Cuando sumes servidor (PHP,
   Node, Firebase, etc.) reemplazá registrar() e ingresar() por
   llamadas a tu API y nunca guardes contraseñas en el cliente.
   ============================================================ */

FB.usuarios = (function () {

  const CLAVE_USUARIOS = 'fiambreria_usuarios';
  const CLAVE_SESION   = 'fiambreria_sesion';

  let lista  = FB.leer(CLAVE_USUARIOS, []);
  let sesion = FB.leer(CLAVE_SESION, null);

  const actual = () => sesion;

  /* ---------- validaciones ---------- */
  const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim());
  const telValido   = (v) => v.replace(/\D/g, '').length >= 8;

  /* ---------- alta e ingreso ---------- */
  function registrar({ nombre, email, tel, clave }) {
    if (lista.some((u) => u.email.toLowerCase() === email.toLowerCase()))
      return { ok: false, msg: 'Ya existe una cuenta con ese correo.' };

    const nuevo = { nombre: nombre.trim(), email: email.trim(), tel: tel.trim(), clave };
    lista.push(nuevo);
    FB.guardar(CLAVE_USUARIOS, lista);
    iniciarSesion(nuevo);
    return { ok: true, msg: '¡Cuenta creada! Ya podés hacer tus pedidos.' };
  }

  function ingresar(email, clave) {
    const u = lista.find(
      (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.clave === clave
    );
    if (!u) return { ok: false, msg: 'Correo o contraseña incorrectos.' };
    iniciarSesion(u);
    return { ok: true, msg: `¡Hola de nuevo, ${u.nombre.split(' ')[0]}!` };
  }

  function iniciarSesion(u) {
    sesion = { nombre: u.nombre, email: u.email, tel: u.tel };
    FB.guardar(CLAVE_SESION, sesion);
    refrescarHeader();
  }

  function salir() {
    sesion = null;
    FB.guardar(CLAVE_SESION, null);
    refrescarHeader();
    cerrarModal();
    FB.aviso('Cerraste tu sesión');
  }

  /* ---------- texto del botón del header ---------- */
  function refrescarHeader() {
    const chico  = document.getElementById('usuario-chico');
    const grande = document.getElementById('usuario-grande');
    if (!chico || !grande) return;
    if (sesion) {
      chico.textContent  = 'Hola,';
      grande.textContent = sesion.nombre.split(' ')[0];
    } else {
      chico.textContent  = 'Ingresá o';
      grande.textContent = 'Registrate';
    }
  }

  /* ---------- modal ---------- */
  function construirModal() {
    if (document.getElementById('modal-usuario')) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'modal-usuario';
    modal.innerHTML = `
      <div class="fondo-oscuro abierto" id="fondo-usuario" style="position:absolute;z-index:1"></div>
      <div class="modal-caja" role="dialog" aria-modal="true" aria-label="Cuenta de usuario">
        <div class="modal-cabecera">
          <h3 id="titulo-usuario">Mi cuenta</h3>
          <p id="bajada-usuario">Pedí más rápido guardando tus datos</p>
          <button class="btn-cerrar" id="cerrar-usuario" aria-label="Cerrar">
            ${FB.ico.cerrar}
          </button>
        </div>
        <div id="contenido-usuario"></div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('#cerrar-usuario').addEventListener('click', cerrarModal);
    modal.querySelector('#fondo-usuario').addEventListener('click', cerrarModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });
  }

  function pintarFormularios(pestana = 'ingreso') {
    const cont = document.getElementById('contenido-usuario');

    /* Sesión activa */
    if (sesion) {
      document.getElementById('titulo-usuario').textContent = 'Mi cuenta';
      document.getElementById('bajada-usuario').textContent = sesion.email;
      cont.innerHTML = `
        <div class="panel-sesion">
          <div class="avatar">${sesion.nombre.charAt(0).toUpperCase()}</div>
          <div>
            <p class="nombre">${sesion.nombre}</p>
            <p class="dato">${sesion.email}</p>
            <p class="dato">${sesion.tel || 'Sin teléfono cargado'}</p>
          </div>
          <button class="btn btn-ciruela btn-bloque" id="ver-pedido-sesion">Ver mi pedido</button>
          <button class="btn btn-linea btn-bloque" id="salir-sesion">Cerrar sesión</button>
        </div>`;
      cont.querySelector('#salir-sesion').addEventListener('click', salir);
      cont.querySelector('#ver-pedido-sesion').addEventListener('click', () => {
        cerrarModal();
        FB.carrito.abrir();
      });
      return;
    }

    /* Sin sesión: pestañas ingreso / registro */
    document.getElementById('titulo-usuario').textContent = 'Mi cuenta';
    document.getElementById('bajada-usuario').textContent = 'Pedí más rápido guardando tus datos';

    cont.innerHTML = `
      <div class="pestanas">
        <button id="tab-ingreso"  class="${pestana === 'ingreso'  ? 'activo' : ''}">Ingresar</button>
        <button id="tab-registro" class="${pestana === 'registro' ? 'activo' : ''}">Registrarme</button>
      </div>

      <form class="formulario" id="form-ingreso" style="display:${pestana === 'ingreso' ? 'flex' : 'none'}" novalidate>
        <div class="mensaje-form" id="msj-ingreso"></div>
        <div class="campo">
          <label for="in-email">Correo electrónico</label>
          <input type="email" id="in-email" placeholder="tucorreo@mail.com" autocomplete="email">
          <small class="campo-error">Ingresá un correo válido.</small>
        </div>
        <div class="campo">
          <label for="in-clave">Contraseña</label>
          <input type="password" id="in-clave" placeholder="••••••••" autocomplete="current-password">
          <small class="campo-error">Mínimo 6 caracteres.</small>
        </div>
        <button type="submit" class="btn btn-ciruela btn-bloque">Ingresar</button>
        <p class="nota-form">¿No tenés cuenta? Tocá “Registrarme”.</p>
      </form>

      <form class="formulario" id="form-registro" style="display:${pestana === 'registro' ? 'flex' : 'none'}" novalidate>
        <div class="mensaje-form" id="msj-registro"></div>
        <div class="campo">
          <label for="re-nombre">Nombre y apellido</label>
          <input type="text" id="re-nombre" placeholder="Juan Pérez" autocomplete="name">
          <small class="campo-error">Escribí tu nombre completo.</small>
        </div>
        <div class="campo">
          <label for="re-email">Correo electrónico</label>
          <input type="email" id="re-email" placeholder="tucorreo@mail.com" autocomplete="email">
          <small class="campo-error">Ingresá un correo válido.</small>
        </div>
        <div class="campo">
          <label for="re-tel">Teléfono / WhatsApp</label>
          <input type="tel" id="re-tel" placeholder="388 400-0000" autocomplete="tel">
          <small class="campo-error">Ingresá un teléfono válido.</small>
        </div>
        <div class="campo">
          <label for="re-clave">Contraseña</label>
          <input type="password" id="re-clave" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
          <small class="campo-error">Mínimo 6 caracteres.</small>
        </div>
        <button type="submit" class="btn btn-oro btn-bloque">Crear mi cuenta</button>
        <p class="nota-form">Usamos tus datos sólo para gestionar tus pedidos.</p>
      </form>`;

    cont.querySelector('#tab-ingreso').addEventListener('click', () => pintarFormularios('ingreso'));
    cont.querySelector('#tab-registro').addEventListener('click', () => pintarFormularios('registro'));

    /* --- ingreso --- */
    cont.querySelector('#form-ingreso').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('in-email');
      const clave = document.getElementById('in-clave');
      let valido = true;
      valido = marcar(email, emailValido(email.value)) && valido;
      valido = marcar(clave, clave.value.length >= 6) && valido;
      if (!valido) return;

      const r = ingresar(email.value, clave.value);
      mensaje('msj-ingreso', r);
      if (r.ok) setTimeout(() => { cerrarModal(); FB.aviso(r.msg); }, 700);
    });

    /* --- registro --- */
    cont.querySelector('#form-registro').addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = document.getElementById('re-nombre');
      const email  = document.getElementById('re-email');
      const tel    = document.getElementById('re-tel');
      const clave  = document.getElementById('re-clave');
      let valido = true;
      valido = marcar(nombre, nombre.value.trim().length >= 3) && valido;
      valido = marcar(email, emailValido(email.value))         && valido;
      valido = marcar(tel,   telValido(tel.value))             && valido;
      valido = marcar(clave, clave.value.length >= 6)          && valido;
      if (!valido) return;

      const r = registrar({
        nombre: nombre.value, email: email.value, tel: tel.value, clave: clave.value
      });
      mensaje('msj-registro', r);
      if (r.ok) setTimeout(() => { cerrarModal(); FB.aviso(r.msg); }, 900);
    });
  }

  function marcar(input, ok) {
    input.closest('.campo').classList.toggle('con-error', !ok);
    return ok;
  }

  function mensaje(id, r) {
    const m = document.getElementById(id);
    if (!m) return;
    m.textContent = r.msg;
    m.className = 'mensaje-form ' + (r.ok ? 'ok' : 'mal');
  }

  /* Quién abrió el modal, para devolverle el foco al cerrar */
  let disparador = null;

  function abrirModal(pestana) {
    construirModal();
    pintarFormularios(pestana || 'ingreso');
    disparador = document.activeElement;
    document.getElementById('modal-usuario').classList.add('abierto');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const primero = document.querySelector('#contenido-usuario input, #contenido-usuario button');
      if (primero) primero.focus();
    });
  }

  function cerrarModal() {
    const m = document.getElementById('modal-usuario');
    if (!m || !m.classList.contains('abierto')) return;
    m.classList.remove('abierto');
    document.body.style.overflow = '';
    if (disparador && document.contains(disparador)) disparador.focus();
    disparador = null;
  }

  document.addEventListener('DOMContentLoaded', refrescarHeader);

  return { abrirModal, cerrarModal, registrar, ingresar, salir, actual, refrescarHeader };
})();
