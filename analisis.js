/*!
 * VENEJUGOS 2015, tablero comercial.
 * Copyright (c) 2026 DISTRIBUIDORA VENEJUGOS 2015, C.A. Todos los derechos reservados.
 * Uso interno exclusivo. Prohibida su copia, distribucion o modificacion sin autorizacion escrita.
 *
 * Cruza ventas, inventario y rentabilidad. Todo se calcula en memoria, en este navegador.
 */
(function (global) {
  'use strict';
  var VJ = global.VJ = global.VJ || {};
  var L = global.VJLectores.utilidades;
  var u = VJ.u;

  var RX_AJUSTE = /DESCUENTO|DIFERENCIA DE PRECIO|NOTA DE CREDITO|AJUSTE|REDONDEO/;
  function esAjuste(p) { return RX_AJUSTE.test(p.nombreN || L.normNombre(p.nombre)); }
  function sumarMapa(dest, org) { Object.keys(org || {}).forEach(function (k) { dest[k] = (dest[k] || 0) + org[k]; }); return dest; }
  function topClaves(mapa, n, excluir) {
    return Object.keys(mapa).filter(function (k) { return mapa[k] > 0 && !(excluir && excluir[k]) && !/^Sin (segmento|ruta)$/.test(k); })
      .sort(function (a, b) { return mapa[b] - mapa[a]; }).slice(0, n);
  }
  function total(mapa) { return Object.keys(mapa).reduce(function (s, k) { return s + (mapa[k] > 0 ? mapa[k] : 0); }, 0); }

  /* ---------- 1. Combinar las fuentes de ventas activas ---------- */
  function combinarVentas(resumenes) {
    var prods = {}, dias = {}, porModulo = {};
    var tot = { venta: 0, costo: 0, uds: 0, lineas: 0, devVenta: 0, devLineas: 0 };
    var bajoCosto = [], obsequios = [], docs = 0, clientes = 0;
    resumenes.forEach(function (r) {
      r.dias.forEach(function (d) { dias[d] = 1; });
      Object.keys(tot).forEach(function (k) { tot[k] += r.totales[k] || 0; });
      docs += r.docs; clientes += r.clientes;
      bajoCosto = bajoCosto.concat(r.bajoCosto);
      obsequios = obsequios.concat(r.obsequios);
      Object.keys(r.porModulo).forEach(function (m) {
        var s = r.porModulo[m], d = porModulo[m];
        if (!d) { porModulo[m] = JSON.parse(JSON.stringify(s)); return; }
        ['venta', 'costo', 'uds', 'lineas', 'docs', 'clientes', 'bcL', 'perd', 'obL', 'devVenta'].forEach(function (k) { d[k] += s[k] || 0; });
        if (s.desde && (!d.desde || s.desde < d.desde)) d.desde = s.desde;
        if (s.hasta && (!d.hasta || s.hasta > d.hasta)) d.hasta = s.hasta;
      });
      r.productos.forEach(function (p) {
        var d = prods[p.k];
        if (!d) { prods[p.k] = JSON.parse(JSON.stringify(p)); return; }
        ['uds', 'udsV', 'udsD', 'venta', 'ventaD', 'costo', 'lineas', 'clientes', 'bcL', 'bcU', 'perd', 'obL', 'obU', 'obC'].forEach(function (k) { d[k] += p[k] || 0; });
        if (p.pmin != null && (d.pmin == null || p.pmin < d.pmin)) d.pmin = p.pmin;
        if (p.pmax != null && (d.pmax == null || p.pmax > d.pmax)) d.pmax = p.pmax;
        if (p.cu != null) d.cu = p.cu;
        ['linea', 'sub', 'marca', 'un', 'unidad'].forEach(function (k) { if (!d[k]) d[k] = p[k]; });
        sumarMapa(d.segs, p.segs); sumarMapa(d.rutas, p.rutas);
      });
    });
    var listaDias = Object.keys(dias).sort();
    return {
      productos: Object.keys(prods).map(function (k) { return prods[k]; }),
      dias: listaDias, desde: listaDias[0] || '', hasta: listaDias[listaDias.length - 1] || '',
      totales: tot, porModulo: porModulo, bajoCosto: bajoCosto, obsequios: obsequios, docs: docs, clientes: clientes
    };
  }

  // Solo una modalidad cuenta a la vez: directos (MobilVendor + Módulo B) o agrupado (dinámica).
  function fuentesActivas(estado) {
    var f = estado.ventas.fuentes;
    var lista = estado.ventas.modo === 'dinamica' ? [f.din] : [f.mv, f.mb];
    return lista.filter(Boolean).map(function (x) { return x.resumen; });
  }

  /* ---------- 2. Índice del inventario ---------- */
  function indexar(items) {
    var porCod = {}, porCodB = {}, porNombre = {};
    function poner(mapa, k, it) { if (!k) return; (mapa[k] = mapa[k] || []).push(it); }
    items.forEach(function (it) {
      poner(porCod, it.codN, it); poner(porCodB, it.codB, it); poner(porNombre, it.nombreN, it);
    });
    return { porCod: porCod, porCodB: porCodB, porNombre: porNombre };
  }

  var NO_CUENTAN = { UND: 1, UNI: 1, GRS: 1, LTS: 1, KGS: 1, PZA: 1, DIS: 1, DISPLAY: 1, CAJA: 1, BOLSA: 1, CON: 1, SIN: 1, DEL: 1, LOS: 1, LAS: 1, PARA: 1 };
  function palabras(n) { return (String(n || '').match(/[A-Z]{3,}/g) || []).filter(function (w) { return !NO_CUENTAN[w]; }); }
  function comparten(a, b) { var pa = palabras(a); return palabras(b).some(function (w) { return pa.indexOf(w) > -1; }); }

  function buscar(idx, mod, codN, codB, nombreN) {
    var cand = (codN && idx.porCod[codN]) || (codB && idx.porCod[codB]) || (codB && idx.porCodB[codB]) || null;
    // Mismo código, otro producto (028 MARILU contra 28 PIÑATA de Módulo B): sin palabras en común no se enlaza. El enlace por -1 no cambia.
    if (cand && nombreN) cand = cand.filter(function (c) { return c.codN !== codN || c.nombreN === nombreN || comparten(c.nombreN, nombreN); });
    if (!cand || !cand.length) cand = nombreN ? idx.porNombre[nombreN] : null;
    if (!cand || !cand.length) return null;
    if (cand.length === 1) return cand[0];
    var exacto = cand.filter(function (c) { return c.nombreN === nombreN; });
    if (exacto.length) cand = exacto;
    var rango = function (c) { return c.mod === mod ? 0 : c.mod === 'ambos' ? 1 : c.mod === '' ? 2 : 3; };
    return cand.slice().sort(function (a, b) { return rango(a) - rango(b); })[0];
  }

  /* ---------- 3. Nombres de líneas: une variantes como TABACOS / TABACO ---------- */
  function catalogoLineas(nombres) {
    var grupos = {};
    nombres.forEach(function (n) {
      if (!n) return;
      var k = L.claveGrupo(n);
      if (!k) return;
      var g = grupos[k] = grupos[k] || { clave: k, variantes: {} };
      g.variantes[n] = (g.variantes[n] || 0) + 1;
    });
    Object.keys(grupos).forEach(function (k) {
      var g = grupos[k];
      g.nombre = Object.keys(g.variantes).sort(function (a, b) { return g.variantes[b] - g.variantes[a]; })[0];
    });
    return grupos;
  }

  /* ---------- 4. Análisis completo ---------- */
  function analizar(estado) {
    var aj = estado.ajustes;
    var inv = estado.inventario ? estado.inventario.items : [];
    var fuentes = fuentesActivas(estado);
    var V = fuentes.length ? combinarVentas(fuentes) : null;
    var rentFuentes = ['mv', 'mb'].filter(function (m) { return estado.rentabilidad[m]; });

    var A = {
      hay: { inv: inv.length > 0, ventas: !!V, rent: rentFuentes.length > 0 },
      ventas: null, inventario: null, rentabilidad: null, lineas: [], calidad: {}
    };

    var idx = indexar(inv);
    var nombresLinea = inv.map(function (i) { return i.linea; });
    if (V) V.productos.forEach(function (p) { nombresLinea.push(p.linea); });
    var catLineas = catalogoLineas(nombresLinea);
    function lineaDe(nombre) { var k = L.claveGrupo(nombre); return k && catLineas[k] ? catLineas[k].nombre : (nombre || ''); }

    // Enlace ventas -> inventario
    var porInv = new Map();
    var diasOp = V ? V.dias.length : 0;
    var diasCal = V && V.desde ? u.difDias(V.desde, V.hasta) + 1 : 0;
    var ratioOp = diasCal ? Math.min(1, diasOp / diasCal) : 1;
    var sinFicha = [];
    if (V) {
      V.productos.forEach(function (p) {
        p.ajuste = esAjuste(p);
        var it = inv.length && !p.ajuste ? buscar(idx, p.mod, p.codN, p.codB, p.nombreN) : null;
        p.invRef = it;
        p.lineaN = lineaDe((it && it.linea) || p.linea);
        p.subN = (it && it.sub) || p.sub || '';
        if (it) {
          var acc = porInv.get(it);
          if (!acc) { acc = { uds: 0, venta: 0, costo: 0, segs: {}, rutas: {}, clientes: 0, prods: [] }; porInv.set(it, acc); }
          acc.uds += p.uds; acc.venta += p.venta; acc.costo += p.costo; acc.clientes += p.clientes;
          sumarMapa(acc.segs, p.segs); sumarMapa(acc.rutas, p.rutas); acc.prods.push(p);
        } else if (inv.length && p.venta > 0 && !p.ajuste) {
          sinFicha.push(p);
        }
      });
    }

    /* ----- Inventario y rotación ----- */
    if (inv.length) {
      var baseFecha = estado.inventario.fechaArchivo || (V && V.hasta) || u.hoyISO();
      var activos = inv.filter(function (i) { return i.activo; });
      var grupos = {};
      function claveSim(it) {
        if (it.sub) return 'S:' + L.claveGrupo(it.sub);
        if (it.linea) return 'L:' + L.claveGrupo(it.linea);
        return '';
      }
      var modsVentas = V ? V.porModulo : {};
      var cubierto = function (mod) {
        if (!V) return false;
        if (modsVentas.gen) return true;
        if (mod === 'mv' || mod === 'mb') return !!modsVentas[mod];
        return Object.keys(modsVentas).length > 0;
      };
      activos.forEach(function (it) {
        var acc = porInv.get(it) || { uds: 0, venta: 0, costo: 0, segs: {}, rutas: {}, clientes: 0, prods: [] };
        var r = it.rot = {
          uds: acc.uds, venta: acc.venta, clientes: acc.clientes, segs: acc.segs, rutas: acc.rutas,
          vdp: diasOp ? Math.max(acc.uds, 0) / diasOp : null
        };
        if (!V) { r.estado = 'sin-datos'; r.cobertura = null; }
        else if (!cubierto(it.mod) && !acc.uds) { r.estado = 'sin-datos'; r.cobertura = null; r.falta = u.MODULOS[it.mod] || 'ese módulo'; }
        else if (it.stock <= 0) { r.estado = acc.uds > 0 ? 'agotado' : 'sin-existencia'; r.cobertura = 0; }
        else if (!r.vdp) { r.estado = 'sin-mov'; r.cobertura = Infinity; }
        else {
          r.cobertura = it.stock / r.vdp;
          r.estado = r.cobertura < aj.quiebreDias ? 'quiebre' : r.cobertura > aj.bajaDias ? 'baja' : 'normal';
        }
        r.agota = (V && isFinite(r.cobertura) && r.cobertura > 0) ? u.sumarDias(baseFecha, r.cobertura / ratioOp) : '';
        r.lineaN = lineaDe(it.linea);
        var ks = claveSim(it);
        r.grupo = ks;
        if (ks) {
          var g = grupos[ks] = grupos[ks] || { clave: ks, nombre: it.sub || it.linea, segs: {}, rutas: {}, items: [], venta: 0 };
          g.items.push(it); g.venta += acc.venta;
          sumarMapa(g.segs, acc.segs); sumarMapa(g.rutas, acc.rutas);
        }
      });

      // ABC por venta
      var conVenta = activos.filter(function (i) { return i.rot.venta > 0; }).sort(function (a, b) { return b.rot.venta - a.rot.venta; });
      var ventaTotal = conVenta.reduce(function (s, i) { return s + i.rot.venta; }, 0), acum = 0;
      conVenta.forEach(function (i) { acum += i.rot.venta; var c = ventaTotal ? acum / ventaTotal : 1; i.rot.abc = c <= 0.8 ? 'A' : c <= 0.95 ? 'B' : 'C'; });

      // Estadística de similares
      Object.keys(grupos).forEach(function (k) {
        var g = grupos[k];
        g.cobMed = u.mediana(g.items.map(function (i) { return i.rot.cobertura; }).filter(function (c) { return isFinite(c) && c > 0; }));
        g.lider = g.items.slice().sort(function (a, b) { return b.rot.venta - a.rot.venta; })[0];
        g.conVenta = g.items.filter(function (i) { return i.rot.venta > 0; }).length;
      });

      activos.forEach(function (it) {
        var r = it.rot, g = grupos[r.grupo];
        r.sim = g ? { nombre: g.nombre, cobMed: g.cobMed, n: g.items.length } : null;
        r.sugerencia = sugerir(it, g, diasOp, aj);
      });

      // Vencimientos
      var conVenc = activos.filter(function (i) { return i.venc; });
      var venc = conVenc.map(function (it) {
        var dias = u.difDias(baseFecha, it.venc);
        var vendibles = it.rot.vdp ? it.rot.vdp * Math.max(dias, 0) * ratioOp : 0;
        var exced = Math.max(it.stock - vendibles, 0);
        var nivel = dias < 0 ? 'vencido' : exced > 0.5 ? 'riesgo' : dias <= aj.vencDias ? 'proximo' : 'ok';
        var g = grupos[it.rot.grupo];
        var donde = g ? topClaves(g.segs, 2, it.rot.segs) : [];
        var accion = nivel === 'vencido' ? 'Retirar de la venta y gestionar cambio o devolución con el proveedor.'
          : nivel === 'riesgo' ? 'Al ritmo actual quedarían unas ' + u.entero(exced) + ' unidades sin vender al vencer. Despachar primero este lote' +
            (donde.length ? ' y ofrecerlo en ' + donde.join(' y ') : '') + '; evaluar promoción o cambio con el proveedor.'
          : nivel === 'proximo' ? 'Vence pronto pero la venta lo cubre. Despachar este lote antes que los nuevos.'
          : 'La venta actual alcanza para agotarlo antes de vencer.';
        return { it: it, dias: dias, vendibles: vendibles, exced: exced, nivel: nivel, accion: accion };
      }).sort(function (a, b) { return a.dias - b.dias; });

      // Calidad del inventario
      var dup = {};
      inv.forEach(function (i) { var k = (i.mod || '-') + '|' + i.codN; (dup[k] = dup[k] || []).push(i); });
      var duplicados = Object.keys(dup).filter(function (k) { return dup[k].length > 1 && dup[k][0].codN; }).map(function (k) { return dup[k]; });
      var variantes = Object.keys(catLineas).map(function (k) { return catLineas[k]; }).filter(function (g) { return Object.keys(g.variantes).length > 1; });

      var cuenta = function (e) { return activos.filter(function (i) { return i.rot.estado === e; }).length; };
      var coberturas = activos.map(function (i) { return i.rot.cobertura; }).filter(function (c) { return isFinite(c) && c > 0; });

      A.inventario = {
        baseFecha: baseFecha, diasOp: diasOp, diasCal: diasCal,
        items: activos, total: inv.length, inactivos: inv.length - activos.length,
        inactivosConStock: inv.filter(function (i) { return !i.activo && i.stock > 0; }).length,
        kpis: {
          activos: activos.length, sinMov: cuenta('sin-mov'), baja: cuenta('baja'), quiebre: cuenta('quiebre'),
          agotados: cuenta('agotado'), normal: cuenta('normal'), sinDatos: cuenta('sin-datos'), coberturaMed: u.mediana(coberturas)
        },
        venc: { columna: estado.inventario.tieneVenc, conFecha: conVenc.length, items: venc },
        calidad: { duplicados: duplicados, variantes: variantes, stockNegativo: inv.filter(function (i) { return i.stock < 0; }) }
      };
    }

    /* ----- Ventas: validación ----- */
    if (V) {
      var porK = {};
      V.productos.forEach(function (p) { porK[p.k] = p; });
      var bc = {};
      V.bajoCosto.forEach(function (l) {
        var p = porK[l.k];
        var b = bc[l.k] = bc[l.k] || { p: p, lineas: [], uds: 0, perdida: 0, pmin: Infinity, cu: 0, ventaBC: 0 };
        b.lineas.push(l); b.uds += l.cant; b.perdida += l.perdida; b.ventaBC += l.venta;
        if (l.pu < b.pmin) b.pmin = l.pu;
        if (l.cu > b.cu) b.cu = l.cu;
      });
      var bajo = Object.keys(bc).map(function (k) {
        var b = bc[k];
        b.difPct = b.cu ? ((b.pmin - b.cu) / b.cu) * 100 : null;
        b.lineas.sort(function (x, y) { return (x.fecha < y.fecha ? 1 : -1); });
        return b;
      }).sort(function (a, b) { return b.perdida - a.perdida; });

      var obs = {};
      V.obsequios.forEach(function (l) {
        var o = obs[l.k] = obs[l.k] || { p: porK[l.k], lineas: 0, uds: 0, costo: 0 };
        o.lineas++; o.uds += l.cant; o.costo += l.perdida;
      });
      var devs = V.productos.filter(function (p) { return p.udsD > 0 && !p.ajuste; })
        .sort(function (a, b) { return a.ventaD - b.ventaD; }).slice(0, 12);
      var ajustesV = V.productos.filter(function (p) { return p.ajuste; });

      A.ventas = {
        desde: V.desde, hasta: V.hasta, diasOp: diasOp, totales: V.totales, porModulo: V.porModulo,
        docs: V.docs, clientes: V.clientes, productos: V.productos.length,
        bajoCosto: { productos: bajo, lineas: V.bajoCosto.length, perdida: V.bajoCosto.reduce(function (s, l) { return s + l.perdida; }, 0) },
        obsequios: { productos: Object.keys(obs).map(function (k) { return obs[k]; }).sort(function (a, b) { return b.costo - a.costo; }), lineas: V.obsequios.length },
        devoluciones: devs,
        devTotal: V.productos.reduce(function (s, p) { return s + (p.ajuste ? 0 : p.ventaD); }, 0),
        devUds: V.productos.reduce(function (s, p) { return s + (p.ajuste ? 0 : p.udsD); }, 0),
        obsequiosCosto: V.obsequios.reduce(function (s, l) { return s + l.perdida; }, 0),
        ajustes: { lineas: ajustesV.reduce(function (s, p) { return s + p.lineas; }, 0), monto: ajustesV.reduce(function (s, p) { return s + p.venta; }, 0) },
        sinFicha: sinFicha.sort(function (a, b) { return b.venta - a.venta; }),
        cuadre: cuadre(estado, V, porK)
      };
    }

    /* ----- Rentabilidad ----- */
    var rentItems = [];
    var fuenteRent = {};
    ['mv', 'mb'].forEach(function (m) {
      var R = estado.rentabilidad[m];
      if (R) {
        fuenteRent[m] = 'reporte';
        R.items.forEach(function (i) { rentItems.push(Object.assign({}, i, { fuente: 'reporte' })); });
      } else if (V && V.porModulo[m]) {
        fuenteRent[m] = 'ventas';
        V.productos.filter(function (p) { return p.mod === m; }).forEach(function (p) {
          var margen = p.venta - p.costo;
          rentItems.push({
            mod: m, cod: p.cod, codN: p.codN, codB: p.codB, nombre: p.nombre, nombreN: p.nombreN, grupo: p.un || '',
            cant: p.uds, costo: p.costo, venta: p.venta, margen: margen, mpct: p.venta > 0 ? margen / p.venta * 100 : null,
            tipo: esAjuste(p) ? 'ajuste' : (p.venta > 0 && p.uds > 0) ? (p.costo === 0 ? 'sincosto' : 'producto') : (p.venta === 0 && p.costo === 0 ? 'bonificacion' : 'devolucion'),
            fuente: 'ventas'
          });
        });
      }
    });
    if (V && !rentItems.length) {
      // Ventas sin módulo identificado: usar todo como una sola fuente.
      V.productos.forEach(function (p) {
        var margen = p.venta - p.costo;
        rentItems.push({ mod: p.mod, cod: p.cod, codN: p.codN, codB: p.codB, nombre: p.nombre, nombreN: p.nombreN, grupo: p.un || '',
          cant: p.uds, costo: p.costo, venta: p.venta, margen: margen, mpct: p.venta > 0 ? margen / p.venta * 100 : null,
          tipo: p.venta > 0 && p.uds > 0 ? 'producto' : 'devolucion', fuente: 'ventas' });
      });
      fuenteRent.gen = 'ventas';
    }
    if (rentItems.length) A.rentabilidad = rentabilidad(rentItems, fuenteRent, estado, V, idx, inv, lineaDe, aj);

    /* ----- Líneas (para fotos y medición) ----- */
    A.lineas = lineas(A, inv, V, catLineas, lineaDe, estado);
    A.catLineas = catLineas;
    return A;
  }

  /* ---------- Sugerencias de colocación ---------- */
  function sugerir(it, g, diasOp, aj) {
    var r = it.rot;
    var nombreSim = g ? g.nombre : '';
    var donde = g ? topClaves(g.segs, 2, null) : [];
    var participacion = g && donde.length ? donde.reduce(function (s, k) { return s + g.segs[k]; }, 0) / (total(g.segs) || 1) * 100 : 0;
    var propios = r.segs || {};
    var nuevos = donde.filter(function (s) { return !(propios[s] > 0); });
    var rutas = g ? topClaves(g.rutas, 2, null) : [];
    var lider = g && g.lider && g.lider !== it && g.lider.rot.venta > 0 ? g.lider.nombre : '';
    switch (r.estado) {
      case 'sin-mov':
        return 'Sin ventas en ' + diasOp + ' días con despacho.' +
          (donde.length ? ' Colócalo en ' + donde.join(' y ') + ', donde se vende el ' + u.pct(participacion) + ' de ' + nombreSim + '.' : ' No hay similares con venta para tomar como referencia.') +
          (lider ? ' Combo sugerido con ' + lider + '.' : '');
      case 'baja':
        return 'Cobertura de ' + u.dias(r.cobertura) + (g && g.cobMed ? ' frente a ' + u.dias(g.cobMed) + ' de sus similares.' : '.') +
          (nuevos.length ? ' Aún no se vende en ' + nuevos.join(' ni ') + ', fuerte para ' + nombreSim + '.' : rutas.length ? ' Empujarlo en las rutas ' + rutas.join(' y ') + '.' : '') +
          ' Reducir el próximo pedido.';
      case 'quiebre':
        if (r.cobertura < 1) return 'No alcanza para un día de despacho: hay ' + u.entero(it.stock) + ' y se venden ' + u.uno(r.vdp) + ' por día. Reponer ya o revisar la unidad del stock.';
        return 'Se agota en unos ' + u.dias(r.cobertura) + ' de despacho (' + u.fecha(r.agota) + '). Programar reposición.';
      case 'agotado':
        return 'Sin existencia y con demanda de ' + u.uno(r.vdp) + ' unidades por día. Reponer.';
      case 'sin-existencia':
        return 'Sin existencia ni ventas en el período.';
      case 'normal':
        return (r.abc === 'A' ? 'Producto clave: mantenerlo cerca del área de despacho.' : 'Rotación dentro del rango.') +
          (nuevos.length ? ' Puede crecer en ' + nuevos.join(' y ') + '.' : '');
      default:
        return r.falta ? 'Falta cargar las ventas de ' + r.falta + ' para medir este producto.' : 'Carga las ventas para medir la rotación.';
    }
  }

  /* ---------- Cuadre ventas contra rentabilidad ---------- */
  function cuadre(estado, V, porK) {
    var out = {};
    ['mv', 'mb'].forEach(function (m) {
      var R = estado.rentabilidad[m];
      var Vm = V.porModulo[m];
      if (!R || !Vm) return;
      var rv = 0, porCodR = {}, porNomR = {};
      R.items.forEach(function (i) {
        rv += i.venta;
        (porCodR[i.codN] = porCodR[i.codN] || []).push(i);
        (porNomR[i.nombreN] = porNomR[i.nombreN] || []).push(i);
      });
      var usados = new Set();
      var difs = [];
      V.productos.filter(function (p) { return p.mod === m; }).forEach(function (p) {
        var grupo = porCodR[p.codN] || porCodR[p.codB] || porNomR[p.nombreN] || [];
        grupo = grupo.filter(function (i) { return !usados.has(i); });
        // Códigos que solo se distinguen por ceros a la izquierda (000855 y 855): preferir el mismo nombre.
        var mismos = grupo.filter(function (i) { return i.nombreN === p.nombreN; });
        if (mismos.length) grupo = mismos;
        var rvp = 0;
        grupo.forEach(function (i) { usados.add(i); rvp += i.venta; });
        difs.push({ nombre: p.nombre, ventas: p.venta, rent: rvp, dif: p.venta - rvp });
      });
      R.items.forEach(function (i) {
        if (!usados.has(i)) difs.push({ nombre: i.nombre, ventas: 0, rent: i.venta, dif: -i.venta });
      });
      difs = difs.filter(function (d) { return Math.abs(d.dif) >= 0.01; }).sort(function (a, b) { return Math.abs(b.dif) - Math.abs(a.dif); });
      out[m] = {
        ventas: Vm.venta, rent: rv, dif: Vm.venta - rv, difPct: rv ? (Vm.venta - rv) / rv * 100 : null,
        periodoV: { desde: Vm.desde, hasta: Vm.hasta }, periodoR: R.periodo || {},
        conDiferencia: difs.length, top: difs.slice(0, 8)
      };
    });
    return out;
  }

  /* ---------- Rentabilidad y alertas ---------- */
  function rentabilidad(items, fuenteRent, estado, V, idx, inv, lineaDe, aj) {
    var porKVentas = {};
    if (V) V.productos.forEach(function (p) { porKVentas[p.mod + '|' + p.codN] = p; porKVentas[p.mod + '|' + p.codB] = porKVentas[p.mod + '|' + p.codB] || p; });

    items.forEach(function (i) {
      var it = inv.length ? buscar(idx, i.mod, i.codN, i.codB, i.nombreN) : null;
      var pv = porKVentas[i.mod + '|' + i.codN] || porKVentas[i.mod + '|' + i.codB] || null;
      i.inv = it; i.pv = pv;
      var sub = (it && it.sub) || (pv && pv.sub) || '';
      var lin = (it && it.linea) || (pv && pv.linea) || '';
      i.lineaN = lineaDe(lin);
      i.simClave = sub ? 'S:' + L.claveGrupo(sub) : lin ? 'L:' + L.claveGrupo(lin) : i.grupo ? 'G:' + L.claveGrupo(i.grupo) : '';
      i.simNombre = sub || lin || i.grupo || '';
      i.cobertura = it && it.rot ? it.rot.cobertura : null;
      i.estadoRot = it && it.rot ? it.rot.estado : '';
      i.invCosto = it && it.costo != null && it.stock > 0 ? it.stock * it.costo : null;
      i.gmroi = i.invCosto ? i.margen / i.invCosto : null;
      i.cuUnit = i.cant > 0 ? i.costo / i.cant : null;
    });

    var validos = items.filter(function (i) { return i.tipo === 'producto' && i.mpct != null; });
    var sim = {};
    validos.forEach(function (i) { if (i.simClave) (sim[i.simClave] = sim[i.simClave] || []).push(i.mpct); });
    var simLinea = {};
    validos.forEach(function (i) { if (i.lineaN) (simLinea[i.lineaN] = simLinea[i.lineaN] || []).push(i.mpct); });

    var alertas = [];
    function alerta(sev, i, titulo, detalle, accion, tipo) {
      alertas.push({ sev: sev, tipo: tipo, i: i, titulo: titulo, detalle: detalle, accion: accion });
    }

    validos.forEach(function (i) {
      var lista = sim[i.simClave] || [];
      var base = lista.length >= 3 ? { med: u.mediana(lista), n: lista.length, nombre: i.simNombre }
        : (simLinea[i.lineaN] && simLinea[i.lineaN].length >= 3 ? { med: u.mediana(simLinea[i.lineaN]), n: simLinea[i.lineaN].length, nombre: i.lineaN } : null);
      i.simMed = base ? base.med : null;
      i.simN = base ? base.n : 0;
      i.simRef = base ? base.nombre : '';
      i.difPts = base ? i.mpct - base.med : null;
      var precioObj = (i.cuUnit && base && base.med > 0 && base.med < 90) ? i.cuUnit / (1 - base.med / 100) : null;

      if (i.margen < 0) {
        alerta('critica', i, 'Se vende por debajo del costo',
          'Margen de ' + u.pct(i.mpct) + ': el costo (' + u.dinero(i.costo) + ') supera la venta (' + u.dinero(i.venta) + ').',
          precioObj ? 'Revisar precio y descuentos. Para igualar a sus similares (' + u.pct(base.med) + ') el precio por unidad ronda ' + u.dinero(precioObj) + '.'
            : 'Revisar precio de lista y descuentos aplicados.', 'bajo-costo');
        return;
      }
      if (i.margen === 0) {
        alerta('media', i, 'Se vende al costo', 'Venta y costo iguales: ' + u.dinero(i.venta) + '.', 'Confirmar si es una venta especial o un precio sin actualizar.', 'sin-margen');
        return;
      }
      var lento = i.estadoRot === 'baja' || i.estadoRot === 'sin-mov';
      if (base && i.difPts < -aj.puntosSim) {
        if (lento) {
          alerta('alta', i, 'Margen bajo y rotación lenta',
            'Margen ' + u.pct(i.mpct) + ' frente a ' + u.pct(base.med) + ' de ' + base.nombre + ', con cobertura de ' + u.dias(i.cobertura) + '.' +
              (i.invCosto ? ' Hay ' + u.dinero(i.invCosto) + ' inmovilizados a costo.' : ''),
            'Reducir compras y revisar precio' + (precioObj ? ' (referencia ' + u.dinero(precioObj) + ' por unidad)' : '') + '.', 'margen-lento');
        } else if (i.estadoRot === 'quiebre' || (isFinite(i.cobertura) && i.cobertura != null && i.cobertura < 15)) {
          alerta('media', i, 'Se vende rápido con margen bajo',
            'Margen ' + u.pct(i.mpct) + ' frente a ' + u.pct(base.med) + ' de ' + base.nombre + '; cobertura de ' + u.dias(i.cobertura) + '.',
            'Candidato a ajuste de precio' + (precioObj ? ': referencia ' + u.dinero(precioObj) + ' por unidad' : '') + '.', 'rapido-bajo');
        } else {
          alerta('media', i, 'Margen por debajo de sus similares',
            'Margen ' + u.pct(i.mpct) + ' frente a ' + u.pct(base.med) + ' de ' + base.nombre + ' (' + base.n + ' productos).',
            precioObj ? 'Precio por unidad para igualar la mediana: ' + u.dinero(precioObj) + '.' : 'Revisar precio y costo de compra.', 'bajo-similares');
        }
      }
    });

    // Capital inmovilizado: sin ventas o con cobertura mayor al doble del umbral, desde un monto mínimo a costo.
    var margenPorInv = new Map();
    items.forEach(function (i) { if (i.inv) margenPorInv.set(i.inv, (margenPorInv.get(i.inv) || 0) + i.margen); });
    var inmovilizado = inv.filter(function (it) {
      if (!it.activo || !it.rot || it.costo == null || it.stock <= 0) return false;
      var lento = it.rot.estado === 'sin-mov' || (it.rot.estado === 'baja' && it.rot.cobertura > aj.bajaDias * 2);
      return lento && it.stock * it.costo >= aj.montoMinimo;
    }).map(function (it) {
      var monto = it.stock * it.costo, margen = margenPorInv.get(it) || 0;
      return { it: it, monto: monto, margen: margen, gmroi: monto ? margen / monto : null, lineaN: lineaDe(it.linea) };
    }).sort(function (a, b) { return b.monto - a.monto; });

    items.filter(function (i) { return i.tipo === 'sincosto'; }).forEach(function (i) {
      alerta('alta', i, 'Venta sin costo registrado', 'Se vendieron ' + u.dinero(i.venta) + ' con costo cero.', 'Cargar el costo del producto; el margen aparece inflado.', 'sin-costo');
    });
    var bonif = items.filter(function (i) { return i.tipo === 'bonificacion' && i.cant > 0; });
    var ajustes = items.filter(function (i) { return i.tipo === 'ajuste'; });

    // Precio de lista por debajo del costo en el inventario
    var listaBajo = inv.filter(function (it) { return it.activo && it.precio > 0 && it.costo > 0 && it.precio < it.costo; }).map(function (it) {
      return { it: it, ratio: it.costo / it.precio, empaque: it.costo / it.precio >= 3 };
    });
    listaBajo.forEach(function (x) {
      var it = x.it;
      var i = { nombre: it.nombre, mod: it.mod || 'gen', cod: it.cod, lineaN: lineaDe(it.linea) };
      if (x.empaque) {
        alerta('media', i, 'Precio y costo en unidades distintas',
          'Precio ' + u.dinero(it.precio) + ' contra costo ' + u.dinero(it.costo) + ' (' + u.uno(x.ratio) + ' veces).',
          'Revisar si el costo está por caja y el precio por unidad.', 'empaque');
      } else {
        alerta('alta', i, 'Precio de lista por debajo del costo',
          'Precio ' + u.dinero(it.precio) + ' contra costo ' + u.dinero(it.costo) + ' en el inventario.',
          'Corregir el precio de lista antes de la próxima venta.', 'lista-bajo-costo');
      }
    });

    var orden = { critica: 0, alta: 1, media: 2, info: 3 };
    alertas.sort(function (a, b) { return (orden[a.sev] - orden[b.sev]) || ((a.i.margen || 0) - (b.i.margen || 0)); });

    // Totales y líneas
    var tot = { venta: 0, costo: 0, margen: 0 }, porMod = {};
    items.forEach(function (i) {
      tot.venta += i.venta; tot.costo += i.costo; tot.margen += i.margen;
      var pm = porMod[i.mod] = porMod[i.mod] || { venta: 0, costo: 0, margen: 0, fuente: fuenteRent[i.mod] || 'ventas' };
      pm.venta += i.venta; pm.costo += i.costo; pm.margen += i.margen;
    });
    tot.mpct = tot.venta ? tot.margen / tot.venta * 100 : null;
    Object.keys(porMod).forEach(function (m) { porMod[m].mpct = porMod[m].venta ? porMod[m].margen / porMod[m].venta * 100 : null; });

    var porLinea = {};
    items.forEach(function (i) {
      var k = i.lineaN || 'Sin línea';
      var pl = porLinea[k] = porLinea[k] || { nombre: k, venta: 0, costo: 0, margen: 0, productos: 0, invCosto: 0, alertas: 0 };
      pl.venta += i.venta; pl.costo += i.costo; pl.margen += i.margen; pl.productos++;
    });
    inv.forEach(function (it) {
      if (!it.activo || it.costo == null || it.stock <= 0) return;
      var k = lineaDe(it.linea) || 'Sin línea';
      if (porLinea[k]) porLinea[k].invCosto += it.stock * it.costo;
    });
    alertas.forEach(function (a) { var k = a.i.lineaN || 'Sin línea'; if (porLinea[k]) porLinea[k].alertas++; });
    var lineasR = Object.keys(porLinea).map(function (k) {
      var pl = porLinea[k];
      pl.mpct = pl.venta ? pl.margen / pl.venta * 100 : null;
      pl.gmroi = pl.invCosto ? pl.margen / pl.invCosto : null;
      return pl;
    }).sort(function (a, b) { return b.venta - a.venta; });

    var invCostoTotal = inv.reduce(function (s, it) { return s + (it.activo && it.costo != null && it.stock > 0 ? it.stock * it.costo : 0); }, 0);

    return {
      totales: tot, porModulo: porMod, fuente: fuenteRent,
      periodos: { mv: estado.rentabilidad.mv && estado.rentabilidad.mv.periodo, mb: estado.rentabilidad.mb && estado.rentabilidad.mb.periodo },
      productos: items.filter(function (i) { return i.tipo === 'producto' || i.tipo === 'devolucion' || i.tipo === 'sincosto'; }),
      alertas: alertas, lineas: lineasR, bonificaciones: bonif, ajustes: ajustes,
      ajustesTotal: ajustes.reduce(function (s, i) { return s + i.venta; }, 0),
      invCosto: invCostoTotal, gmroi: invCostoTotal ? tot.margen / invCostoTotal : null,
      listaBajoCosto: listaBajo,
      inmovilizado: inmovilizado,
      inmovilizadoTotal: inmovilizado.reduce(function (s, x) { return s + x.monto; }, 0)
    };
  }

  /* ---------- Líneas medidas ---------- */
  function lineas(A, inv, V, catLineas, lineaDe, estado) {
    var mapa = {};
    function get(nombre) {
      var n = nombre || 'Sin línea';
      var k = L.claveGrupo(n) || 'SIN LINEA';
      return mapa[k] = mapa[k] || { clave: k, nombre: n, productos: 0, venta: 0, uds: 0, coberturas: [], margen: 0, ventaR: 0, fotos: [], alertas: 0 };
    }
    inv.forEach(function (it) {
      if (!it.activo) return;
      var g = get(lineaDe(it.linea));
      g.productos++;
      if (it.rot && isFinite(it.rot.cobertura) && it.rot.cobertura > 0) g.coberturas.push(it.rot.cobertura);
    });
    if (V) V.productos.forEach(function (p) { var g = get(p.lineaN || lineaDe(p.linea)); g.venta += p.venta; g.uds += p.uds; if (!inv.length) g.productos++; });
    if (A.rentabilidad) {
      A.rentabilidad.lineas.forEach(function (pl) { var g = get(pl.nombre); g.margen = pl.margen; g.ventaR = pl.venta; g.alertas = pl.alertas; });
    }
    (estado.fotos || []).forEach(function (f) { get(lineaDe(f.linea) || f.linea).fotos.push(f); });
    var totalVenta = Object.keys(mapa).reduce(function (s, k) { return s + Math.max(mapa[k].venta, 0); }, 0);
    return Object.keys(mapa).map(function (k) {
      var g = mapa[k];
      g.cobMed = u.mediana(g.coberturas);
      g.part = totalVenta ? g.venta / totalVenta * 100 : null;
      g.mpct = g.ventaR ? g.margen / g.ventaR * 100 : null;
      return g;
    }).sort(function (a, b) { return (b.fotos.length - a.fotos.length) || (b.venta - a.venta); });
  }

  VJ.an = { analizar: analizar, combinarVentas: combinarVentas, fuentesActivas: fuentesActivas, indexar: indexar, buscar: buscar };
})(window);
