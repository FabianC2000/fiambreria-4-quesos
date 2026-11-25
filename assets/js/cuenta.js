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
  function nota(texto, bien) {
    const caja = $('nota');
    if (!caja) return;
    caja.hidden = false;
    caja.className = 'nota ' + (bien ? 'nota-bien' : 'nota-mal');
    caja.innerHTML = texto;

    /* Que se vea entero, no solo el borde de arriba.

       Acá había un error: scrollIntoView con block:'nearest' no
       mueve nada si el borde superior de la nota ya está a la vista,
       aunque el resto quede abajo del pliegue. En una pantalla de
       portátil eso dejaba el botón de "reenviarme el correo"
       invisible: la nota aparecía, pero lo único que había que
       apretar estaba fuera de la ventana y nada indicaba que
       siguiera para abajo.

       Así que se mide y se corre lo justo: nunca tanto como para
       que se pierda el principio de la nota. */
    const r = caja.getBoundingClientRect();
    const sobra = r.bottom + 16 - window.innerHeight;
    if (sobra > 0) {
      const correr = Math.min(sobra, Math.max(r.top - 8, 0));
      if (correr > 0) {
        const quieto = window.matchMedia &&
                       window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollBy({ top: correr, behavior: quieto ? 'auto' : 'smooth' });
      }
    }
  }

  function limpiarErrores(campos) {
    campos.forEach((c) => {
      const e = $('e-' + c), i = $(c);
      if (e) { e.hidden = true; e.textContent = ''; }
      if (i) i.removeAttribute('aria-invalid');
    });
    const caja = $('nota');
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
      if (!e) nota(mensaje, false);
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
      nota('<p><strong>Esta pantalla necesita el servidor.</strong></p>' +
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

  /* Medidor de contraseña: cuenta largo y variedad. Es una ayuda
     visual, no una validación; quien valida es el servidor. */
  function medidor(clave, barra) {
    if (!clave || !barra) return;
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

  /* Aviso que solo aparece con 'depurar' activado: el correo no sale
     de la máquina, así que el enlace se muestra para poder seguir
     probando el circuito completo. */
  function bloqueDesarrollo(enlace, texto) {
    return '<p style="margin-top:12px;padding-top:12px;border-top:1px solid #BFE0CB">' +
           '<strong>Modo desarrollo:</strong> el correo quedó guardado en ' +
           '<code>almacen/correos/</code>. Enlace directo: ' +
           '<a href="' + enlace + '">' + texto + '</a></p>';
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
      nota('Ya tenés la sesión abierta como <strong>' +
            estado.cliente.nombre + '</strong>. <a href="../index.html">Ir al sitio</a>', true);
      form.hidden = true;
      return;
    }

    medidor($('clave'), $('fuerza'));

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
          if (r.correo_enviado === false) {
            texto = '<p><strong>Tu cuenta quedó creada</strong>, pero no pudimos ' +
                    'mandarte el correo de confirmación.</p>' +
                    '<p>Podés <a href="olvide.html?reenviar=1">pedirlo de nuevo</a> ' +
                    'en un rato.</p>';
          }
          if (r.enlace_verificacion) {
            texto += bloqueDesarrollo(r.enlace_verificacion, 'confirmar ahora');
          }
          nota(texto, true);
        } else if (r.errores) {
          marcarErrores(r.errores);
        } else {
          nota(r.error || 'No pude crear la cuenta. Probá de nuevo.', false);
        }
      } catch (e) {
        nota('No pude comunicarme con el servidor. ¿XAMPP está encendido?', false);
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
      nota('Ya estás dentro como <strong>' + estado.cliente.nombre +
            '</strong>. <a href="../index.html">Ir al sitio</a>', true);
      form.hidden = true;
      return;
    }

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      limpiarErrores(['correo', 'clave']);

      const datos = { correo: $('correo').value.trim(), clave: $('clave').value };
      if (!datos.correo || !datos.clave) {
        nota('Completá el correo y la contraseña.', false);
        return;
      }

      const boton = $('btn-entrar');
      ocupado(boton, true, 'Entrando…');
      try {
        const { datos: r } = await enviar('ingresar.php', datos);
        if (r.ok) {
          nota('Hola ' + r.cliente.nombre + '. Entrando…', true);
          setTimeout(() => { location.href = FB.ruta('index.html'); }, 700);
        } else if (r.verificar) {
          /* Falta confirmar el correo. El botón de reenvío va acá
             mismo, con la dirección que ya escribió: mandarla por la
             URL a otra pantalla sería pasear un dato personal por la
             barra de direcciones y el historial sin necesidad. */
          nota('<p>' + (r.error || 'Todavía no confirmaste tu correo.') + '</p>' +
                '<p><button type="button" class="btn btn-linea" id="btn-reenviar">' +
                'Reenviarme el correo de confirmación</button></p>', false);
          const re = $('btn-reenviar');
          if (re) {
            re.addEventListener('click', async () => {
              ocupado(re, true, 'Mandando…');
              try {
                const { datos: rr } = await enviar('reenviar.php', { correo: datos.correo });
                let t = '<p>' + (rr.mensaje || 'Listo.') + '</p>';
                if (rr.enlace_verificacion) {
                  t += bloqueDesarrollo(rr.enlace_verificacion, 'confirmar ahora');
                }
                nota(t, true);
              } catch (e) {
                nota('No pude comunicarme con el servidor.', false);
              }
            });
          }
        } else {
          nota(r.error || 'No pude iniciar sesión.', false);
          $('clave').value = '';
          $('clave').focus();
        }
      } catch (e) {
        nota('No pude comunicarme con el servidor. ¿XAMPP está encendido?', false);
      } finally {
        ocupado(boton, false);
      }
    });
  }

  /* ---------------------------------------------------------- */
  /* Pedir contraseña nueva  /  reenviar la confirmación         */
  /*                                                             */
  /* Las dos cosas son el mismo formulario —una dirección y un    */
  /* botón— y el mismo resultado: un correo con un enlace. Están  */
  /* en una pantalla con dos modos en vez de dos pantallas casi   */
  /* idénticas.                                                   */
  /* ---------------------------------------------------------- */
  async function olvido() {
    const estado = await arrancar();
    const form = $('form-olvide');
    if (!form) return;
    if (!estado) { form.querySelector('button').disabled = true; return; }

    const textos = {
      clave: {
        titulo: 'Recuperar la contraseña',
        entrada: 'Escribí tu correo y te mandamos un enlace para elegir una nueva.',
        boton: 'Mandarme el enlace',
        archivo: 'olvide.php',
        otro: '¿No te llegó el correo para confirmar tu cuenta? <a href="#" data-modo="verificar">Pedilo de nuevo</a>',
        enlace: 'enlace_recuperacion',
        textoEnlace: 'elegir la contraseña ahora'
      },
      verificar: {
        titulo: 'Reenviar la confirmación',
        entrada: 'Escribí tu correo y te mandamos otra vez el enlace para confirmar la cuenta.',
        boton: 'Reenviarme el correo',
        archivo: 'reenviar.php',
        otro: '¿Te olvidaste la contraseña? <a href="#" data-modo="clave">Recuperala acá</a>',
        enlace: 'enlace_verificacion',
        textoEnlace: 'confirmar ahora'
      }
    };

    let modo = new URLSearchParams(location.search).get('reenviar') ? 'verificar' : 'clave';

    function pintar() {
      const t = textos[modo];
      document.title = t.titulo + ' — Fiambrería 4 Quesos';
      $('titulo').textContent = t.titulo;
      $('entrada').textContent = t.entrada;
      $('btn-pedir').textContent = t.boton;
      $('otro-modo').innerHTML = t.otro;
      $('otro-modo').querySelector('a').addEventListener('click', (ev) => {
        ev.preventDefault();
        modo = ev.target.dataset.modo;
        limpiarErrores(['correo']);
        pintar();
        $('correo').focus();
      });
    }
    pintar();

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      limpiarErrores(['correo']);

      const correo = $('correo').value.trim();
      if (!correo) {
        marcarErrores({ correo: 'Escribí tu correo.' });
        return;
      }

      const t = textos[modo];
      const boton = $('btn-pedir');
      ocupado(boton, true, 'Mandando…');
      try {
        const { datos: r } = await enviar(t.archivo, { correo });
        if (r.ok) {
          form.hidden = true;
          $('otro-modo').hidden = true;
          let texto = '<p><strong>Listo.</strong></p><p>' + (r.mensaje || '') + '</p>';
          if (r[t.enlace]) {
            texto += bloqueDesarrollo(r[t.enlace], t.textoEnlace);
          }
          nota(texto, true);
        } else if (r.errores) {
          marcarErrores(r.errores);
        } else {
          nota(r.error || 'No pude procesar el pedido. Probá de nuevo.', false);
        }
      } catch (e) {
        nota('No pude comunicarme con el servidor. ¿XAMPP está encendido?', false);
      } finally {
        ocupado(boton, false);
      }
    });
  }

  /* ---------------------------------------------------------- */
  /* Elegir la contraseña nueva                                  */
  /* ---------------------------------------------------------- */
  async function restablecer() {
    const estado = await arrancar();
    const form = $('form-restablecer');
    if (!form) return;
    if (!estado) { form.querySelector('button').disabled = true; return; }

    /* El token queda en la dirección a propósito. Se podría borrar
       de la barra con history.replaceState, pero entonces recargar
       la página rompería el enlace, y la página no carga nada de
       afuera, así que no hay a quién filtrárselo por el Referer.
       Vence en dos horas y se usa una sola vez. */
    const token = new URLSearchParams(location.search).get('t') || '';

    function sinEnlace(texto) {
      form.hidden = true;
      nota('<p>' + texto + '</p>' +
            '<p><a href="olvide.html">Pedir un enlace nuevo</a></p>', false);
    }

    if (!token) {
      sinEnlace('Este enlace está incompleto. Copialo entero desde el correo, ' +
                'o pedí uno nuevo.');
      return;
    }

    /* Se pregunta primero si el enlace todavía sirve: es desalentador
       escribir la contraseña dos veces y recién entonces enterarse
       de que venció. Preguntar no lo gasta. */
    try {
      const r = await fetch(api('restablecer.php') + '?t=' + encodeURIComponent(token),
                            { credentials: 'same-origin', cache: 'no-store' });
      const d = await r.json();
      if (!d.valido) {
        sinEnlace('Este enlace ya no sirve: vence a las 2 horas y se puede usar ' +
                  'una sola vez.');
        return;
      }
      $('para-quien').textContent = 'Vas a cambiar la contraseña de ' + d.correo + '.';
    } catch (e) {
      nota('No pude verificar el enlace. ¿XAMPP está encendido?', false);
      return;
    }

    medidor($('clave'), $('fuerza'));

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      limpiarErrores(['clave', 'repetir']);

      const clave = $('clave').value;
      const repetir = $('repetir').value;

      /* Acá sí se pide dos veces, a diferencia del registro: el
         token se gasta al usarlo, así que un error de tecleo
         obligaría a pedir otro correo y esperarlo de nuevo. */
      if (clave !== repetir) {
        marcarErrores({ repetir: 'Las dos contraseñas no son iguales.' });
        return;
      }

      const boton = $('btn-cambiar');
      ocupado(boton, true, 'Guardando…');
      try {
        const { datos: r } = await enviar('restablecer.php', { t: token, clave });
        if (r.ok) {
          form.hidden = true;
          nota('<p><strong>' + (r.mensaje || 'Listo.') + '</strong></p>' +
                '<p>Entrando a la pantalla de ingreso…</p>', true);
          setTimeout(() => { location.href = 'ingresar.html'; }, 1500);
        } else if (r.errores) {
          marcarErrores(r.errores);
        } else if (r.vencido) {
          sinEnlace(r.error || 'Este enlace ya no sirve.');
        } else {
          nota(r.error || 'No pude cambiar la contraseña.', false);
        }
      } catch (e) {
        nota('No pude comunicarme con el servidor. ¿XAMPP está encendido?', false);
      } finally {
        ocupado(boton, false);
      }
    });
  }

  FB.cuenta = { registro, ingreso, olvido, restablecer, arrancar, enviar };
})();
