/* ============================================================
   IMPORTADOR DE CATÁLOGO DESDE EXCEL

   Lee un .xlsx, valida fila por fila, muestra qué cambia contra el
   catálogo actual y genera el productos.js nuevo para descargar.

   Por qué descarga un archivo en lugar de guardar solo: el sitio es
   estático, no hay servidor donde escribir. El panel arma el archivo
   y vos lo reemplazás (o lo subís al repositorio, que republica
   solo). Eso está documentado en el acta como la alternativa de
   menor costo de las tres evaluadas.
   ============================================================ */
(function () {
  'use strict';

  /* Nombres de columna aceptados. Se compara sin tildes, sin
     mayúsculas y sin espacios, así que "Precio 100 g", "precio_100g"
     y "PRECIO 100G" entran todos por el mismo lado. */
  const COLUMNAS = {
    id:          ['id', 'codigo', 'código'],
    nombre:      ['nombre', 'producto', 'descripcion', 'descripción'],
    marca:       ['marca'],
    categoria:   ['categoria', 'categoría', 'rubro'],
    sub:         ['sub', 'subcategoria', 'subcategoría'],
    tipo:        ['tipo'],
    img:         ['img', 'imagen', 'foto', 'archivo'],
    destacado:   ['destacado'],
    etiqueta:    ['etiqueta', 'cartel'],
    antes:       ['antes', 'precioanterior', 'precio anterior'],
    semana:      ['semana', 'ofertasemana', 'oferta de la semana'],
    g100:        ['precio100g', 'precio 100 g', '100g', 'preciog100'],
    media:       ['preciomedia', 'media', 'mediabarra', 'media barra'],
    kg:          ['preciokg', 'kg', 'kilo', 'preciokilo'],
    u1:          ['preciou1', 'u1', 'unidad', 'preciounidad', 'precio1'],
    u2:          ['preciou2', 'u2', 'llevando2', 'precio2'],
    u6:          ['preciou6', 'u6', 'llevando6', 'precio6']
  };

  const plano = (t) => (t === null || t === undefined ? '' : String(t))
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[\s_.-]/g, '').trim();

  /* Devuelve {campo: nombreRealDeLaColumna} mirando el encabezado. */
  function mapearColumnas(encabezados) {
    const mapa = {};
    encabezados.forEach((titulo) => {
      const t = plano(titulo);
      for (const campo in COLUMNAS) {
        if (mapa[campo]) continue;
        if (COLUMNAS[campo].some((alias) => plano(alias) === t)) { mapa[campo] = titulo; break; }
      }
    });
    return mapa;
  }

  const SI = ['si', 'sí', 'x', 'true', 'verdadero', '1'];
  const esSi = (v) => SI.includes(plano(v));

  /* Acepta 1.290, 1290, "$ 1.290,50" y 1290.5 */
  function aNumero(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    const limpio = String(v).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(limpio);
    return isFinite(n) ? n : null;
  }

  /* ---------------------------------------------------------- */
  /* Validación: devuelve {productos, errores, avisos}           */
  /* ---------------------------------------------------------- */
  function validar(filas, mapa) {
    const errores = [];
    const avisos  = [];
    const productos = [];
    const idsVistos = new Set();

    /* Los identificadores llevan guion ('de-maquina', 'sin-alcohol') y
       plano() justamente borra los guiones. Hay que comparar en plano
       y después recuperar el id real, o se descartan subcategorías
       que estaban perfectamente bien escritas. */
    const catsValidas = new Map(FB.categorias.map((c) => [plano(c.id), c.id]));
    const subsPorCat = {};
    FB.categorias.forEach((c) => {
      subsPorCat[c.id] = new Map((c.subs || []).map((s) => [plano(s.id), s.id]));
    });

    const falta = ['nombre', 'categoria', 'tipo'].filter((c) => !mapa[c]);
    if (falta.length) {
      errores.push({ fila: '—', campo: 'encabezado',
        mensaje: `Faltan columnas obligatorias: ${falta.join(', ')}.` });
      return { productos, errores, avisos };
    }

    filas.forEach((fila, i) => {
      const nro = i + 2;                       /* +2: fila 1 es el encabezado */
      const val = (campo) => mapa[campo] ? fila[mapa[campo]] : undefined;
      const err = (campo, mensaje) => errores.push({ fila: nro, campo, mensaje });

      const nombre = String(val('nombre') || '').trim();
      if (!nombre) { err('nombre', 'Está vacío.'); return; }

      const categoria = catsValidas.get(plano(val('categoria')));
      if (!categoria) {
        err('categoria', `"${val('categoria')}" no existe. Las válidas son: ${[...catsValidas.values()].join(', ')}.`);
        return;
      }

      const tipo = plano(val('tipo'));
      if (tipo !== 'fiambre' && tipo !== 'unidad') {
        err('tipo', `"${val('tipo')}" no sirve. Escribí "fiambre" (se vende por peso) o "unidad".`);
        return;
      }

      const subPedida = plano(val('sub'));
      let sub = subPedida ? subsPorCat[categoria].get(subPedida) : '';
      if (subPedida && !sub) {
        const validas = [...subsPorCat[categoria].values()];
        avisos.push({ fila: nro, campo: 'sub',
          mensaje: `"${val('sub')}" no es una subcategoría de ${categoria}` +
                   (validas.length ? ` (las válidas son: ${validas.join(', ')})` : '') +
                   `; la fila entra sin subcategoría.` });
        sub = '';
      }

      /* Precios: cada tipo tiene su trío y los tres son obligatorios,
         porque la ficha del producto los muestra a los tres. */
      const claves = tipo === 'fiambre' ? ['g100', 'media', 'kg'] : ['u1', 'u2', 'u6'];
      const precios = {};
      let precioMal = false;
      claves.forEach((k) => {
        const n = aNumero(val(k));
        if (n === null) { err(k, `Falta el precio (columna ${k}).`); precioMal = true; }
        else if (n <= 0) { err(k, `El precio tiene que ser mayor que cero.`); precioMal = true; }
        else precios[k] = Math.round(n);
      });
      if (precioMal) return;

      const producto = { nombre, categoria, tipo, precios };

      const id = String(val('id') || '').trim();
      if (id) {
        if (idsVistos.has(id)) { err('id', `El código "${id}" está repetido en el Excel.`); return; }
        idsVistos.add(id);
        producto.id = id;
      }

      const marca = String(val('marca') || '').trim();
      if (marca) producto.marca = marca; else avisos.push({ fila: nro, campo: 'marca', mensaje: 'Sin marca.' });
      if (sub) producto.sub = sub;

      const img = String(val('img') || '').trim();
      producto.img = img || null;

      if (esSi(val('destacado'))) producto.destacado = true;
      const etiqueta = String(val('etiqueta') || '').trim();
      if (etiqueta) producto.etiqueta = etiqueta;

      const antes = aNumero(val('antes'));
      if (antes !== null) {
        const vigente = tipo === 'fiambre' ? precios.g100 : precios.u1;
        if (antes <= vigente) {
          err('antes', `El precio anterior (${antes}) no puede ser menor o igual al vigente (${vigente}): no sería una oferta.`);
          return;
        }
        producto.antes = Math.round(antes);
        if (esSi(val('semana'))) producto.semana = true;
      } else if (esSi(val('semana'))) {
        avisos.push({ fila: nro, campo: 'semana',
          mensaje: 'Marcada como oferta de la semana pero sin precio anterior; no se publica como oferta.' });
      }

      productos.push(producto);
    });

    return { productos, errores, avisos };
  }

  /* ---------------------------------------------------------- */
  /* Asignación de códigos y comparación con el catálogo actual  */
  /* ---------------------------------------------------------- */
  function asignarIds(productos) {
    /* Se reservan también los códigos del catálogo actual: si no, un
       producto nuevo podía heredar el código de uno dado de baja y el
       panel lo mostraba como modificación en vez de como alta. */
    const usados = new Set([
      ...productos.filter((p) => p.id).map((p) => p.id),
      ...(FB.productos || []).map((p) => p.id)
    ]);
    let n = 1;
    productos.forEach((p) => {
      if (p.id) return;
      while (usados.has('p' + String(n).padStart(2, '0'))) n++;
      p.id = 'p' + String(n).padStart(2, '0');
      usados.add(p.id);
    });
    return productos;
  }

  /* Compara por código; si el producto no tiene código previo, por
     nombre y marca, que es como lo reconoce una persona. */
  function comparar(nuevos) {
    const actuales = FB.productos || [];
    const porId = new Map(actuales.map((p) => [p.id, p]));
    const porNombre = new Map(actuales.map((p) => [plano(p.nombre) + '|' + plano(p.marca), p]));

    const altas = [], cambios = [], iguales = [];
    const tocados = new Set();

    nuevos.forEach((p) => {
      const previo = porId.get(p.id) || porNombre.get(plano(p.nombre) + '|' + plano(p.marca));
      if (!previo) { altas.push(p); return; }
      tocados.add(previo.id);
      const difs = diferencias(previo, p);
      if (difs.length) cambios.push({ previo, nuevo: p, difs });
      else iguales.push(p);
    });

    const ausentes = actuales.filter((p) => !tocados.has(p.id) &&
      !nuevos.some((n) => n.id === p.id));

    return { altas, cambios, iguales, ausentes };
  }

  function diferencias(a, b) {
    const d = [];
    const mirar = (campo, va, vb) => {
      const na = va === undefined || va === null ? '' : String(va);
      const nb = vb === undefined || vb === null ? '' : String(vb);
      if (na !== nb) d.push({ campo, antes: na || '—', ahora: nb || '—' });
    };
    mirar('nombre', a.nombre, b.nombre);
    mirar('marca', a.marca, b.marca);
    mirar('categoría', a.categoria, b.categoria);
    mirar('subcategoría', a.sub, b.sub);
    mirar('tipo', a.tipo, b.tipo);
    mirar('foto', a.img, b.img);
    mirar('etiqueta', a.etiqueta, b.etiqueta);
    mirar('destacado', a.destacado ? 'sí' : '', b.destacado ? 'sí' : '');
    mirar('precio anterior', a.antes, b.antes);
    ['g100', 'media', 'kg', 'u1', 'u2', 'u6'].forEach((k) => {
      mirar('precio ' + k, (a.precios || {})[k], (b.precios || {})[k]);
    });
    return d;
  }

  /* ---------------------------------------------------------- */
  /* Generación del archivo                                      */
  /* ---------------------------------------------------------- */
  const comillas = (t) => "'" + String(t).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

  function aLinea(p) {
    const campos = [`id:${comillas(p.id)}`, `nombre:${comillas(p.nombre)}`];
    if (p.marca) campos.push(`marca:${comillas(p.marca)}`);
    campos.push(`categoria:${comillas(p.categoria)}`);
    if (p.sub) campos.push(`sub:${comillas(p.sub)}`);
    campos.push(`tipo:${comillas(p.tipo)}`);

    const extra = [];
    extra.push(`img:${p.img ? comillas(p.img) : 'null'}`);
    if (p.destacado) extra.push('destacado:true');
    if (p.etiqueta) extra.push(`etiqueta:${comillas(p.etiqueta)}`);
    if (p.antes) extra.push(`antes:${p.antes}`);
    if (p.semana) extra.push('semana:true');

    const claves = p.tipo === 'fiambre' ? ['g100', 'media', 'kg'] : ['u1', 'u2', 'u6'];
    const precios = claves.map((k) => `${k}:${p.precios[k]}`).join(', ');

    return `  { ${campos.join(', ')},\n    ${extra.join(', ')},\n    precios:{ ${precios} } }`;
  }

  const MARCA_INICIO = '/* === INICIO CATALOGO';
  const MARCA_FIN    = '/* === FIN CATALOGO === */';

  /* Reemplaza el bloque del catálogo dentro del productos.js real,
     dejando intacto todo lo demás: datos de la empresa, categorías,
     sucursales, horarios y funciones. */
  function generarArchivo(textoOriginal, productos) {
    const i = textoOriginal.indexOf(MARCA_INICIO);
    const j = textoOriginal.indexOf(MARCA_FIN);
    if (i === -1 || j === -1 || j < i) {
      throw new Error('No encontré las marcas INICIO/FIN CATALOGO en productos.js. ' +
                      'Si las borraste, restaurá el archivo desde el repositorio.');
    }
    const hoy = new Date().toLocaleDateString('es-AR');
    const bloque =
`/* === INICIO CATALOGO — no borres esta línea ===
   Generado por el panel de administración el ${hoy}.
   ${productos.length} productos. Para cambiarlos, importá un Excel
   nuevo desde /admin/panel.html en lugar de editar a mano. */
FB.productos = [
${productos.map(aLinea).join(',\n\n')}
];
${MARCA_FIN}`;

    return textoOriginal.slice(0, i) + bloque + textoOriginal.slice(j + MARCA_FIN.length);
  }

  /* ---------------------------------------------------------- */
  /* Plantilla en blanco                                         */
  /* ---------------------------------------------------------- */
  function plantilla() {
    /* Va el catálogo completo, no una muestra: la idea es que el
       local edite precios sobre lo que ya tiene y vuelva a subirlo. */
    const ejemplo = (FB.productos || []).map((p) => ({
      id: p.id, nombre: p.nombre, marca: p.marca || '', categoria: p.categoria,
      sub: p.sub || '', tipo: p.tipo, img: p.img || '',
      destacado: p.destacado ? 'si' : '', etiqueta: p.etiqueta || '',
      antes: p.antes || '', semana: p.semana ? 'si' : '',
      precio_100g: (p.precios || {}).g100 || '', precio_media: (p.precios || {}).media || '',
      precio_kg: (p.precios || {}).kg || '', precio_u1: (p.precios || {}).u1 || '',
      precio_u2: (p.precios || {}).u2 || '', precio_u6: (p.precios || {}).u6 || ''
    }));

    const libro = XLSX.utils.book_new();
    const hoja = XLSX.utils.json_to_sheet(ejemplo);
    hoja['!cols'] = [{ wch: 7 }, { wch: 34 }, { wch: 14 }, { wch: 13 }, { wch: 13 }, { wch: 9 },
                     { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 9 }, { wch: 8 },
                     { wch: 12 }, { wch: 13 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 11 }];
    XLSX.utils.book_append_sheet(libro, hoja, 'Productos');

    /* Segunda hoja con los valores admitidos, para no tener que
       recordarlos ni adivinarlos. */
    const ayuda = [{ columna: 'categoria', 'valores admitidos': FB.categorias.map((c) => c.id).join(', ') },
                   { columna: 'tipo', 'valores admitidos': 'fiambre (se vende por peso) | unidad' },
                   { columna: 'destacado / semana', 'valores admitidos': 'si · dejar vacío para no' },
                   { columna: 'precio_100g / media / kg', 'valores admitidos': 'solo para tipo fiambre' },
                   { columna: 'precio_u1 / u2 / u6', 'valores admitidos': 'solo para tipo unidad' },
                   { columna: 'antes', 'valores admitidos': 'precio anterior; tiene que ser mayor al vigente' }];
    FB.categorias.forEach((c) => {
      if (c.subs && c.subs.length) {
        ayuda.push({ columna: 'sub de ' + c.id, 'valores admitidos': c.subs.map((s) => s.id).join(', ') });
      }
    });
    const hojaAyuda = XLSX.utils.json_to_sheet(ayuda);
    hojaAyuda['!cols'] = [{ wch: 26 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(libro, hojaAyuda, 'Valores admitidos');
    return libro;
  }

  FB.importador = { mapearColumnas, validar, asignarIds, comparar, generarArchivo, plantilla, plano, aNumero };
})();
