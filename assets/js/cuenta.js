/* ============================================================
   PANTALLAS DE CUENTA

   Hablan con los endpoints de /api/. Como el sitio también se
   publica estático en GitHub Pages, donde no hay PHP, las páginas
   detectan que no hay backend y lo dicen en vez de quedarse
   colgadas esperando.
   ============================================================ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const api = (archivo) => FB.ruta('api/' + archivo);

  let csrf = '';

  /* ---------------------------------------------------------- */
  function aviso(texto, bien) {
    const caja = $('aviso');
    if (!caja) return;
    caja.hidden = false;
    caja.className = 'aviso ' + (bien ? 'aviso-bien' : 'aviso-mal');
    caja.innerHTML = texto;
    /* Que se lea aunque el formulario esté más abajo. */
    caja.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function limpiarErrores(campos) {
    campos.forEach((c) => {
      const e = $('e-' + c), i = $(c);
      if (e) { e.hidden = true; e.textContent = ''; }
      if (i) i.removeAttribute('aria-invalid');
    });
    const caja = $('aviso');
    if (caja) caja.hidden = true;
  }

  function marcarErrores(errores) {
    let primero = null;
    Object.entries(errores).forEach(([campo, mensaje]) => {
      const e = $('e-' + campo), i = $(campo);
      if (e) { e.hidden = false; e.textContent = mensaje; }
      if (i) { i.setAttribute('aria-invalid', 'true'); if (!primero) primero = i; }
      /* Un error sin campo propio (los términos, por ejemplo) va
         arriba, o pasaría desapercibido. */
      if (!e) aviso(mensaje, false);
    });
    if (primero) primero.focus();
  }

  /* Pide a la sesión el token CSRF. Si no hay PHP, devuelve false y
     la página lo avisa una sola vez. */
  async function arrancar() {
    try {
      const r = await fetch(api('yo.php'), { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) throw new Error('respuesta ' + r.status);
      const d = await r.json();
      csrf = d.csrf || '';
      return d;
    } catch (e) {
      aviso('<p><strong>Esta pantalla necesita el servidor.</strong></p>' +
            '<p>Abrila desde <code>localhost/fiambreria/</code> con XAMPP encendido. ' +
            'En la versión publicada en internet todavía no hay cuentas: el catálogo ' +
            'y los pedidos por WhatsApp funcionan igual.</p>', false);
      return null;
    }
  }

  async function enviar(archivo, datos) {
    const r = await fetch(api(archivo), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ csrf }, datos))
    });
    let cuerpo = {};
    try { cuerpo = await r.json(); } catch (e) { /* respuesta no JSON */ }
    return { estado: r.status, datos: cuerpo };
  }

  function ocupado(boton, si, textoOcupado) {
    if (!boton) return;
    boton.disabled = si;
    if (si) {
      boton.dataset.textoOriginal = boton.textContent;
      boton.textContent = textoOcupado;
    } else if (boton.dataset.textoOriginal) {
      boton.textContent = boton.dataset.textoOriginal;
    }
  }

  /* ---------------------------------------------------------- */
  /* Registro                                                    */
  /* ---------------------------------------------------------- */
  async function registro() {
    const estado = await arrancar();
    const form = $('form-registro');
    if (!form) return;
    if (!estado) { form.querySelector('button').disabled = true; return; }

    if (estado.sesion) {
      aviso('Ya tenés la sesión abierta como <strong>' +
            estado.cliente.nombre + '</strong>. <a href="../index.html">Ir al sitio</a>', true);
      form.hidden = true;
      return;
    }

    /* Medidor de contraseña: cuenta largo y variedad. Es una ayuda
       visual, no una validación; quien valida es el servidor. */
    const clave = $('clave'), barra = $('fuerza');
    if (clave && barra) {
      clave.addEventListener('input', () => {
        const v = clave.value;
        let n = 0;
        if (v.length >= 8) n++;
        if (v.length >= 12) n++;
        if (/[^a-zA-Z0-9]/.test(v) || (/[a-z]/.test(v) && /[A-Z]/.test(v))) n++;
        if (v.length >= 16 || (/\d/.test(v) && /[^a-zA-Z0-9]/.test(v) && v.length >= 12)) n++;
        barra.dataset.nivel = String(v.length === 0 ? 0 : Math.max(1, n));
      });
    }

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      limpiarErrores(['nombre', 'apellido', 'correo', 'telefono', 'clave']);

      const datos = {
        nombre:   $('nombre').value.trim(),
        apellido: $('apellido').value.trim(),
        correo:   $('correo').value.trim(),
        telefono: $('telefono').value.trim(),
        clave:    $('clave').value,
        terminos: $('terminos').checked,
        ofertas:  $('ofertas').checked
      };

      /* Lo mismo que valida el servidor, pero acá, para no hacer un
         viaje de ida y vuelta por un campo vacío. El servidor vuelve
         a validar todo igual: esto es comodidad, no seguridad. */
      if (!datos.terminos) {
        marcarErrores({ terminos: 'Para crear la cuenta tenés que aceptar los términos y la política de privacidad.' });
        $('terminos').focus();
        return;
      }

      const boton = $('btn-crear');
      ocupado(boton, true, 'Creando…');
      try {
        const { estado: cod, datos: r } = await enviar('registro.php', datos);
        if (cod === 201 && r.ok) {
          form.hidden = true;
          let texto = '<p><strong>Listo, tu cuenta quedó creada.</strong></p>' +
                      '<p>Te mandamos un correo a <strong>' + datos.correo +
                      '</strong> para confirmar la dirección. El enlace dura 48 horas.</p>';
          if (r.enlace_verificacion) {
            /* Modo desarrollo: el correo no sale de la máquina, así
               que el enlace se muestra para poder seguir probando. */
            texto += '<p style="margin-top:12px;padding-top:12px;border-top:1px solid #BFE0CB">' +
                     '<strong>Modo desarrollo:</strong> el correo quedó guardado en ' +
                     '<code>almacen/correos/</code>. Enlace directo: ' +
                     '<a href="' + r.enlace_verificacion + '">confirmar ahora</a></p>';
          }
          aviso(texto, true);
        } else if (r.errores) {
          marcarErrores(r.errores);
        } else {
          aviso(r.error || 'No pude crear la cuenta. Probá de nuevo.', false);
        }
      } catch (e) {
        aviso('No pude comunicarme con el servidor. ¿XAMPP está encendido?', false);
      } finally {
        ocupado(boton, false);
      }
    });
  }

  /* ---------------------------------------------------------- */
  /* Ingreso                                                     */
  /* ---------------------------------------------------------- */
  async function ingreso() {
    const estado = await arrancar();
    const form = $('form-ingreso');
    if (!form) return;
    if (!estado) { form.querySelector('button').disabled = true; return; }

    if (estado.sesion) {
      aviso('Ya estás dentro como <strong>' + estado.cliente.nombre +
            '</strong>. <a href="../index.html">Ir al sitio</a>', true);
      form.hidden = true;
      return;
    }

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      limpiarErrores(['correo', 'clave']);

      const datos = { correo: $('correo').value.trim(), clave: $('clave').value };
      if (!datos.correo || !datos.clave) {
        aviso('Completá el correo y la contraseña.', false);
        return;
      }

      const boton = $('btn-entrar');
      ocupado(boton, true, 'Entrando…');
      try {
        const { datos: r } = await enviar('ingresar.php', datos);
        if (r.ok) {
          aviso('Hola ' + r.cliente.nombre + '. Entrando…', true);
          setTimeout(() => { location.href = FB.ruta('index.html'); }, 700);
        } else {
          aviso(r.error || 'No pude iniciar sesión.', false);
          $('clave').value = '';
          $('clave').focus();
        }
      } catch (e) {
        aviso('No pude comunicarme con el servidor. ¿XAMPP está encendido?', false);
      } finally {
        ocupado(boton, false);
      }
    });
  }

  FB.cuenta = { registro, ingreso, arrancar, enviar };
})();
