/* ============================================================
   TABLERO DE INDICADORES

   Dos mitades con orígenes distintos, y conviene no confundirlas:

   · SALUD DEL CATÁLOGO: se calcula sobre los datos del propio
     sitio. Siempre está completa y es igual en cualquier
     dispositivo.

   · DEMANDA: sale del registro de uso (metricas.js), que vive en
     el navegador. Mide lo que pasó en ESTE dispositivo. El tablero
     lo aclara arriba de esa sección.

   Los gráficos son SVG escrito a mano. No se usa librería de
   gráficos: el sitio entero no tiene dependencias y meter una por
   cuatro gráficos de barras no se justifica.
   ============================================================ */
(function () {
  'use strict';

  /* Paleta validada contra el fondo crema para separación en
     daltonismo (deuteranopía y tritanopía, ΔE ≥ 18). El dorado
     queda por debajo de 3:1 de contraste, así que donde aparece
     la cifra va escrita al lado, nunca solo el color. */
  const TINTA    = '#8A4F9E';   /* serie principal */
  const DORADO   = '#E0A030';   /* segunda serie */
  const VINO     = '#C0485A';   /* tercera serie / alertas suaves */
  const TEXTO    = '#1A1625';
  const APAGADO  = '#6B6075';
  const GRILLA   = '#E8E1D8';

  const nf = new Intl.NumberFormat('es-AR');

  /* ---------------------------------------------------------- */
  /* Gráficos                                                    */
  /* ---------------------------------------------------------- */

  /* Barras verticales. datos = [{etiqueta, veces}] */
  function barrasVerticales(datos, opciones = {}) {
    const alto = opciones.alto || 190;
    const anchoBarra = opciones.anchoBarra || 26;
    const hueco = 10;                       /* ≥ 2px de aire entre barras */
    const margenAbajo = 34, margenArriba = 22;
    const ancho = Math.max(datos.length * (anchoBarra + hueco), 120);
    const tope = Math.max(1, ...datos.map((d) => d.veces));
    const zona = alto - margenAbajo - margenArriba;
    const color = opciones.color || TINTA;

    /* Con 30 barras no entran 30 fechas: se escribe una cada N y las
       demás quedan en el title del hover. Apretarlas todas no las
       hace legibles, solo las vuelve una mancha. */
    const salto = opciones.salto || Math.ceil(datos.length / 12);

    const barras = datos.map((d, i) => {
      const h = d.veces > 0 ? Math.max(3, Math.round((d.veces / tope) * zona)) : 0;
      const x = i * (anchoBarra + hueco);
      const y = margenArriba + (zona - h);
      const cifra = d.veces > 0
        ? `<text x="${x + anchoBarra / 2}" y="${y - 5}" text-anchor="middle"
                 font-size="10" fill="${APAGADO}">${nf.format(d.veces)}</text>` : '';
      const rotulo = (i % salto === 0 || datos.length <= 12)
        ? `<text x="${x + anchoBarra / 2}" y="${alto - 12}" text-anchor="middle"
                 font-size="10" fill="${APAGADO}">${d.etiqueta}</text>` : '';
      /* rx redondea las dos puntas; la base queda contra el eje
         porque el rect llega hasta la línea. */
      return `<g><title>${d.etiqueta}: ${nf.format(d.veces)}</title>
        ${cifra}
        <rect x="${x}" y="${y}" width="${anchoBarra}" height="${h}" rx="4" fill="${color}"/>
        ${rotulo}</g>`;
    }).join('');

    return `<svg class="grafico" viewBox="0 0 ${ancho} ${alto}" role="img"
                 aria-label="${opciones.titulo || 'Gráfico de barras'}">
      <line x1="0" y1="${alto - margenAbajo}" x2="${ancho}" y2="${alto - margenAbajo}"
            stroke="${GRILLA}" stroke-width="1"/>
      ${barras}</svg>`;
  }

  /* Barras horizontales, para etiquetas largas. */
  function barrasHorizontales(datos, opciones = {}) {
    if (!datos.length) return '';
    const altoFila = 26, hueco = 6, anchoEtiqueta = 190, anchoCifra = 46;
    const ancho = 560;
    const zona = ancho - anchoEtiqueta - anchoCifra;
    const tope = Math.max(1, ...datos.map((d) => d.veces));
    const color = opciones.color || TINTA;

    const filas = datos.map((d, i) => {
      const w = Math.max(3, Math.round((d.veces / tope) * zona));
      const y = i * (altoFila + hueco);
      const etiqueta = d.etiqueta.length > 32 ? d.etiqueta.slice(0, 31) + '…' : d.etiqueta;
      return `<g><title>${d.etiqueta}: ${nf.format(d.veces)}</title>
        <text x="0" y="${y + 17}" font-size="11" fill="${TEXTO}">${etiqueta}</text>
        <rect x="${anchoEtiqueta}" y="${y + 5}" width="${w}" height="15" rx="4" fill="${color}"/>
        <text x="${anchoEtiqueta + w + 8}" y="${y + 17}" font-size="11" fill="${APAGADO}">${nf.format(d.veces)}</text>
      </g>`;
    }).join('');

    return `<svg class="grafico" viewBox="0 0 ${ancho} ${datos.length * (altoFila + hueco)}"
                 role="img" aria-label="${opciones.titulo || 'Gráfico de barras'}">${filas}</svg>`;
  }

  /* Una sola barra partida en tramos. Para repartos de 2 o 3 partes. */
  function tiraSegmentada(partes) {
    const total = partes.reduce((s, p) => s + p.veces, 0);
    if (!total) return '';
    const ancho = 560, alto = 26, hueco = 2;   /* 2px de fondo entre tramos */
    const colores = [TINTA, DORADO, VINO];
    let x = 0;
    const tramos = partes.map((p, i) => {
      const w = Math.max(0, (p.veces / total) * ancho - (i < partes.length - 1 ? hueco : 0));
      const r = `<g><title>${p.etiqueta}: ${nf.format(p.veces)} (${Math.round(p.veces / total * 100)}%)</title>
        <rect x="${x}" y="0" width="${w}" height="${alto}" rx="4" fill="${colores[i % 3]}"/></g>`;
      x += w + hueco;
      return r;
    }).join('');
    return `<svg class="grafico" viewBox="0 0 ${ancho} ${alto}" role="img"
                 aria-label="Reparto">${tramos}</svg>`;
  }

  const leyenda = (partes) => `<ul class="leyenda">${partes.map((p, i) => `
    <li><span class="punto" style="background:${[TINTA, DORADO, VINO][i % 3]}"></span>
        ${p.etiqueta} <strong>${nf.format(p.veces)}</strong></li>`).join('')}</ul>`;

  /* ---------------------------------------------------------- */
  /* Salud del catálogo                                          */
  /* ---------------------------------------------------------- */
  function saludCatalogo() {
    const productos = FB.productos || [];
    const categorias = FB.categorias || [];

    const porCategoria = categorias.map((c) => ({
      id: c.id,
      etiqueta: c.nombre,
      veces: productos.filter((p) => p.categoria === c.id).length
    }));

    const conFoto = productos.filter((p) => p.img).length;
    const enOferta = productos.filter((p) => p.antes).length;
    const vacias = porCategoria.filter((c) => c.veces === 0);

    /* Precio de referencia: el de la unidad mínima de venta, que es
       con el que el cliente compara. */
    const precioRef = (p) => p.tipo === 'fiambre' ? (p.precios || {}).g100 : (p.precios || {}).u1;
    const precios = productos.map(precioRef).filter((n) => n > 0);

    return {
      total: productos.length,
      conFoto,
      sinFoto: productos.length - conFoto,
      enOferta,
      destacados: productos.filter((p) => p.destacado).length,
      categoriasConProductos: porCategoria.length - vacias.length,
      categoriasVacias: vacias,
      porCategoria,
      precioMin: precios.length ? Math.min(...precios) : 0,
      precioMax: precios.length ? Math.max(...precios) : 0,
      precioProm: precios.length ? Math.round(precios.reduce((a, b) => a + b, 0) / precios.length) : 0
    };
  }

  const nombreProducto = (id) => {
    const p = FB.porId ? FB.porId(id) : null;
    return p ? p.nombre : id;
  };

  FB.tablero = {
    saludCatalogo, barrasVerticales, barrasHorizontales, tiraSegmentada, leyenda,
    nombreProducto, colores: { TINTA, DORADO, VINO, TEXTO, APAGADO, GRILLA }, nf
  };
})();
