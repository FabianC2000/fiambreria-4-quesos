/* ============================================================
   REGISTRO DE USO

   Guarda, en el navegador del visitante, qué se buscó, qué
   categorías se miraron y qué pedidos se enviaron. Alimenta el
   tablero de /admin/tablero.html.

   LÍMITE IMPORTANTE, Y EL TABLERO LO DICE EN PANTALLA: no hay
   servidor, así que cada navegador guarda lo suyo. El tablero
   abierto en la compu del local muestra lo de esa compu, no la
   suma de todos los clientes. Para consolidar hay dos caminos:
   exportar el registro desde cada dispositivo e importarlo, o
   incorporar un servicio de datos (eso está planteado en el acta
   como alcance de la segunda etapa).
   ============================================================ */
(function () {
  'use strict';

  const CLAVE = '4q_metricas_v1';
  const TOPE  = 3000;   /* eventos; más viejos se descartan primero */

  function leerCrudo() {
    const guardado = FB.leer(CLAVE, null);
    return Array.isArray(guardado) ? guardado : [];
  }

  /* Un evento es {t: fecha ISO corta, e: tipo, ...datos}. Se escribe
     corto a propósito: localStorage tiene unos pocos MB y esto
     convive con el carrito. */
  function registrar(tipo, datos) {
    try {
      const eventos = leerCrudo();
      eventos.push(Object.assign({ t: Date.now(), e: tipo }, datos || {}));
      /* Se recorta desde el principio: interesa lo reciente. */
      FB.guardar(CLAVE, eventos.length > TOPE ? eventos.slice(-TOPE) : eventos);
    } catch (e) {
      /* Si el almacenamiento está lleno o bloqueado, el sitio sigue
         andando sin registrar. Nunca romper la navegación por esto. */
    }
  }

  const DIA = 24 * 60 * 60 * 1000;

  function enRango(eventos, dias) {
    if (!dias) return eventos;
    const desde = Date.now() - dias * DIA;
    return eventos.filter((v) => v.t >= desde);
  }

  function contar(lista, clave) {
    const mapa = new Map();
    lista.forEach((v) => {
      const k = clave(v);
      if (k === undefined || k === null || k === '') return;
      mapa.set(k, (mapa.get(k) || 0) + 1);
    });
    return [...mapa.entries()]
      .map(([valor, veces]) => ({ valor, veces }))
      .sort((a, b) => b.veces - a.veces);
  }

  /* Resumen listo para el tablero. dias = null significa todo. */
  function resumen(dias) {
    const todo = leerCrudo();
    const ev = enRango(todo, dias);

    const pedidos   = ev.filter((v) => v.e === 'pedido');
    const busquedas = ev.filter((v) => v.e === 'busqueda');
    const vistas    = ev.filter((v) => v.e === 'categoria');

    /* Productos pedidos: un pedido lleva varios renglones. */
    const porProducto = new Map();
    pedidos.forEach((p) => {
      (p.items || []).forEach((it) => {
        const actual = porProducto.get(it.id) || { id: it.id, veces: 0, unidades: 0 };
        actual.veces += 1;
        actual.unidades += it.cant || 1;
        porProducto.set(it.id, actual);
      });
    });

    /* Pedidos por día, con los días sin pedidos en cero: una serie
       con huecos miente sobre el ritmo real. */
    const porDia = [];
    const ventana = dias || 30;
    for (let i = ventana - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * DIA);
      const etiqueta = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const desde = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      porDia.push({
        etiqueta,
        veces: pedidos.filter((p) => p.t >= desde && p.t < desde + DIA).length
      });
    }

    const montos = pedidos.map((p) => p.total || 0).filter((n) => n > 0);

    return {
      totalEventos: todo.length,
      desde: todo.length ? todo[0].t : null,
      pedidos: pedidos.length,
      unidadesPedidas: pedidos.reduce(
        (s, p) => s + (p.items || []).reduce((x, it) => x + (it.cant || 1), 0), 0),
      ticketPromedio: montos.length
        ? Math.round(montos.reduce((a, b) => a + b, 0) / montos.length) : 0,
      porDia,
      productos: [...porProducto.values()].sort((a, b) => b.veces - a.veces),
      categorias: contar(vistas, (v) => v.c),
      sucursales: contar(pedidos, (p) => p.suc),
      busquedas: busquedas.length,
      sinResultado: contar(busquedas.filter((b) => b.n === 0), (b) => b.q),
      porHora: Array.from({ length: 24 }, (_, h) => ({
        etiqueta: String(h).padStart(2, '0'),
        veces: pedidos.filter((p) => new Date(p.t).getHours() === h).length
      }))
    };
  }

  function exportar() {
    return JSON.stringify({
      version: 1,
      generado: new Date().toISOString(),
      eventos: leerCrudo()
    }, null, 1);
  }

  /* Suma los eventos de otro dispositivo sin pisar los propios.
     Se descartan los repetidos exactos para que importar dos veces
     el mismo archivo no duplique los números. */
  function importar(texto) {
    let datos;
    try { datos = JSON.parse(texto); }
    catch (e) { return { ok: false, error: 'El archivo no es un JSON válido.' }; }
    if (!datos || !Array.isArray(datos.eventos)) {
      return { ok: false, error: 'El archivo no tiene una lista de eventos.' };
    }
    const propios = leerCrudo();
    const huella = (v) => JSON.stringify(v);
    const vistos = new Set(propios.map(huella));
    const nuevos = datos.eventos.filter((v) => v && v.t && !vistos.has(huella(v)));
    const unidos = propios.concat(nuevos).sort((a, b) => a.t - b.t);
    FB.guardar(CLAVE, unidos.length > TOPE ? unidos.slice(-TOPE) : unidos);
    return { ok: true, agregados: nuevos.length, repetidos: datos.eventos.length - nuevos.length };
  }

  function limpiar() { FB.guardar(CLAVE, []); }

  FB.metricas = { registrar, leer: leerCrudo, resumen, exportar, importar, limpiar };
})();
