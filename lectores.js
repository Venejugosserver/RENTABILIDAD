/*!
 * VENEJUGOS 2015, tablero comercial.
 * Copyright (c) 2026 DISTRIBUIDORA VENEJUGOS 2015, C.A. Todos los derechos reservados.
 * Uso interno exclusivo. Prohibida su copia, distribucion o modificacion sin autorizacion escrita.
 *
 * Lector compartido. Se usa en el hilo principal y dentro de lector-worker.js.
 * Solo lee las columnas necesarias: RIF, cedulas y direcciones se descartan al leer.
 */
(function (raiz) {
  'use strict';

  /* ---------- Alias de columnas (encabezados normalizados, en orden de preferencia) ---------- */
  // Los alias de MobilVendor van al final de cada lista para no cambiar lo que ya se elige en la dinámica y en Módulo B.
  var ESQUEMAS = {
    ventas: {
      cod: ['alterno', 'codigo producto', 'cod producto', 'codigo articulo', 'articulo', 'codigo', 'sku', 'codprod', 'codproducto'],
      codAlt: ['codprod'],
      nombre: ['producto', 'descripcion', 'nombre producto', 'descripcion producto', 'productos', 'nombre del producto', 'descrproducto'],
      // Primero: el Costo de MobilVendor es por unidad de inventario, no por display o bulto.
      cant: ['cantidadenunidadinventario', 'venta neta', 'cantidad neta', 'unidades netas', 'cantidad', 'unidades', 'cant'],
      venta: ['total venta dolar', 'total venta usd', 'total usd', 'monto usd', 'venta usd', 'total venta', 'subtotal', 'total', 'monto', 'preciototal'],
      cu: ['costo dolar', 'costo usd', 'costo unitario usd', 'costo unitario', 'costo unit', 'costo'],
      precio: ['precio dolar oferta', 'precio neto', 'precio dolar', 'precio usd', 'precio unitario', 'precio'],
      // Primero: en MobilVendor «Descuento» es un monto y «Descuento, %» el porcentaje.
      desc: ['descuento %', 'descuento', '% descuento', 'porcentaje descuento', 'desc'],
      fecha: ['fecha', 'fecha factura', 'fechafact', 'fecha documento', 'fecha de venta', 'fechafactura'],
      doc: ['documento', 'factura', 'nro documento', 'numero documento', 'n documento', 'numero factura', 'nro factura', 'numerofactura'],
      cli: ['codclie', 'codigo cliente', 'cod cliente', 'codigocliente'],
      cliN: ['nomclie', 'cliente', 'nombre cliente', 'razon social', 'razonsocial'],
      ven: ['nomvend', 'vendedor', 'asesor', 'asesor actual', 'nombre vendedor', 'nombrevend'],
      ruta: ['ruta', 'codruta', 'cod ruta', 'ruta de documento'],
      seg: ['segmento', 'tipo de cliente', 'tipo cliente', 'nombsubcanal'],
      canal: ['canal', 'nombcanal'],
      linea: ['linea', 'lineas', 'linea de negocio', 'descrcategoria'],
      sub: ['sublinea', 'sub linea', 'descrsubcategoria'],
      marca: ['marca', 'descrmarca'],
      un: ['unidad negocio', 'unidad de negocio', 'proveedor', 'descrtipoinv'],
      unidad: ['unidad', 'und', 'unidad de medida'],
      modulo: ['modulos', 'modulo'],
      tipo: ['tipovta', 'tipo venta', 'tipo de venta'],
      // Solo MobilVendor: unidades de inventario por unidad de venta (display = 18, bulto = 20...).
      factor: ['unidadfactor']
    },
    inventario: {
      cod: ['codigo', 'cod', 'codigo producto', 'articulo', 'sku', 'alterno'],
      nombre: ['productos', 'producto', 'descripcion', 'nombre', 'descripcion producto'],
      stock: ['stock', 'existencia', 'existencias', 'disponible', 'cantidad'],
      precio: ['precio', 'precio usd', 'precio dolar', 'pvp', 'precio de venta'],
      costo: ['costo', 'costo usd', 'costo dolar', 'costo unitario'],
      modulo: ['modulo', 'modulos', 'almacen', 'deposito'],
      unidad: ['unidad', 'und', 'unidad de medida'],
      un: ['unidad de negocio', 'unidad negocio', 'marca', 'proveedor'],
      sub: ['sublinea', 'sub linea', 'subcategoria'],
      linea: ['lineas', 'linea', 'linea de negocio'],
      categoria: ['categorias', 'categoria'],
      estatus: ['estatus', 'estado', 'status'],
      impuesto: ['impuesto', 'iva'],
      venc: ['vencimiento', 'fecha de vencimiento', 'fecha vencimiento', 'vence', 'f vencimiento', 'caducidad', 'fecha de caducidad'],
      lote: ['lote', 'nro lote', 'numero de lote']
    },
    rentMV: {
      cod: ['articulo', 'codigo'],
      nombre: ['descripcion', 'producto', 'productos'],
      cant: ['cantidad'],
      costo: ['costo', 'costo total'],
      venta: ['subtotal', 'venta', 'total venta'],
      margen: ['margen bruto', 'utilidad'],
      mpct: ['margen bruto %', '% margen bruto']
    },
    rentB: {
      cod: ['codigo'],
      nombre: ['productos', 'producto', 'descripcion'],
      cant: ['cantidad'],
      costo: ['total costo / total costo', 'total costo', 'costo total', 'costo'],
      venta: ['total venta', 'venta total'],
      margen: ['utilidad'],
      mpct: ['%utilidad', '% utilidad']
    }
  };

  var REQUERIDOS = {
    ventas: [['cod', 'nombre'], ['cant'], ['venta', 'precio']],
    inventario: [['nombre'], ['stock']],
    rentMV: [['cod'], ['nombre'], ['cant'], ['costo'], ['venta']],
    rentB: [['cod'], ['nombre'], ['costo'], ['venta']]
  };

  var NUMERICOS = { cant: 1, venta: 1, cu: 1, precio: 1, desc: 1, stock: 1, costo: 1, margen: 1, mpct: 1, impuesto: 1, factor: 1 };

  var NOMBRES_CAMPO = {
    cod: 'código', nombre: 'descripción del producto', cant: 'cantidad', venta: 'total de venta',
    cu: 'costo unitario', precio: 'precio', stock: 'stock', costo: 'costo', margen: 'margen'
  };

  /* ---------- Utilidades de texto y números ---------- */
  function sinTildes(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

  function normEnc(s) {
    if (s == null) return '';
    return sinTildes(s).toLowerCase()
      .replace(/[_\.\-:,]+/g, ' ')
      .replace(/[^a-z0-9%\/ ]+/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function texto(v) {
    if (v == null) return '';
    if (typeof v === 'number') return isFinite(v) ? String(v) : '';
    return String(v).replace(/\s+/g, ' ').trim();
  }

  var VACIOS = { '': 1, '0': 1, 'NO APLICA': 1, 'POR ASIGNAR': 1, '#N/A': 1, 'N/A': 1, '-': 1, 'NULL': 1, 'SIN LINEA': 1, 'SIN LÍNEA': 1 };
  function textoUtil(v) {
    var t = texto(v);
    return VACIOS[t.toUpperCase()] ? '' : t;
  }

  function normCod(v) {
    var s = texto(v).toUpperCase().replace(/\s+/g, '');
    if (/^\d+(\.0+)?$/.test(s)) s = s.replace(/\.0+$/, '').replace(/^0+(?=\d)/, '');
    return s;
  }
  function baseCod(c) { return c.replace(/-1$/, ''); }

  function normNombre(v) {
    return sinTildes(texto(v)).toUpperCase().replace(/[®™©]/g, '').replace(/\s+/g, ' ').trim();
  }

  // Clave de agrupación tolerante: sin tildes y sin "S" final en cada palabra (TABACOS = TABACO).
  function claveGrupo(v) {
    var t = normNombre(v);
    if (!t) return '';
    return t.split(' ').map(function (p) { return p.length > 3 ? p.replace(/S$/, '') : p; }).join(' ');
  }

  function num(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'boolean') return null;
    var s = String(v).trim().replace(/\s|US\$|\$|Bs\.?/gi, '');
    if (!s || /^#/.test(s)) return null;
    var neg = /^\(.*\)$/.test(s);
    if (neg) s = s.slice(1, -1);
    var c = s.lastIndexOf(','), p = s.lastIndexOf('.');
    if (c > -1 && p > -1) {
      if (c > p) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (c > -1) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if ((s.match(/\./g) || []).length > 1) {
      s = s.replace(/\./g, '');
    }
    s = s.replace('%', '');
    var n = parseFloat(s);
    if (!isFinite(n)) return null;
    return neg ? -n : n;
  }

  function dos(n) { return (n < 10 ? '0' : '') + n; }

  // Devuelve 'AAAA-MM-DD' o ''.
  function fecha(v, f1904) {
    if (v == null || v === '') return '';
    if (typeof v === 'number' && isFinite(v) && v > 59 && v < 80000) {
      var dias = Math.floor(v) + (f1904 ? 1462 : 0);
      var d = new Date(Math.round((dias - 25569) * 86400000));
      return d.getUTCFullYear() + '-' + dos(d.getUTCMonth() + 1) + '-' + dos(d.getUTCDate());
    }
    if (v instanceof Date && !isNaN(v)) {
      return v.getUTCFullYear() + '-' + dos(v.getUTCMonth() + 1) + '-' + dos(v.getUTCDate());
    }
    var s = String(v).trim();
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return m[1] + '-' + dos(+m[2]) + '-' + dos(+m[3]);
    m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (m) {
      var a = +m[3]; if (a < 100) a += 2000;
      return a + '-' + dos(+m[2]) + '-' + dos(+m[1]);
    }
    return '';
  }

  function normModulo(v) {
    var t = normEnc(v);
    if (!t) return '';
    if (t.indexOf('ambos') > -1) return 'ambos';
    if (t.indexOf('mobil') > -1) return 'mv';
    if (t === 'b' || t.indexOf('modulo b') > -1 || t === 'mod b') return 'mb';
    return '';
  }

  /* ---------- Lectura de libros ---------- */
  function leerLibro(XLSX, datos) {
    return XLSX.read(datos, {
      type: 'array', dense: true, cellDates: false, cellNF: false, cellText: false,
      cellFormula: false, cellHTML: false, cellStyles: false
    });
  }

  function filasHoja(XLSX, ws, max) {
    var op = { header: 1, raw: true, defval: null, blankrows: false };
    if (!ws || !ws['!ref']) return [];
    if (max) {
      var rg = XLSX.utils.decode_range(ws['!ref']);
      rg.e.r = Math.min(rg.e.r, rg.s.r + max - 1);
      op.range = rg;
    }
    return XLSX.utils.sheet_to_json(ws, op);
  }

  function es1904(wb) { return !!(wb && wb.Workbook && wb.Workbook.WBProps && wb.Workbook.WBProps.date1904); }

  /* ---------- Detección de encabezados ---------- */
  function mapearFila(fila, campos) {
    var enc = (fila || []).map(normEnc);
    var mapa = {}, n = 0;
    Object.keys(campos).forEach(function (campo) {
      var alias = campos[campo];
      for (var a = 0; a < alias.length; a++) {
        var idx = [];
        for (var i = 0; i < enc.length; i++) if (enc[i] === alias[a]) idx.push(i);
        if (idx.length) { mapa[campo] = idx; n++; break; }
      }
    });
    return { mapa: mapa, n: n, enc: enc };
  }

  function cumple(mapa, req) {
    return req.every(function (grupo) { return grupo.some(function (c) { return mapa[c]; }); });
  }

  // Reporte general de ventas de MobilVendor (hoja «Ventas»): columnas que ningún otro formato trae juntas.
  function esMobilVendor(enc) {
    return enc.indexOf('codproducto') > -1 && enc.indexOf('descrproducto') > -1 && enc.indexOf('preciototal') > -1;
  }

  function firma(esquema, enc) {
    var tiene = function (t) { return enc.indexOf(t) > -1; };
    if (esquema === 'ventas') return (tiene('venta neta') || tiene('nomclie') || (tiene('documento') && tiene('fecha')) || esMobilVendor(enc)) ? 6 : 0;
    if (esquema === 'inventario') return (tiene('stock') || tiene('existencia') || tiene('existencias')) ? 6 : 0;
    if (esquema === 'rentMV') return (tiene('margen bruto') && tiene('subtotal')) ? 6 : 0;
    if (esquema === 'rentB') return (tiene('utilidad') || tiene('%utilidad')) && tiene('total venta') ? 6 : 0;
    return 0;
  }

  // Busca la mejor combinación hoja + fila de encabezado + esquema.
  function detectar(XLSX, wb, esquemas) {
    var mejor = null;
    var nombres = wb.SheetNames.slice();
    nombres.forEach(function (nombreHoja, orden) {
      var muestra = filasHoja(XLSX, wb.Sheets[nombreHoja], 45);
      esquemas.forEach(function (esq) {
        for (var r = 0; r < muestra.length; r++) {
          var m = mapearFila(muestra[r], ESQUEMAS[esq]);
          if (m.n < 2 || !cumple(m.mapa, REQUERIDOS[esq])) continue;
          var puntos = m.n + firma(esq, m.enc);
          var hn = normEnc(nombreHoja);
          if (esq === 'inventario' && hn === 'inventario') puntos += 4;
          if (esq === 'ventas' && hn.indexOf('dinamica') > -1) puntos += 2;
          puntos -= orden * 0.01;
          if (!mejor || puntos > mejor.puntos) {
            mejor = { hoja: nombreHoja, fila: r, esquema: esq, puntos: puntos, mapa: m.mapa, enc: m.enc };
          }
        }
      });
    });
    return mejor;
  }

  // Elige, entre columnas repetidas, la más llena; corrige columnas corridas por celdas combinadas.
  function afinarMapa(filas, h, mapa, enc) {
    var desde = h + 1, hasta = Math.min(filas.length, h + 400);
    function llenado(i, numerico) {
      var n = 0, t = 0;
      for (var r = desde; r < hasta; r++) {
        var f = filas[r]; if (!f) continue;
        t++;
        var v = f[i];
        if (numerico) { if (num(v) != null) n++; }
        else { var s = texto(v); if (s && s !== '0' && s !== '#N/A') n++; }
      }
      return t ? n / t : 0;
    }
    var final = {};
    Object.keys(mapa).forEach(function (campo) {
      var idx = mapa[campo], numerico = !!NUMERICOS[campo];
      var elegido = idx[idx.length - 1], mejor = -1;
      idx.forEach(function (i) {
        var l = llenado(i, numerico);
        if (l > mejor + 0.02) { mejor = l; elegido = i; }
        else if (Math.abs(l - mejor) <= 0.02) { elegido = i; }
      });
      if (numerico && mejor < 0.2) {
        [elegido - 1, elegido + 1].forEach(function (v) {
          if (v >= 0 && !enc[v] && llenado(v, true) >= 0.6 && mejor < 0.2) { elegido = v; mejor = 1; }
        });
      }
      final[campo] = elegido;
    });
    return final;
  }

  function faltantes(mapa, campos) {
    return campos.filter(function (c) { return mapa[c] == null; });
  }

  /* ---------- Inventario ---------- */
  function leerInventario(filas, h, mapa, f1904) {
    var g = function (f, c) { var i = mapa[c]; return i == null ? null : f[i]; };
    var items = [], omitidas = 0;
    for (var r = h + 1; r < filas.length; r++) {
      var f = filas[r]; if (!f) continue;
      var nombre = texto(g(f, 'nombre'));
      var cod = normCod(g(f, 'cod'));
      var stock = num(g(f, 'stock'));
      var precio = num(g(f, 'precio'));
      var costo = num(g(f, 'costo'));
      if (!nombre && !cod) continue;
      if (stock == null && precio == null && costo == null) { omitidas++; continue; }
      if (normEnc(nombre) === 'productos' || normEnc(nombre) === 'producto') continue;
      var estatus = texto(g(f, 'estatus'));
      items.push({
        mod: normModulo(g(f, 'modulo')),
        cod: texto(g(f, 'cod')),
        codN: cod,
        codB: baseCod(cod),
        nombre: nombre,
        nombreN: normNombre(nombre),
        unidad: texto(g(f, 'unidad')),
        stock: stock == null ? 0 : stock,
        precio: precio,
        costo: costo,
        un: textoUtil(g(f, 'un')),
        sub: textoUtil(g(f, 'sub')),
        linea: textoUtil(g(f, 'linea')),
        categoria: textoUtil(g(f, 'categoria')),
        activo: !/inactiv/i.test(estatus),
        impuesto: num(g(f, 'impuesto')),
        venc: mapa.venc != null ? fecha(g(f, 'venc'), f1904) : '',
        lote: texto(g(f, 'lote'))
      });
    }
    return { items: items, omitidas: omitidas, tieneVenc: mapa.venc != null, tieneCosto: mapa.costo != null };
  }

  /* ---------- Rentabilidad ---------- */
  function preambulo(filas, h) {
    var info = { desde: '', hasta: '', emitido: '', empresa: '' };
    for (var r = 0; r <= Math.min(h, 40); r++) {
      var f = filas[r] || [];
      var unido = f.map(texto).filter(Boolean).join(' ');
      if (!unido) continue;
      var bajo = sinTildes(unido).toLowerCase();
      var fechas = unido.match(/\d{1,2}\/\d{1,2}\/\d{4}/g) || [];
      if (fechas.length) {
        if (/desde|inicio/.test(bajo)) {
          info.desde = fecha(fechas[0]);
          if (/hasta|final/.test(bajo) && fechas[1]) info.hasta = fecha(fechas[1]);
        } else if (/hasta|finaliz/.test(bajo)) {
          info.hasta = fecha(fechas[fechas.length - 1]);
        } else if (/fecha|salida/.test(bajo) && !info.emitido) {
          info.emitido = fecha(fechas[0]);
        }
      }
      if (!info.empresa) {
        var nom = unido.match(/(?:nombre:\s*)?(DISTRIBUIDORA[^\n]{3,60}?(?:C\.? ?A\.?|S\.? ?A\.?))(?:\s|$)/i);
        if (nom) info.empresa = nom[1].replace(/\s+/g, ' ').trim();
      }
    }
    return info;
  }

  function tipoRent(nombre, cant, costo, venta) {
    var n = normNombre(nombre);
    if (/DESCUENTO|DIFERENCIA DE PRECIO|NOTA DE CREDITO|AJUSTE|REDONDEO/.test(n)) return 'ajuste';
    if ((costo || 0) === 0 && (venta || 0) === 0) return 'bonificacion';
    if ((costo || 0) === 0 && (venta || 0) > 0) return 'sincosto';
    if ((venta || 0) <= 0 || (cant || 0) <= 0) return 'devolucion';
    return 'producto';
  }

  function leerRentabilidad(filas, h, mapa, esquema, modulo) {
    var g = function (f, c) { var i = mapa[c]; return i == null ? null : f[i]; };
    var items = [], pendientes = [], totales = null, grupos = {};
    for (var r = h + 1; r < filas.length; r++) {
      var f = filas[r]; if (!f) continue;
      var celdas = f.map(texto);
      var unido = celdas.filter(Boolean).join(' ');
      if (!unido) continue;
      var bajo = sinTildes(unido).toLowerCase();
      if (/^total por/.test(bajo)) {
        var etiqueta = '';
        for (var k = 0; k < celdas.length; k++) {
          if (celdas[k] && !/^total por/i.test(sinTildes(celdas[k]))) { etiqueta = celdas[k]; break; }
        }
        pendientes.forEach(function (it) { it.grupo = etiqueta; });
        if (etiqueta) grupos[etiqueta] = (grupos[etiqueta] || 0) + pendientes.length;
        pendientes = [];
        continue;
      }
      if (/total ventas del periodo/.test(bajo) || normEnc(celdas[mapa.cod] || '') === 'total') {
        totales = { costo: num(g(f, 'costo')), venta: num(g(f, 'venta')), margen: num(g(f, 'margen')), cant: num(g(f, 'cant')) };
        continue;
      }
      var cod = normCod(g(f, 'cod'));
      var nombre = texto(g(f, 'nombre'));
      if (!cod || !nombre) continue;
      if (normEnc(g(f, 'cod')) === 'codigo' || normEnc(g(f, 'cod')) === 'articulo') continue;
      var cant = num(g(f, 'cant')), costo = num(g(f, 'costo')), venta = num(g(f, 'venta')), margen = num(g(f, 'margen'));
      if (cant == null && costo == null && venta == null) continue;
      cant = cant || 0; costo = costo || 0; venta = venta || 0;
      if (margen == null) margen = venta - costo;
      var it = {
        mod: modulo, cod: texto(g(f, 'cod')), codN: cod, codB: baseCod(cod), nombre: nombre, nombreN: normNombre(nombre),
        grupo: '', cant: cant, costo: costo, venta: venta, margen: margen,
        mpct: venta > 0 ? (margen / venta) * 100 : null,
        tipo: tipoRent(nombre, cant, costo, venta)
      };
      items.push(it);
      pendientes.push(it);
    }
    return { items: items, totales: totales, grupos: Object.keys(grupos).length };
  }

  /* ---------- Ventas ---------- */
  function nuevoProducto(k, mod, cod, codN, nombre) {
    return {
      k: k, mod: mod, cod: cod, codN: codN, codB: baseCod(codN), nombre: nombre, nombreN: normNombre(nombre),
      linea: '', sub: '', marca: '', un: '', unidad: '',
      uds: 0, udsV: 0, udsD: 0, venta: 0, ventaD: 0, costo: 0, lineas: 0, clientes: 0,
      pmin: null, pmax: null, cu: null,
      bcL: 0, bcU: 0, perd: 0, obL: 0, obU: 0, obC: 0,
      segs: {}, rutas: {}
    };
  }

  function resumirVentas(filas, h, mapa, opciones) {
    var f1904 = !!opciones.f1904;
    var modDef = opciones.modulo || '';
    var porFactor = !!opciones.porFactor;
    // MobilVendor guarda los códigos como texto: 000855 y 855 son productos distintos y no se unen.
    var claveExacta = !!opciones.claveExacta;
    var g = function (f, c) { var i = mapa[c]; return i == null ? null : f[i]; };
    var productos = {}, clientesProd = {};
    var fechas = {}, docs = {}, clientes = {};
    var porModulo = {};
    var bajoCosto = [], obsequios = [];
    var tot = { venta: 0, costo: 0, uds: 0, lineas: 0, devVenta: 0, devLineas: 0, omitidas: 0 };
    var filasLeidas = 0, conCosto = 0;

    function modStats(m) {
      if (!porModulo[m]) porModulo[m] = { venta: 0, costo: 0, uds: 0, lineas: 0, docs: {}, clientes: {}, desde: '', hasta: '', bcL: 0, perd: 0, obL: 0, devVenta: 0 };
      return porModulo[m];
    }

    for (var r = h + 1; r < filas.length; r++) {
      var f = filas[r]; if (!f) continue;
      var codN = normCod(g(f, 'cod'));
      if (!codN || codN === '0') codN = normCod(g(f, 'codAlt'));
      var nombre = texto(g(f, 'nombre'));
      if (!codN && !nombre) continue;
      if (normEnc(nombre) === 'producto' || normEnc(nombre) === 'descripcion') continue;
      var cant = num(g(f, 'cant'));
      if (porFactor && cant != null) {
        var fac = num(g(f, 'factor'));
        if (fac != null && fac > 0) cant *= fac;
      }
      var venta = num(g(f, 'venta'));
      var precio = num(g(f, 'precio'));
      var desc = num(g(f, 'desc')) || 0;
      if (cant == null) { tot.omitidas++; continue; }
      if (venta == null && precio != null) venta = precio * cant;
      if (venta == null) { tot.omitidas++; continue; }
      if (cant === 0 && venta === 0) continue;
      filasLeidas++;

      var mod = normModulo(g(f, 'modulo')) || modDef || 'gen';
      if (mod === 'ambos') mod = modDef || 'gen';
      var cu = num(g(f, 'cu'));
      if (cu != null) conCosto++;
      var pu = cant !== 0 ? venta / cant : (precio || 0);
      var dia = fecha(g(f, 'fecha'), f1904);
      var doc = normCod(g(f, 'doc'));
      var cli = texto(g(f, 'cli'));
      var tipo = normEnc(g(f, 'tipo'));
      var esDev = cant < 0 || tipo === 'devolucion';
      var clave = codN;
      if (codN && claveExacta) clave = texto(g(f, 'cod')).toUpperCase().replace(/\s+/g, '') || codN;
      if (!codN) clave = normNombre(nombre);
      var k = mod + '|' + clave;

      var p = productos[k];
      if (!p) {
        p = productos[k] = nuevoProducto(k, mod, texto(g(f, 'cod')) || texto(g(f, 'codAlt')), codN, nombre);
        clientesProd[k] = {};
      }
      if (!p.linea) p.linea = textoUtil(g(f, 'linea'));
      if (!p.sub) p.sub = textoUtil(g(f, 'sub'));
      if (!p.marca) p.marca = textoUtil(g(f, 'marca'));
      if (!p.un) p.un = textoUtil(g(f, 'un'));
      if (!p.unidad) p.unidad = texto(g(f, 'unidad'));

      var costoLinea = cu != null ? cu * cant : 0;
      p.uds += cant; p.venta += venta; p.costo += costoLinea; p.lineas++;
      if (esDev) { p.udsD += -cant; p.ventaD += venta; }
      else { p.udsV += cant; }
      if (cu != null && cu > 0) p.cu = cu;
      var seg = textoUtil(g(f, 'seg')) || 'Sin segmento';
      var ruta = textoUtil(g(f, 'ruta')) || 'Sin ruta';
      p.segs[seg] = (p.segs[seg] || 0) + venta;
      p.rutas[ruta] = (p.rutas[ruta] || 0) + venta;
      if (cli) clientesProd[k][cli] = 1;

      var ms = modStats(mod);
      ms.venta += venta; ms.costo += costoLinea; ms.uds += cant; ms.lineas++;
      if (doc) ms.docs[doc] = 1;
      if (cli) ms.clientes[cli] = 1;
      if (dia) {
        fechas[dia] = 1;
        if (!ms.desde || dia < ms.desde) ms.desde = dia;
        if (!ms.hasta || dia > ms.hasta) ms.hasta = dia;
      }
      if (doc) docs[mod + doc] = 1;
      if (cli) clientes[mod + cli] = 1;

      tot.venta += venta; tot.costo += costoLinea; tot.uds += cant; tot.lineas++;
      if (esDev) { tot.devVenta += venta; tot.devLineas++; ms.devVenta += venta; continue; }

      if (pu > 0) {
        if (p.pmin == null || pu < p.pmin) p.pmin = pu;
        if (p.pmax == null || pu > p.pmax) p.pmax = pu;
      }
      if (cu != null && cu > 0) {
        var linea = {
          mod: mod, fecha: dia, doc: texto(g(f, 'doc')), cli: cli, cliN: texto(g(f, 'cliN')),
          ven: texto(g(f, 'ven')), ruta: ruta, seg: seg, k: k, cant: cant, pu: pu, cu: cu, desc: desc, venta: venta
        };
        if (pu <= 0.000001 || desc >= 100) {
          linea.perdida = cu * cant;
          obsequios.push(linea);
          p.obL++; p.obU += cant; p.obC += cu * cant;
          ms.obL++;
        } else if (cu - pu > 0.00005) {
          linea.perdida = (cu - pu) * cant;
          bajoCosto.push(linea);
          p.bcL++; p.bcU += cant; p.perd += linea.perdida;
          ms.bcL++; ms.perd += linea.perdida;
        }
      }
    }

    var lista = Object.keys(productos).map(function (k) {
      var p = productos[k];
      p.clientes = Object.keys(clientesProd[k]).length;
      return p;
    });
    var dias = Object.keys(fechas).sort();
    Object.keys(porModulo).forEach(function (m) {
      var s = porModulo[m];
      s.docs = Object.keys(s.docs).length;
      s.clientes = Object.keys(s.clientes).length;
    });
    return {
      filas: filasLeidas,
      conCosto: filasLeidas ? conCosto / filasLeidas : 0,
      dias: dias,
      desde: dias[0] || '',
      hasta: dias[dias.length - 1] || '',
      docs: Object.keys(docs).length,
      clientes: Object.keys(clientes).length,
      totales: tot,
      porModulo: porModulo,
      productos: lista,
      bajoCosto: bajoCosto,
      obsequios: obsequios
    };
  }

  /* ---------- Entrada principal ---------- */
  var TIPOS_ESPERADOS = {
    inventario: ['inventario', 'ventas', 'rentMV', 'rentB'],
    rentabilidad: ['rentMV', 'rentB', 'ventas', 'inventario'],
    ventas: ['ventas', 'inventario', 'rentMV', 'rentB']
  };

  var NOMBRE_TIPO = {
    inventario: 'inventario', ventas: 'ventas', rentMV: 'rentabilidad de MobilVendor', rentB: 'rentabilidad de Módulo B'
  };

  function procesar(XLSX, datos, pedido) {
    var wb = leerLibro(XLSX, datos);
    var f1904 = es1904(wb);
    var esperados = TIPOS_ESPERADOS[pedido.panel] || ['ventas', 'inventario', 'rentMV', 'rentB'];
    var det = detectar(XLSX, wb, esperados);
    if (!det) {
      return { ok: false, error: 'No encontré una fila de encabezados reconocible. Revisa que el archivo tenga columnas como Código, Producto y Cantidad.' };
    }
    var panelDetectado = det.esquema === 'ventas' ? 'ventas' : det.esquema === 'inventario' ? 'inventario' : 'rentabilidad';
    if (panelDetectado !== pedido.panel) {
      return {
        ok: false, tipoDetectado: det.esquema,
        error: 'Este archivo parece de ' + NOMBRE_TIPO[det.esquema] + '. Cárgalo en el panel de ' +
          (panelDetectado === 'ventas' ? 'Ventas' : panelDetectado === 'inventario' ? 'Inventario' : 'Rentabilidad') + '.'
      };
    }
    var filas = filasHoja(XLSX, wb.Sheets[det.hoja]);
    var mapa = afinarMapa(filas, det.fila, det.mapa, det.enc);
    var base = {
      ok: true, esquema: det.esquema, hoja: det.hoja, hojas: wb.SheetNames.slice(),
      filaEncabezado: det.fila + 1
    };

    if (det.esquema === 'inventario') {
      var inv = leerInventario(filas, det.fila, mapa, f1904);
      base.inventario = inv;
      base.faltan = faltantes(mapa, ['cod', 'precio', 'costo', 'linea', 'sub', 'modulo']);
      if (!inv.items.length) return { ok: false, error: 'La hoja «' + det.hoja + '» no tiene productos con stock o precio.' };
      return base;
    }

    if (det.esquema === 'rentMV' || det.esquema === 'rentB') {
      var modulo = det.esquema === 'rentMV' ? 'mv' : 'mb';
      var rent = leerRentabilidad(filas, det.fila, mapa, det.esquema, modulo);
      rent.periodo = preambulo(filas, det.fila);
      rent.modulo = modulo;
      base.rentabilidad = rent;
      if (!rent.items.length) return { ok: false, error: 'No encontré productos en el reporte de rentabilidad.' };
      return base;
    }

    // Ventas. El reporte general de MobilVendor siempre es de ese módulo, aunque se suelte en otra casilla.
    var mv = esMobilVendor(det.enc);
    var cantInv = det.enc[mapa.cant] === 'cantidadenunidadinventario';
    var porFactor = mv && !cantInv && mapa.factor != null;
    var res = resumirVentas(filas, det.fila, mapa, {
      f1904: f1904, modulo: mv ? 'mv' : (pedido.modulo || ''), porFactor: porFactor, claveExacta: mv
    });
    if (mv) res.formato = 'MobilVendor, reporte general de ventas';
    base.ventas = res;
    base.faltan = faltantes(mapa, ['cu', 'fecha', 'doc', 'cliN', 'seg', 'ruta', 'linea', 'sub']);
    base.tieneModulo = mapa.modulo != null || mv;
    if (!res.filas) return { ok: false, error: 'No encontré líneas de venta con cantidad y monto.' };
    var avisos = [];
    if (mapa.cu == null) avisos.push('El archivo no trae costo unitario: no se puede validar si hay ventas bajo costo.');
    if (mv && !cantInv && !porFactor) {
      avisos.push('No trae «CantidadEnUnidadInventario» ni «UnidadFactor»: las ventas por display, bulto o caja quedan en unidades de venta y no se comparan bien con el costo.');
    }
    if (mv && !pedido.modulo) avisos.push('Es el reporte directo de MobilVendor: solo trae las ventas de ese módulo.');
    if (avisos.length) base.aviso = avisos.join(' ');
    return base;
  }

  raiz.VJLectores = {
    procesar: procesar,
    utilidades: {
      normEnc: normEnc, normCod: normCod, baseCod: baseCod, normNombre: normNombre, claveGrupo: claveGrupo,
      num: num, fecha: fecha, texto: texto, textoUtil: textoUtil, normModulo: normModulo
    },
    NOMBRES_CAMPO: NOMBRES_CAMPO
  };
})(typeof self !== 'undefined' ? self : this);
