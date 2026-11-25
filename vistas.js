/*!
 * VENEJUGOS 2015, tablero comercial.
 * Copyright (c) 2026 DISTRIBUIDORA VENEJUGOS 2015, C.A. Todos los derechos reservados.
 * Uso interno exclusivo. Prohibida su copia, distribucion o modificacion sin autorizacion escrita.
 *
 * Todo texto que proviene de los archivos pasa por u.esc() antes de llegar al HTML.
 */
(function (global) {
  'use strict';
  var VJ = global.VJ = global.VJ || {};
  var C = global.VJ_CONFIG;
  var u = VJ.u, esc = u.esc;
  var PAGINA = 50;

  function $(id) { return document.getElementById(id); }

  /* ---------- Piezas comunes ---------- */
  function kpi(etq, valor, nota, clase) {
    valor = String(valor).replace(/^US\$ /, '<span class="moneda">US$</span>');
    return '<div class="kpi ' + (clase || '') + '"><div class="kpi-etq">' + esc(etq) + '</div><div class="kpi-valor">' + valor + '</div>' +
      (nota ? '<div class="kpi-nota">' + nota + '</div>' : '') + '</div>';
  }
  function td(contenido, etiqueta, clase) {
    return '<td' + (clase ? ' class="' + clase + '"' : '') + ' data-label="' + esc(etiqueta) + '">' + contenido + '</td>';
  }
  function celdaProd(nombre, cod, mod, linea, rotulo) {
    var meta = '';
    if (cod) meta += '<span>' + esc(cod) + '</span>';
    if (mod && u.MODULOS[mod]) meta += '<span>' + esc(u.MODULOS[mod]) + '</span>';
    if (linea !== undefined) meta += u.etiqueta(linea);
    return '<td class="td-prod" data-label="' + esc(rotulo || 'Producto') + '"><div class="prod-nombre">' + esc(nombre) + '</div>' +
      (meta ? '<div class="prod-meta">' + meta + '</div>' : '') + '</td>';
  }
  function tabla(cabeceras, filas, clase) {
    return '<div class="tabla-cont"><table class="tabla ' + (clase || '') + '"><thead><tr>' +
      cabeceras.map(function (c) { return '<th scope="col"' + (c.num ? ' class="num"' : '') + '>' + esc(c.t) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + filas.join('') + '</tbody></table></div>';
  }
  function vacio(titulo, texto, ir) {
    return '<div class="tarjeta vacio-estado"><h2>' + esc(titulo) + '</h2><p>' + esc(texto) + '</p>' +
      (ir ? '<button class="btn btn-primario" type="button" data-ir="' + ir + '">Ir a Carga de datos</button>' : '') + '</div>';
  }
  function mas(clave, mostrados, total) {
    if (total <= mostrados) return total > PAGINA ? '<p class="mas">Mostrando los ' + u.entero(total) + '.</p>' : '';
    return '<div class="mas"><span>Mostrando ' + u.entero(mostrados) + ' de ' + u.entero(total) + '.</span>' +
      '<button class="btn btn-sec btn-chico" type="button" data-mas="' + clave + '">Mostrar ' + Math.min(PAGINA, total - mostrados) + ' más</button></div>';
  }
  function opciones(lista, valor, todos) {
    return '<option value="">' + esc(todos) + '</option>' + lista.map(function (o) {
      var v = typeof o === 'string' ? o : o.v, t = typeof o === 'string' ? o : o.t;
      return '<option value="' + esc(v) + '"' + (v === valor ? ' selected' : '') + '>' + esc(t) + '</option>';
    }).join('');
  }
  function pctSigno(n) { return (n > 0 ? '+' : '') + u.pct(n); }
  function difTexto(n) { return '<span class="' + (n < 0 ? 'neg' : '') + '">' + pctSigno(n) + '</span>'; }
  var normNombre = global.VJLectores.utilidades.normNombre;
  function coincide(texto, q) { return !q || normNombre(texto).indexOf(q) > -1; }
  function normQ(q) { return normNombre(String(q || '').trim()); }

  // Anchos de barras: se aplican por CSSOM (la política de seguridad no permite estilos en línea).
  function aplicarBarras(raiz) {
    u.qsa('[data-w]', raiz).forEach(function (el) { el.style.setProperty('--w', Math.max(0, Math.min(100, +el.getAttribute('data-w'))) + '%'); });
  }

  function cabezaSeccion(titulo, bajada) {
    return '<div class="seccion-cab"><div><h1 class="seccion-titulo">' + esc(titulo) + '</h1>' +
      (bajada ? '<p class="bajada">' + esc(bajada) + '</p>' : '') + '</div></div>';
  }

  var TITULARES = {
    ventas: ['Validación de ventas', 'Precios contra costo, obsequios, devoluciones y cuadre con la rentabilidad.'],
    inventario: ['Rotación del inventario', 'Cobertura en días, colocación sugerida y vencimientos.'],
    rentabilidad: ['Rentabilidad', 'Márgenes por producto y por línea, alertas y capital inmovilizado.'],
    unificacion: ['Unificación de productos', 'Une los códigos de MobilVendor y de Módulo B que son el mismo producto.']
  };

  function candado(modulo) {
    var titulos = { rentabilidad: 'Rentabilidad protegida', ventas: 'Ventas protegidas', inventario: 'Inventario protegido', unificacion: 'Unificación protegida' };
    var motivo = modulo === 'unificacion' ?
      'Aquí se comparan los precios y costos de los dos módulos. Escribe la clave de acceso para verlos.' :
      'Aquí hay costos y márgenes de la empresa. Escribe la clave de acceso para verlos.';
    return cabezaSeccion(TITULARES[modulo][0], TITULARES[modulo][1]) +
      '<div class="tarjeta candado-tarjeta"><h2>' + titulos[modulo] + '</h2>' +
      '<p class="bajada">' + motivo + '</p>' +
      '<form class="form-clave" data-form-clave="' + modulo + '" novalidate>' +
      '<label for="clave-' + modulo + '">Clave de acceso</label>' +
      '<div class="fila"><input type="password" id="clave-' + modulo + '" autocomplete="current-password" spellcheck="false">' +
      '<button class="btn btn-accion" type="submit">Desbloquear</button></div>' +
      '<p class="mensaje-error" data-error-clave role="alert"></p></form>' +
      '<p class="carga-nota">Se vuelve a bloquear tras ' + C.bloqueo.inactividadMinutos + ' minutos sin uso y al cerrar la pestaña.</p></div>';
  }

  /* ---------- Encabezado e insignias ---------- */
  function cabecera(A, estado, cargados) {
    var V = A.ventas, I = A.inventario;
    $('st-venta').textContent = V ? u.compacto(V.totales.venta) : 'Sin datos';
    $('st-venta-nota').textContent = V ? 'US$, del ' + u.fecha(V.desde).slice(0, 5) + ' al ' + u.fecha(V.hasta).slice(0, 5) : 'Carga las ventas';
    $('st-bajo').textContent = V ? u.entero(V.bajoCosto.productos.length) : 'Sin datos';
    $('st-bajo-nota').textContent = V ? 'productos, ' + u.entero(V.bajoCosto.lineas) + ' líneas' : 'Productos vendidos';
    $('st-mov').textContent = I && V ? u.entero(I.kpis.sinMov) : 'Sin datos';
    $('st-mov-nota').textContent = I && V ? 'productos con stock' : (I ? 'Faltan las ventas' : 'Productos con stock');
    $('st-arch').textContent = cargados.n + ' de ' + cargados.total;
    $('st-arch-nota').textContent = estado.ventas.modo === 'dinamica' ? 'Modalidad agrupada' : 'Modalidad directa';

    insignia('b-carga', cargados.n, true);
    insignia('b-ventas', V ? V.bajoCosto.productos.length : 0);
    insignia('b-inventario', I && V ? I.kpis.quiebre + I.kpis.agotados : 0);
    var urgentes = A.rentabilidad ? A.rentabilidad.alertas.filter(function (a) { return a.sev === 'critica' || a.sev === 'alta'; }).length : 0;
    insignia('b-rentabilidad', VJ.seg.protegido('rentabilidad') ? 0 : urgentes);
    insignia('b-unificacion', VJ.seg.protegido('unificacion') || !A.unificacion ? 0 : A.unificacion.kpis.sugerencias);
    u.qsa('[data-protegida]').forEach(function (b) {
      var abierta = !VJ.seg.protegido(b.getAttribute('data-tab'));
      b.classList.toggle('abierta', abierta);
      var s = b.querySelector('.estado-candado');
      if (s) s.textContent = abierta ? '(desbloqueada)' : '(protegida)';
    });
    insignia('b-lineas', estado.fotos.length);
  }
  function insignia(id, n, siempre) {
    var el = $(id);
    el.textContent = u.entero(n);
    el.hidden = !siempre && !n;
  }

  /* ---------- Casillas de carga ---------- */
  function ranura(id, info) {
    var el = $('r-' + id);
    if (!el) return;
    el.setAttribute('data-estado', info.estado);
    var chip = el.querySelector('[data-chip]');
    var textos = { vacio: 'Pendiente', leyendo: 'Leyendo', listo: 'Listo', error: 'Revisar' };
    chip.textContent = textos[info.estado] || 'Pendiente';
    var caja = el.querySelector('[data-info]');
    if (info.estado === 'vacio') { caja.innerHTML = ''; return; }
    if (info.estado === 'leyendo') {
      caja.innerHTML = '<p class="info-archivo">' + esc(info.nombre) + '</p><ul class="info-lista"><li>Leyendo ' + esc(u.mb(info.bytes)) +
        '. Lleva <span data-segundos>0</span> s.</li></ul><div class="progreso" aria-hidden="true"></div>';
      return;
    }
    if (info.estado === 'error') {
      caja.innerHTML = (info.nombre ? '<p class="info-archivo">' + esc(info.nombre) + '</p>' : '') + '<p class="info-error">' + esc(info.error) + '</p>';
      return;
    }
    caja.innerHTML = '<p class="info-archivo">' + esc(info.nombre) + '</p><ul class="info-lista">' +
      info.lineas.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>' +
      (info.aviso ? '<p class="info-aviso">' + esc(info.aviso) + '</p>' : '') +
      '<div class="info-acciones"><button class="btn btn-sec btn-chico" type="button" data-accion="reemplazar" data-ranura="' + id + '">Reemplazar</button>' +
      '<button class="btn btn-sec btn-chico" type="button" data-accion="quitar" data-ranura="' + id + '">Quitar</button></div>';
  }

  /* ---------- Ventas ---------- */
  function ventas(A, estado, ui) {
    var cont = $('v-ventas');
    if (VJ.seg.protegido('ventas')) { cont.innerHTML = candado('ventas'); return; }
    if (!A.ventas) {
      cont.innerHTML = cabezaSeccion(TITULARES.ventas[0], TITULARES.ventas[1]) + vacio('Aún no hay ventas cargadas', 'Carga la dinámica o los archivos directos de MobilVendor y Módulo B en la pestaña Carga de datos.', 'carga');
      return;
    }
    var V = A.ventas, f = ui.filtros.ventas;
    var mods = Object.keys(V.porModulo).filter(function (m) { return u.MODULOS[m]; });
    var lineas = {};
    V.bajoCosto.productos.forEach(function (b) { if (b.p.lineaN) lineas[b.p.lineaN] = 1; });

    var h = '<div class="seccion-cab"><div><h1 class="seccion-titulo">Validación de ventas</h1>' +
      '<p class="bajada">Del ' + u.fecha(V.desde) + ' al ' + u.fecha(V.hasta) + ', ' + V.diasOp + ' días con despacho. Modalidad: ' +
      (estado.ventas.modo === 'dinamica' ? 'agrupado (dinámica)' : 'archivos directos') + '.</p></div></div>';

    h += '<div class="kpis">' +
      kpi('Venta neta', u.dinero(V.totales.venta), u.entero(V.docs) + ' documentos, ' + u.entero(V.clientes) + ' clientes', 'kpi-marca') +
      kpi('Vendidos bajo costo', u.entero(V.bajoCosto.productos.length) + ' productos', u.entero(V.bajoCosto.lineas) + ' líneas de factura', V.bajoCosto.lineas ? 'kpi-error' : '') +
      kpi('Pérdida por vender bajo costo', u.dinero(V.bajoCosto.perdida), 'Costo menos precio neto, por unidad vendida', V.bajoCosto.perdida > 0 ? 'kpi-error' : '') +
      kpi('Obsequios a precio cero', u.entero(V.obsequios.lineas) + ' líneas', u.dinero(V.obsequiosCosto) + ' a costo') +
      kpi('Devoluciones', u.dinero(V.devTotal), u.entero(V.devUds) + ' unidades devueltas' +
        (V.caducidad.lineas ? '; ' + u.dinero(V.caducidad.monto) + ' con razón «CADUCA»' : '')) +
      (A.hay.inv ? kpi('Vendidos sin ficha', u.entero(V.sinFicha.length), 'Productos que no están en el inventario') : '') +
      '</div>';

    // Bajo costo
    h += '<div class="tarjeta" id="t-bajo-costo"><div class="seccion-cab"><div><h2>Productos vendidos por debajo del costo</h2>' +
      '<p class="bajada">Líneas de factura donde el precio neto por unidad, después de descuentos, quedó por debajo del costo unitario del sistema. Las líneas con precio cero van aparte, como obsequios.</p></div></div>' +
      '<div class="filtros">' +
      (mods.length > 1 ? '<div class="filtro"><label for="fv-mod">Módulo</label><select id="fv-mod" data-filtro="ventas.mod">' +
        opciones(mods.map(function (m) { return { v: m, t: u.MODULOS[m] }; }), f.mod, 'Todos') + '</select></div>' : '') +
      '<div class="filtro"><label for="fv-linea">Línea (marca)</label><select id="fv-linea" data-filtro="ventas.linea">' + opciones(Object.keys(lineas).sort(), f.linea, 'Todas') + '</select></div>' +
      '<div class="filtro filtro-ancho"><label for="fv-q">Buscar producto o código</label><input type="search" id="fv-q" data-filtro="ventas.q" value="' + esc(f.q) + '" autocomplete="off"></div>' +
      '</div><div id="tb-bajo-costo"></div></div>';

    // Cuadre con rentabilidad
    var cuadre = Object.keys(V.cuadre);
    if (cuadre.length) {
      h += '<div class="tarjeta"><h2>Cuadre con los reportes de rentabilidad</h2>' +
        '<p class="bajada">Compara la venta de los archivos de ventas con la del reporte de rentabilidad de cada módulo. Una diferencia por fechas es normal; una diferencia en el mismo período merece revisión.</p>' +
        cuadre.map(function (m) { return bloqueCuadre(m, V.cuadre[m]); }).join('') + '</div>';
    }

    // Obsequios
    if (V.obsequios.productos.length) {
      h += '<div class="tarjeta"><h2>Obsequios a precio cero</h2><p class="bajada">Líneas con descuento del 100 % o precio cero. Confirmar que sean bonificaciones autorizadas.</p>' +
        tabla([{ t: 'Producto' }, { t: 'Líneas', num: 1 }, { t: 'Unidades', num: 1 }, { t: 'Costo regalado', num: 1 }],
          V.obsequios.productos.map(function (o) {
            return '<tr>' + celdaProd(o.p.nombre, o.p.cod, o.p.mod, o.p.lineaN) + td(u.entero(o.lineas), 'Líneas', 'num') +
              td(u.entero(o.uds), 'Unidades', 'num') + td(u.dinero(o.costo), 'Costo regalado', 'num') + '</tr>';
          })) + '</div>';
    }

    // Devoluciones y sin ficha
    h += '<div class="dos-col">';
    var conCad = V.caducidad.lineas > 0;
    h += '<div class="tarjeta"><h2>Devoluciones</h2><p class="bajada">Productos con más monto devuelto en el período.' +
      (conCad ? ' La columna «Por caducidad» cuenta las unidades devueltas con razón «CADUCA».' : '') + '</p>' +
      (V.devoluciones.length ? tabla([{ t: 'Producto' }, { t: 'Unidades', num: 1 }].concat(conCad ? [{ t: 'Por caducidad', num: 1 }] : []).concat([{ t: 'Monto', num: 1 }]),
        V.devoluciones.map(function (p) {
          return '<tr>' + celdaProd(p.nombre, p.cod, p.mod) + td(u.entero(p.udsD), 'Unidades', 'num') +
            (conCad ? td(u.entero(p.cadU || 0), 'Por caducidad', 'num') : '') + td(u.dinero(p.ventaD), 'Monto', 'num') + '</tr>';
        })) : '<p class="nota-base">No hubo devoluciones.</p>') + '</div>';
    if (A.hay.inv) {
      h += '<div class="tarjeta"><h2>Vendidos sin ficha de inventario</h2><p class="bajada">Se vendieron pero su código no aparece en el inventario cargado. Revisar si falta el producto o si cambió el código.</p><div id="tb-sin-ficha"></div></div>';
    }
    h += '</div>';
    if (V.ajustes.lineas) {
      h += '<p class="nota-base">Descuentos por pronto pago y diferencias de precio: ' + esc(u.dinero(V.ajustes.monto)) + ' en ' +
        u.entero(V.ajustes.lineas) + ' líneas. Ya están restados de la venta neta.</p>';
    }
    cont.innerHTML = h;
    ventasTablas(A, ui);
  }

  function bloqueCuadre(m, c) {
    var pv = c.periodoV, pr = c.periodoR || {};
    var nota = '';
    if (pr.emitido && pv.hasta && pr.emitido > pv.hasta) {
      nota = 'Las ventas llegan al ' + u.fecha(pv.hasta) + ' y el reporte se emitió el ' + u.fecha(pr.emitido) + ': parte de la diferencia son ventas posteriores al ' + u.fecha(pv.hasta) + '.';
    } else if (pv.hasta && pr.hasta && pr.hasta < pv.hasta) {
      nota = 'El reporte termina antes que las ventas: compara el mismo período antes de sacar conclusiones.';
    }
    return '<h3 class="ranura-titulo">' + esc(u.MODULOS[m]) + '</h3>' +
      '<div class="kpis">' +
      kpi('Archivo de ventas', u.dinero(c.ventas), 'Del ' + u.fecha(pv.desde) + ' al ' + u.fecha(pv.hasta)) +
      kpi('Reporte de rentabilidad', u.dinero(c.rent), 'Período ' + u.fecha(pr.desde) + ' al ' + u.fecha(pr.hasta) + (pr.emitido ? ', emitido el ' + u.fecha(pr.emitido) : '')) +
      kpi('Diferencia', u.dinero(c.dif), (c.difPct != null ? pctSigno(c.difPct) + ' frente al reporte. ' : '') + u.entero(c.conDiferencia) + ' productos con diferencia') +
      '</div>' + (nota ? '<p class="nota-base">' + nota + '</p>' : '') +
      (c.top.length ? tabla([{ t: 'Producto' }, { t: 'Ventas', num: 1 }, { t: 'Rentabilidad', num: 1 }, { t: 'Diferencia', num: 1 }],
        c.top.map(function (d) {
          return '<tr>' + celdaProd(d.nombre) + td(u.dinero(d.ventas), 'Ventas', 'num') + td(u.dinero(d.rent), 'Rentabilidad', 'num') +
            td('<span class="' + (d.dif < 0 ? 'neg' : '') + '">' + u.dinero(d.dif) + '</span>', 'Diferencia', 'num') + '</tr>';
        })) : '');
  }

  function ventasTablas(A, ui) {
    var V = A.ventas;
    if (!V) return;
    var f = ui.filtros.ventas, q = normQ(f.q);
    var lista = V.bajoCosto.productos.filter(function (b) {
      return (!f.mod || b.p.mod === f.mod) && (!f.linea || b.p.lineaN === f.linea) &&
        (coincide(b.p.nombre, q) || coincide(b.p.cod, q));
    });
    var caja = $('tb-bajo-costo');
    if (caja) {
      if (!V.bajoCosto.productos.length) {
        caja.innerHTML = '<p class="nota-base">Ninguna línea quedó por debajo del costo. Bien.</p>';
      } else if (!lista.length) {
        caja.innerHTML = '<p class="nota-base">Ningún producto coincide con el filtro.</p>';
      } else {
        var n = Math.min(lista.length, ui.paginas['bajo-costo'] || PAGINA);
        var filas = [];
        lista.slice(0, n).forEach(function (b, i) {
          var abierto = ui.abiertos[b.p.k];
          var idDet = 'det-' + i;
          filas.push('<tr>' + celdaProd(b.p.nombre, b.p.cod, b.p.mod, b.p.lineaN) +
            td(u.entero(b.lineas.length), 'Líneas', 'num') + td(u.entero(b.uds), 'Unidades', 'num') +
            td('<span class="precio">' + u.precio(b.pmin) + '</span>', 'Precio mínimo', 'num') +
            td('<span class="precio">' + u.precio(b.cu) + '</span>', 'Costo', 'num') +
            td(difTexto(b.difPct), 'Diferencia', 'num') +
            td('<span class="neg">' + u.dinero(b.perdida) + '</span>', 'Pérdida', 'num') +
            td('<button class="btn btn-sec btn-chico" type="button" data-detalle="' + esc(b.p.k) + '" aria-expanded="' + (abierto ? 'true' : 'false') + '" aria-controls="' + idDet + '">' +
              (abierto ? 'Ocultar facturas' : 'Ver facturas') + '</button>', 'Facturas', 'td-sin-etq') + '</tr>');
          filas.push('<tr class="fila-detalle" id="' + idDet + '"' + (abierto ? '' : ' hidden') + '><td colspan="8">' + detalleFacturas(b) + '</td></tr>');
        });
        caja.innerHTML = tabla([{ t: 'Producto' }, { t: 'Líneas', num: 1 }, { t: 'Unidades', num: 1 }, { t: 'Precio mínimo (US$)', num: 1 },
          { t: 'Costo (US$)', num: 1 }, { t: 'Diferencia', num: 1 }, { t: 'Pérdida', num: 1 }, { t: 'Facturas' }], filas) + mas('bajo-costo', n, lista.length);
      }
    }
    var cajaSF = $('tb-sin-ficha');
    if (cajaSF) {
      var sf = V.sinFicha.filter(function (p) { return (!f.mod || p.mod === f.mod) && (coincide(p.nombre, q) || coincide(p.cod, q)); });
      var nsf = Math.min(sf.length, ui.paginas['sin-ficha'] || 15);
      cajaSF.innerHTML = sf.length ? tabla([{ t: 'Producto' }, { t: 'Venta', num: 1 }, { t: 'Unidades', num: 1 }],
        sf.slice(0, nsf).map(function (p) {
          return '<tr>' + celdaProd(p.nombre, p.cod, p.mod) + td(u.dinero(p.venta), 'Venta', 'num') + td(u.entero(p.uds), 'Unidades', 'num') + '</tr>';
        })) + mas('sin-ficha', nsf, sf.length) : '<p class="nota-base">Todos los productos vendidos tienen ficha.</p>';
    }
  }

  function detalleFacturas(b) {
    return '<table class="tabla sub-tabla"><thead><tr><th scope="col">Fecha</th><th scope="col">Documento</th><th scope="col">Cliente</th>' +
      '<th scope="col">Vendedor</th><th scope="col">Ruta</th><th scope="col" class="num">Unid.</th><th scope="col" class="num">Precio</th>' +
      '<th scope="col" class="num">Desc.</th><th scope="col" class="num">Pérdida</th></tr></thead><tbody>' +
      b.lineas.map(function (l) {
        return '<tr>' + td(u.fecha(l.fecha), 'Fecha') + td(esc(l.doc), 'Documento') + td(esc(l.cliN || l.cli), 'Cliente') +
          td(esc(l.ven), 'Vendedor') + td(esc(l.ruta), 'Ruta') + td(u.entero(l.cant), 'Unidades', 'num') +
          td(u.precio(l.pu), 'Precio', 'num') + td(l.desc ? u.uno(l.desc) + ' %' : '0', 'Descuento', 'num') +
          td(u.dinero(l.perdida), 'Pérdida', 'num') + '</tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------- Inventario ---------- */
  var ESTADOS = {
    'agotado': { t: 'Agotado con demanda', orden: 0 },
    'quiebre': { t: 'Riesgo de quiebre', orden: 1 },
    'sin-mov': { t: 'Sin movimiento', orden: 2 },
    'baja': { t: 'Rotación baja', orden: 3 },
    'normal': { t: 'Normal', orden: 4 },
    'sin-existencia': { t: 'Sin existencia', orden: 5 },
    'sin-datos': { t: 'Faltan ventas', orden: 6 }
  };
  function chipEstado(e) { return '<span class="estado-rot e-' + e + '"><i aria-hidden="true"></i>' + esc((ESTADOS[e] || ESTADOS['sin-datos']).t) + '</span>'; }

  function inventario(A, estado, ui) {
    var cont = $('v-inventario');
    if (VJ.seg.protegido('inventario')) { cont.innerHTML = candado('inventario'); return; }
    if (!A.inventario) {
      cont.innerHTML = cabezaSeccion(TITULARES.inventario[0], TITULARES.inventario[1]) + vacio('Aún no hay inventario cargado', 'Carga el Excel del inventario general en la pestaña Carga de datos. Con las ventas cargadas, aquí verás la rotación, la cobertura en días y dónde colocar cada producto.', 'carga');
      return;
    }
    var I = A.inventario, aj = estado.ajustes, k = I.kpis;
    var h = '<div class="seccion-cab"><div><h1 class="seccion-titulo">Rotación del inventario</h1><p class="bajada">Inventario del ' + u.fecha(I.baseFecha) + ' (fecha del archivo). ' +
      (A.hay.ventas ? 'Ventas del ' + u.fecha(A.ventas.desde) + ' al ' + u.fecha(A.ventas.hasta) + ': ' + I.diasOp + ' días con despacho. La cobertura cuenta días con despacho.' : 'Carga las ventas para medir la rotación.') +
      '</p></div></div>';

    h += '<div class="tarjeta ajustes" role="group" aria-label="Umbrales de rotación">' +
      ajuste('bajaDias', 'Rotación baja desde', aj.bajaDias, 'días de cobertura', 5, 365) +
      ajuste('quiebreDias', 'Riesgo de quiebre con menos de', aj.quiebreDias, 'días', 1, 60) +
      ajuste('vencDias', 'Avisar vencimientos a', aj.vencDias, 'días', 1, 365) + '</div>';

    h += '<div class="kpis">' +
      kpi('Productos activos', u.entero(k.activos), u.entero(I.inactivos) + ' inactivos' + (I.inactivosConStock ? ', ' + u.entero(I.inactivosConStock) + ' de ellos con stock' : ''), 'kpi-marca') +
      kpi('Cobertura mediana', A.hay.ventas ? u.dias(k.coberturaMed) : 'n/d', 'Días de despacho que alcanza el stock') +
      kpi('Sin movimiento', A.hay.ventas ? u.entero(k.sinMov) : 'n/d', 'Con stock y sin ventas en el período') +
      kpi('Rotación baja', A.hay.ventas ? u.entero(k.baja) : 'n/d', 'Más de ' + aj.bajaDias + ' días de cobertura') +
      kpi('Riesgo de quiebre', A.hay.ventas ? u.entero(k.quiebre) : 'n/d', 'Menos de ' + aj.quiebreDias + ' días de cobertura') +
      kpi('Agotados con demanda', A.hay.ventas ? u.entero(k.agotados) : 'n/d', 'Sin stock y con ventas', k.agotados ? 'kpi-error' : '') +
      '</div>';

    var f = ui.filtros.inventario;
    var cuentas = {};
    I.items.forEach(function (it) { cuentas[it.rot.estado] = (cuentas[it.rot.estado] || 0) + 1; });
    var lineas = {};
    I.items.forEach(function (it) { if (it.rot.lineaN) lineas[it.rot.lineaN] = 1; });
    var chips = '<button class="fchip" type="button" data-fchip="inventario.estado" data-valor="" aria-pressed="' + (!f.estado) + '">Todos <b>' + u.entero(I.items.length) + '</b></button>' +
      Object.keys(ESTADOS).filter(function (e) { return cuentas[e]; }).map(function (e) {
        return '<button class="fchip" type="button" data-fchip="inventario.estado" data-valor="' + e + '" aria-pressed="' + (f.estado === e) + '">' +
          esc(ESTADOS[e].t) + ' <b>' + u.entero(cuentas[e]) + '</b></button>';
      }).join('');

    h += '<div class="tarjeta"><div class="seccion-cab"><div><h2>Rotación y colocación</h2>' +
      '<p class="bajada">Cobertura: cuántos días de despacho alcanza el stock al ritmo de venta del período. La sugerencia compara cada producto con sus similares de la misma sublínea: dónde se venden y cuánto rotan.</p></div></div>' +
      '<div class="fchips" role="group" aria-label="Filtrar por estado">' + chips + '</div>' +
      '<div class="filtros"><div class="filtro"><label for="fi-linea">Línea (marca)</label><select id="fi-linea" data-filtro="inventario.linea">' + opciones(Object.keys(lineas).sort(), f.linea, 'Todas') + '</select></div>' +
      '<div class="filtro filtro-ancho"><label for="fi-q">Buscar producto o código</label><input type="search" id="fi-q" data-filtro="inventario.q" value="' + esc(f.q) + '" autocomplete="off"></div></div>' +
      '<div id="tb-rotacion"></div><p class="nota-base">Clase ABC: A son los productos que suman el 80 % de la venta; B, el siguiente 15 %; C, el resto.</p></div>';

    h += '<div class="tarjeta" id="t-venc"><h2>Vencimientos</h2>' + vencimientos(I) + caducados(A) + '</div>';
    h += '<div class="tarjeta"><h2>Calidad del inventario</h2>' + calidad(I) + '</div>';
    cont.innerHTML = h;
    inventarioTabla(A, ui);
  }

  function ajuste(clave, antes, valor, despues, min, max) {
    var id = 'aj-' + clave;
    return '<div class="ajuste"><label for="' + id + '">' + esc(antes) + '</label><input type="number" id="' + id + '" data-ajuste="' + clave + '" min="' + min + '" max="' + max +
      '" step="1" value="' + valor + '" inputmode="numeric"><span>' + esc(despues) + '</span></div>';
  }

  function inventarioTabla(A, ui) {
    var caja = $('tb-rotacion');
    if (!caja || !A.inventario) return;
    var f = ui.filtros.inventario, q = normQ(f.q);
    var lista = A.inventario.items.filter(function (it) {
      return (!f.estado || it.rot.estado === f.estado) && (!f.linea || it.rot.lineaN === f.linea) && (coincide(it.nombre, q) || coincide(it.cod, q));
    }).sort(function (a, b) {
      var oa = (ESTADOS[a.rot.estado] || ESTADOS['sin-datos']).orden, ob = (ESTADOS[b.rot.estado] || ESTADOS['sin-datos']).orden;
      if (oa !== ob) return oa - ob;
      if (a.rot.estado === 'quiebre') return a.rot.cobertura - b.rot.cobertura;
      if (a.rot.estado === 'baja') return b.rot.cobertura - a.rot.cobertura;
      if (a.rot.estado === 'sin-mov') return b.stock - a.stock;
      return b.rot.venta - a.rot.venta;
    });
    if (!lista.length) { caja.innerHTML = '<p class="nota-base">Ningún producto coincide con el filtro.</p>'; return; }
    var n = Math.min(lista.length, ui.paginas.rotacion || PAGINA);
    caja.innerHTML = tabla([{ t: 'Producto' }, { t: 'Stock', num: 1 }, { t: 'Venta diaria', num: 1 }, { t: 'Cobertura', num: 1 }, { t: 'Se agota', num: 1 },
      { t: 'ABC' }, { t: 'Estado' }, { t: 'Qué hacer' }],
      lista.slice(0, n).map(function (it) {
        var r = it.rot;
        return '<tr>' + celdaProd(it.nombre, it.cod, it.mod, r.lineaN) +
          td(u.entero(it.stock) + (it.unidad ? ' ' + esc(it.unidad) : ''), 'Stock', 'num') +
          td(r.vdp == null ? 'n/d' : u.uno(r.vdp), 'Venta diaria', 'num') +
          td(r.cobertura == null ? 'n/d' : u.dias(r.cobertura), 'Cobertura', 'num') +
          td(r.agota ? u.fecha(r.agota) : 'n/d', 'Se agota', 'num') +
          td(r.abc ? esc(r.abc) : 'Sin venta', 'ABC') +
          td(chipEstado(r.estado), 'Estado') +
          td(esc(r.sugerencia || ''), 'Qué hacer', 'td-texto') + '</tr>';
      })) + mas('rotacion', n, lista.length);
  }

  function vencimientos(I) {
    var V = I.venc;
    if (!V.columna) {
      return '<p class="bajada">El inventario no trae fecha de vencimiento. Descarga el inventario actual con las columnas «Vencimiento» y «Lote», complétalas y vuelve a cargarlo: el tablero calculará qué lotes no se alcanzan a vender antes de vencer.</p>' +
        '<button class="btn btn-accion" type="button" data-accion="plantilla">Descargar inventario con columna de vencimiento</button>';
    }
    if (!V.items.length) return '<p class="nota-base">La columna de vencimiento está vacía en los productos activos.</p>';
    var niveles = { vencido: '<span class="estado-rot e-agotado"><i aria-hidden="true"></i>Vencido</span>', riesgo: '<span class="estado-rot e-quiebre"><i aria-hidden="true"></i>No alcanza a venderse</span>', proximo: '<span class="estado-rot e-baja"><i aria-hidden="true"></i>Vence pronto</span>', ok: '<span class="estado-rot e-normal"><i aria-hidden="true"></i>Se vende a tiempo</span>' };
    var lista = V.items.filter(function (x) { return x.nivel !== 'ok'; }).concat(V.items.filter(function (x) { return x.nivel === 'ok'; }));
    return '<p class="bajada">' + u.entero(V.conFecha) + ' productos con fecha. Se compara la venta diaria con los días que faltan para vencer.</p>' +
      tabla([{ t: 'Producto' }, { t: 'Lote' }, { t: 'Vence', num: 1 }, { t: 'Días', num: 1 }, { t: 'Stock', num: 1 }, { t: 'Se venden antes', num: 1 }, { t: 'Sobran', num: 1 }, { t: 'Estado' }, { t: 'Qué hacer' }],
        lista.slice(0, 200).map(function (x) {
          return '<tr>' + celdaProd(x.it.nombre, x.it.cod, x.it.mod, x.it.rot.lineaN) + td(esc(x.it.lote || 'n/d'), 'Lote') +
            td(u.fecha(x.it.venc), 'Vence', 'num') + td(u.entero(x.dias), 'Días', 'num') + td(u.entero(x.it.stock), 'Stock', 'num') +
            td(u.entero(x.vendibles), 'Se venden antes', 'num') + td(u.entero(x.exced), 'Sobran', 'num') +
            td(niveles[x.nivel], 'Estado') + td(esc(x.accion), 'Qué hacer', 'td-texto') + '</tr>';
        }));
  }

  function accionCaducado(x, r) {
    if (!r) return 'Revisar la fecha de los lotes que se despachan.';
    if (r.estado === 'sin-mov' || r.estado === 'baja') return 'Rota lento y vuelve vencido: ofrecerlo donde sí rota y revisar fechas al despachar.';
    if (x.tasa != null && x.tasa >= 10) return 'Más del 10 % de lo vendido vuelve vencido: revisar cuánto rota en cada cliente.';
    return 'Se vende, pero parte vuelve vencida: despachar primero los lotes más viejos y revisar fechas en la entrega.';
  }

  function caducados(A) {
    var C = A.ventas && A.ventas.caducidad;
    if (!C || !C.productos.length) return '';
    var lista = C.productos.slice(0, 30);
    return '<h3 class="subtitulo">Devueltos con razón «CADUCA»</h3>' +
      '<p class="bajada">' + u.entero(C.uds) + ' unidades, por ' + esc(u.dinero(-C.monto)) + ', volvieron de los clientes con razón «CADUCA» en el período. Junto a la rotación actual, muestran dónde revisar la colocación y las fechas de despacho.</p>' +
      tabla([{ t: 'Producto' }, { t: 'Devueltas', num: 1 }, { t: 'Monto', num: 1 }, { t: 'De lo vendido', num: 1 }, { t: 'Cobertura', num: 1 }, { t: 'Estado' }, { t: 'Qué hacer' }],
        lista.map(function (x) {
          var r = x.it && x.it.rot;
          return '<tr>' + celdaProd(x.p.nombre, x.p.cod, x.p.mod, x.p.lineaN) + td(u.entero(x.uds), 'Devueltas', 'num') +
            td(u.dinero(x.monto), 'Monto', 'num') +
            td(x.tasa == null ? 'Sin ventas' : x.tasa > 100 ? 'Más que lo vendido' : u.pct(x.tasa), 'De lo vendido', 'num') +
            td(r && r.cobertura != null ? u.dias(r.cobertura) : 'n/d', 'Cobertura', 'num') +
            td(r ? chipEstado(r.estado) : 'Sin ficha', 'Estado') + td(esc(accionCaducado(x, r)), 'Qué hacer', 'td-texto') + '</tr>';
        })) +
      (C.productos.length > lista.length ? '<p class="nota-base">Se muestran los ' + lista.length + ' de mayor monto, de ' + u.entero(C.productos.length) + ' productos.</p>' : '');
  }

  function calidad(I) {
    var c = I.calidad, items = [];
    c.duplicados.forEach(function (grupo) {
      items.push('Código ' + esc(grupo[0].cod) + ' repetido en ' + esc(u.MODULOS[grupo[0].mod] || 'el inventario') + ' con productos distintos: ' +
        grupo.map(function (g) { return '«' + esc(g.nombre) + '»'; }).join(' y ') + '.');
    });
    var variantes = function (lista, que) {
      lista.forEach(function (g) {
        items.push(que + ' aparece escrita de ' + Object.keys(g.variantes).length + ' formas: ' + Object.keys(g.variantes).map(function (v) { return '«' + esc(v) + '»'; }).join(', ') + '. El tablero las une como «' + esc(g.nombre) + '».');
      });
    };
    variantes(c.variantes || [], 'La línea (marca)');
    variantes(c.variantesCat || [], 'La categoría');
    if (I.inactivosConStock) items.push(u.entero(I.inactivosConStock) + ' productos marcados como inactivos todavía tienen stock.');
    if (c.stockNegativo.length) items.push(u.entero(c.stockNegativo.length) + ' productos con stock negativo: ' + c.stockNegativo.slice(0, 5).map(function (i) { return '«' + esc(i.nombre) + '»'; }).join(', ') + '.');
    if (!items.length) return '<p class="nota-base">Sin observaciones: códigos únicos y líneas consistentes.</p>';
    return '<ul class="lista-seg">' + items.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';
  }

  /* ---------- Rentabilidad ---------- */
  var SEV = { critica: 'Crítica', alta: 'Alta', media: 'Media', info: 'Informativa' };

  function rentabilidad(A, estado, ui) {
    var cont = $('v-rentabilidad');
    if (VJ.seg.protegido('rentabilidad')) { cont.innerHTML = candado('rentabilidad'); return; }
    var R = A.rentabilidad;
    var barra = '<div class="barra-estado"><span>Rentabilidad desbloqueada. Se vuelve a bloquear tras ' + C.bloqueo.inactividadMinutos + ' minutos sin uso.</span>' +
      '<button class="btn btn-sec btn-chico" type="button" data-accion="bloquear">Bloquear ahora</button></div>';
    if (!R) {
      cont.innerHTML = barra + cabezaSeccion(TITULARES.rentabilidad[0], TITULARES.rentabilidad[1]) + vacio('Aún no hay datos de rentabilidad', 'Carga los reportes de rentabilidad de MobilVendor y Módulo B. Si solo tienes las ventas, el margen se calcula con el costo de cada línea.', 'carga');
      return;
    }
    var T = R.totales, aj = estado.ajustes;
    var fuentes = Object.keys(R.porModulo).filter(function (m) { return u.MODULOS[m]; }).map(function (m) {
      var pm = R.porModulo[m];
      return esc(u.MODULOS[m]) + ': margen ' + u.pct(pm.mpct) + (pm.fuente === 'reporte' ? ' (reporte de rentabilidad)' : ' (calculado con las ventas)');
    }).join('. ');
    var h = barra;
    h += '<div class="seccion-cab"><div><h1 class="seccion-titulo">Rentabilidad</h1><p class="bajada">' + fuentes + '.</p></div></div>';
    h += '<div class="kpis">' +
      kpi('Venta', u.dinero(T.venta), 'Incluye ajustes y devoluciones', 'kpi-marca') +
      kpi('Costo', u.dinero(T.costo), '') +
      kpi('Margen bruto', u.dinero(T.margen), '', T.margen < 0 ? 'kpi-error' : '') +
      kpi('Margen sobre venta', u.pct(T.mpct), '') +
      (A.hay.inv ? kpi('Inventario a costo', u.dinero(R.invCosto), 'Stock por costo unitario') : '') +
      (A.hay.inv && R.gmroi != null ? kpi('Retorno del inventario', u.monto(R.gmroi), 'Margen del período por cada US$ 1 en inventario') : '') +
      '</div>';
    h += '<div class="tarjeta ajustes" role="group" aria-label="Umbrales de rentabilidad">' +
      ajuste('puntosSim', 'Alertar si el margen queda', aj.puntosSim, 'puntos por debajo de sus similares', 1, 50) +
      ajuste('montoMinimo', 'Capital inmovilizado desde US$', aj.montoMinimo, 'a costo', 0, 100000) + '</div>';

    // Alertas
    var f = ui.filtros.rentabilidad;
    var cuentas = {};
    R.alertas.forEach(function (a) { cuentas[a.sev] = (cuentas[a.sev] || 0) + 1; });
    h += '<div class="tarjeta"><div class="seccion-cab"><div><h2>Alertas de rentabilidad</h2>' +
      '<p class="bajada">Cruza el margen de cada producto con el de sus similares (misma sublínea), con su rotación y con el precio de lista del inventario.</p></div></div>' +
      (R.alertas.length ? '<div class="fchips" role="group" aria-label="Filtrar por severidad"><button class="fchip" type="button" data-fchip="rentabilidad.sev" data-valor="" aria-pressed="' + (!f.sev) + '">Todas <b>' + R.alertas.length + '</b></button>' +
        ['critica', 'alta', 'media', 'info'].filter(function (s) { return cuentas[s]; }).map(function (s) {
          return '<button class="fchip" type="button" data-fchip="rentabilidad.sev" data-valor="' + s + '" aria-pressed="' + (f.sev === s) + '">' + SEV[s] + 's <b>' + cuentas[s] + '</b></button>';
        }).join('') + '</div><div id="lst-alertas"></div>' : '<p class="nota-base">Sin alertas con los umbrales actuales.</p>') + '</div>';

    // Margen por línea
    var maxM = Math.max.apply(null, R.lineas.map(function (l) { return Math.abs(l.mpct || 0); }).concat([1]));
    h += '<div class="tarjeta"><h2>Margen por línea (marca)</h2><p class="bajada">El retorno del inventario es el margen del período por cada dólar de inventario a costo de esa marca.</p>' +
      tabla([{ t: 'Línea (marca)' }, { t: 'Venta', num: 1 }, { t: 'Margen', num: 1 }, { t: 'Margen %' }, { t: 'Inventario a costo', num: 1 }, { t: 'Retorno', num: 1 }, { t: 'Alertas', num: 1 }],
        R.lineas.map(function (l) {
          return '<tr><td class="td-prod" data-label="Línea">' + u.etiqueta(l.nombre === 'Sin línea' ? '' : l.nombre) + '<div class="prod-meta"><span>' + u.entero(l.productos) + ' productos</span></div></td>' +
            td(u.dinero(l.venta), 'Venta', 'num') + td(u.dinero(l.margen), 'Margen', 'num') +
            td(u.pct(l.mpct) + '<div class="barra' + (l.mpct < 0 ? ' barra-neg' : '') + '"><span data-w="' + (Math.abs(l.mpct || 0) / maxM * 100).toFixed(1) + '"></span></div>', 'Margen %') +
            td(l.invCosto ? u.dinero(l.invCosto) : 'n/d', 'Inventario a costo', 'num') + td(l.gmroi == null ? 'n/d' : u.monto(l.gmroi), 'Retorno', 'num') +
            td(u.entero(l.alertas), 'Alertas', 'num') + '</tr>';
        })) + '</div>';

    // Capital inmovilizado
    if (A.hay.inv) {
      h += '<div class="tarjeta"><h2>Capital inmovilizado</h2><p class="bajada">' +
        (A.hay.ventas ? 'Productos sin ventas o con más de ' + (aj.bajaDias * 2) + ' días de cobertura, desde ' + esc(u.dinero(aj.montoMinimo)) + ' a costo. Suman ' + esc(u.dinero(R.inmovilizadoTotal)) + '.' : 'Carga las ventas para medir qué inventario está detenido.') +
        '</p><div id="tb-inmovilizado"></div></div>';
    }

    // Detalle por producto
    var fp = ui.filtros.rentProd;
    var mods = Object.keys(R.porModulo).filter(function (m) { return u.MODULOS[m]; });
    h += '<div class="tarjeta"><h2>Detalle por producto</h2><p class="bajada">Similares: mediana del margen de los productos de la misma sublínea (o de la misma categoría, si la sublínea tiene menos de 3).</p>' +
      '<div class="filtros">' +
      (mods.length > 1 ? '<div class="filtro"><label for="fr-mod">Módulo</label><select id="fr-mod" data-filtro="rentProd.mod">' + opciones(mods.map(function (m) { return { v: m, t: u.MODULOS[m] }; }), fp.mod, 'Todos') + '</select></div>' : '') +
      '<div class="filtro"><label for="fr-orden">Ordenar por</label><select id="fr-orden" data-filtro="rentProd.orden">' +
      [{ v: 'margen', t: 'Margen % (menor primero)' }, { v: 'difpts', t: 'Diferencia con similares' }, { v: 'venta', t: 'Venta (mayor primero)' }].map(function (o) {
        return '<option value="' + o.v + '"' + (fp.orden === o.v ? ' selected' : '') + '>' + o.t + '</option>';
      }).join('') + '</select></div>' +
      '<div class="filtro filtro-ancho"><label for="fr-q">Buscar producto o código</label><input type="search" id="fr-q" data-filtro="rentProd.q" value="' + esc(fp.q) + '" autocomplete="off"></div>' +
      '</div><div id="tb-rent-prod"></div></div>';

    // Ajustes y bonificaciones
    if (R.ajustes.length || R.bonificaciones.length) {
      h += '<div class="tarjeta"><h2>Ajustes y bonificaciones</h2><ul class="lista-seg">' +
        (R.ajustes.length ? '<li>Descuentos y diferencias de precio: ' + esc(u.dinero(R.ajustesTotal)) + ' (' + R.ajustes.map(function (a) { return esc(a.nombre); }).join(', ') + ').</li>' : '') +
        (R.bonificaciones.length ? '<li>' + u.entero(R.bonificaciones.length) + ' productos entregados sin costo ni venta registrados (combos u obsequios): ' +
          R.bonificaciones.slice(0, 8).map(function (b) { return esc(b.nombre) + ' (' + u.entero(b.cant) + ')'; }).join(', ') + (R.bonificaciones.length > 8 ? ', entre otros' : '') + '. Verificar que su costo se cargue en algún lado.</li>' : '') +
        '</ul></div>';
    }
    cont.innerHTML = h;
    aplicarBarras(cont);
    rentabilidadListas(A, ui);
  }

  function rentabilidadListas(A, ui) {
    var R = A.rentabilidad;
    if (!R) return;
    var lst = $('lst-alertas');
    if (lst) {
      var f = ui.filtros.rentabilidad;
      var al = R.alertas.filter(function (a) { return !f.sev || a.sev === f.sev; });
      var n = Math.min(al.length, ui.paginas.alertas || 25);
      lst.innerHTML = '<div class="alertas">' + al.slice(0, n).map(function (a) {
        var i = a.i;
        return '<article class="alerta"><div class="alerta-cab"><span class="sev sev-' + a.sev + '"><i aria-hidden="true"></i>' + SEV[a.sev] + '</span>' +
          '<h3 class="alerta-titulo">' + esc(a.titulo) + '</h3></div>' +
          '<div><div class="alerta-prod">' + esc(i.nombre) + '</div><div class="prod-meta">' + (i.cod ? '<span>' + esc(i.cod) + '</span>' : '') +
          (u.MODULOS[i.mod] ? '<span>' + esc(u.MODULOS[i.mod]) + '</span>' : '') + u.etiqueta(i.lineaN) + '</div>' +
          '<p class="alerta-detalle">' + esc(a.detalle) + '</p></div>' +
          '<p class="alerta-accion"><b>Qué hacer:</b> ' + esc(a.accion) + '</p></article>';
      }).join('') + '</div>' + mas('alertas', n, al.length);
    }
    var inm = $('tb-inmovilizado');
    if (inm) {
      var li = R.inmovilizado;
      var ni = Math.min(li.length, ui.paginas.inmovilizado || 20);
      inm.innerHTML = li.length ? tabla([{ t: 'Producto' }, { t: 'Stock', num: 1 }, { t: 'Cobertura', num: 1 }, { t: 'A costo', num: 1 }, { t: 'Margen del período', num: 1 }, { t: 'Qué hacer' }],
        li.slice(0, ni).map(function (x) {
          return '<tr>' + celdaProd(x.it.nombre, x.it.cod, x.it.mod, x.lineaN) + td(u.entero(x.it.stock), 'Stock', 'num') +
            td(u.dias(x.it.rot.cobertura), 'Cobertura', 'num') + td(u.dinero(x.monto), 'A costo', 'num') + td(u.dinero(x.margen), 'Margen del período', 'num') +
            td(esc(x.it.rot.sugerencia || ''), 'Qué hacer', 'td-texto') + '</tr>';
        })) + mas('inmovilizado', ni, li.length) : '<p class="nota-base">No hay capital inmovilizado con los umbrales actuales.</p>';
    }
    var tp = $('tb-rent-prod');
    if (tp) {
      var fp = ui.filtros.rentProd, q = normQ(fp.q);
      var lista = R.productos.filter(function (i) { return (!fp.mod || i.mod === fp.mod) && (coincide(i.nombre, q) || coincide(i.cod, q)); });
      var orden = {
        margen: function (a, b) { return (a.mpct == null ? 1e9 : a.mpct) - (b.mpct == null ? 1e9 : b.mpct); },
        difpts: function (a, b) { return (a.difPts == null ? 1e9 : a.difPts) - (b.difPts == null ? 1e9 : b.difPts); },
        venta: function (a, b) { return b.venta - a.venta; }
      }[fp.orden] || function () { return 0; };
      lista.sort(orden);
      var np = Math.min(lista.length, ui.paginas['rent-prod'] || PAGINA);
      tp.innerHTML = lista.length ? tabla([{ t: 'Producto' }, { t: 'Unidades', num: 1 }, { t: 'Venta', num: 1 }, { t: 'Costo', num: 1 }, { t: 'Margen', num: 1 },
        { t: 'Margen %', num: 1 }, { t: 'Similares', num: 1 }, { t: 'Diferencia', num: 1 }, { t: 'Cobertura', num: 1 }],
        lista.slice(0, np).map(function (i) {
          return '<tr>' + celdaProd(i.nombre, i.cod, i.mod, i.lineaN) + td(u.entero(i.cant), 'Unidades', 'num') + td(u.dinero(i.venta), 'Venta', 'num') +
            td(u.dinero(i.costo), 'Costo', 'num') + td('<span class="' + (i.margen < 0 ? 'neg' : '') + '">' + u.dinero(i.margen) + '</span>', 'Margen', 'num') +
            td('<span class="' + (i.mpct < 0 ? 'neg' : '') + '">' + u.pct(i.mpct) + '</span>', 'Margen %', 'num') +
            td(i.simMed == null ? 'n/d' : u.pct(i.simMed), 'Similares', 'num') +
            td(i.difPts == null ? 'n/d' : '<span class="' + (i.difPts < 0 ? 'neg' : '') + '">' + (i.difPts > 0 ? '+' : '') + u.uno(i.difPts) + ' pts</span>', 'Diferencia', 'num') +
            td(i.cobertura == null ? 'n/d' : u.dias(i.cobertura), 'Cobertura', 'num') + '</tr>';
        })) + mas('rent-prod', np, lista.length) : '<p class="nota-base">Ningún producto coincide con el filtro.</p>';
    }
  }

  /* ---------- Líneas y fotos ---------- */
  function lineas(A, estado, ui) {
    var cont = $('v-lineas');
    var lista = A.lineas.filter(function (g) { return g.productos > 0 || g.venta !== 0 || g.fotos.length; });
    var h = '<div class="seccion-cab"><div><h1 class="seccion-titulo">Líneas medidas</h1><p class="bajada">Cada línea es una marca: sus números junto a sus fotos. Las líneas con fotos aparecen primero.</p></div>' +
      '<button class="btn btn-accion" type="button" data-accion="ir-fotos">Agregar fotos</button></div>';
    if (!lista.length) {
      cont.innerHTML = h + vacio('Todavía no hay líneas para mostrar', 'Carga el inventario o las ventas, o agrega fotos de una línea en la pestaña Carga de datos.', 'carga');
      return;
    }
    var protegido = VJ.seg.protegido('rentabilidad');
    h += '<div class="rejilla-lineas">' + lista.map(function (g) {
      var fotos = g.fotos.map(function (f) {
        return '<button class="miniatura" type="button" data-foto="' + esc(f.id) + '" aria-label="Ver foto de ' + esc(g.nombre) + ' del ' + esc(f.fechaTexto) + '">' +
          '<img src="' + esc(f.url) + '" alt="" width="' + f.w + '" height="' + f.h + '" loading="lazy" decoding="async"></button>';
      }).join('');
      return '<article class="tarjeta linea-tarjeta"><div class="linea-cab"><h3>' + esc(g.nombre) + '</h3>' +
        '<span class="chip' + (g.fotos.length ? ' chip-ok' : '') + '">' + (g.fotos.length ? g.fotos.length + (g.fotos.length === 1 ? ' foto' : ' fotos') : 'Sin fotos') + '</span></div>' +
        '<dl class="linea-stats">' +
        '<div><dt>Venta</dt><dd>' + (A.hay.ventas ? u.dinero(g.venta) : 'n/d') + '</dd></div>' +
        '<div><dt>Parte de la venta</dt><dd>' + (A.hay.ventas && g.part != null ? u.pct(g.part) : 'n/d') + '</dd></div>' +
        '<div><dt>Productos activos</dt><dd>' + u.entero(g.productos) + '</dd></div>' +
        '<div><dt>Cobertura mediana</dt><dd>' + (g.cobMed != null ? u.dias(g.cobMed) : 'n/d') + '</dd></div>' +
        '<div><dt>Margen</dt><dd>' + (protegido ? 'Protegido' : (g.mpct != null ? u.pct(g.mpct) : 'n/d')) + '</dd></div>' +
        '<div><dt>Alertas de margen</dt><dd>' + (protegido ? 'Protegido' : u.entero(g.alertas)) + '</dd></div>' +
        '</dl>' +
        (fotos ? '<div class="miniaturas">' + fotos + '</div>' : '<p class="sin-fotos">Sin fotos todavía.</p>') +
        '<div><button class="btn btn-sec btn-chico" type="button" data-accion="foto-linea" data-linea="' + esc(g.nombre === 'Sin línea' ? '' : g.nombre) + '">Agregar fotos a esta línea</button></div>' +
        '</article>';
    }).join('') + '</div>';
    cont.innerHTML = h;
  }

  /* ---------- Unificación de productos entre módulos (sección privada) ---------- */
  function difChip(d, alta) {
    if (d == null) return '';
    return '<span class="dif' + (alta ? ' dif-alerta' : '') + '">' + pctSigno(d) + '</span>';
  }
  function par(a, b, fmt) {
    return '<span class="par"><span>' + (a == null ? 'n/d' : fmt(a)) + '</span><span class="par-sep" aria-hidden="true">/</span><span>' + (b == null ? 'n/d' : fmt(b)) + '</span></span>';
  }
  function opcionesCatalogo(lista, enGrupo) {
    return lista.filter(function (e) { return !enGrupo[e.codN]; }).map(function (e) {
      return '<option value="' + esc(e.cod + ' | ' + e.nombre) + '"></option>';
    }).join('');
  }

  function unificacion(A, estado, ui) {
    var cont = $('v-unificacion');
    if (!cont) return;
    if (VJ.seg.protegido('unificacion')) { cont.innerHTML = candado('unificacion'); return; }
    var U = A.unificacion;
    var h = '<div class="barra-estado"><span>Sección privada desbloqueada. Se vuelve a bloquear tras ' + C.bloqueo.inactividadMinutos + ' minutos sin uso.</span>' +
      '<button class="btn btn-sec btn-chico" type="button" data-accion="bloquear">Bloquear ahora</button></div>';
    var archivo = '<div class="tarjeta"><h2>Guardar las equivalencias</h2><p class="bajada">Las equivalencias se olvidan al cerrar la pestaña. Descárgalas en Excel para volver a cargarlas después; también viajan dentro del respaldo cifrado de GitHub.</p>' +
      '<div class="acciones"><button class="btn btn-primario" type="button" data-uni-accion="descargar"' + (estado.equivalencias.length ? '' : ' disabled') + '>Descargar equivalencias</button>' +
      '<button class="btn btn-sec" type="button" data-uni-accion="cargar">Cargar equivalencias</button></div></div>';
    if (!U || (!U.hayDatos && !U.grupos.length)) {
      cont.innerHTML = h + cabezaSeccion(TITULARES.unificacion[0], TITULARES.unificacion[1]) + vacio('Faltan datos de los dos módulos', 'Carga el inventario, la rentabilidad o las ventas de MobilVendor y de Módulo B para unificar sus productos.', 'carga') + archivo;
      return;
    }
    var k = U.kpis;
    h += '<div class="seccion-cab"><div><h1 class="seccion-titulo">Productos unificados entre módulos</h1>' +
      '<p class="bajada">Une los códigos de MobilVendor y de Módulo B que son el mismo producto. Una vez unidos, el inventario y la rotación se calculan con el stock y las ventas de ambos módulos, y aquí se comparan su precio y su costo.</p></div></div>';
    h += '<div class="kpis">' +
      kpi('Productos unificados', u.entero(k.unificados), u.entero(A.inventario ? A.inventario.unificados : 0) + ' fichas de inventario combinadas', 'kpi-marca') +
      kpi('Sugerencias por revisar', u.entero(k.sugerencias), u.entero(k.porCodigo) + ' con el mismo código') +
      kpi('Precio distinto entre módulos', u.entero(k.difPrecio), 'Más de 5 % de diferencia') +
      kpi('Costo distinto entre módulos', u.entero(k.difCosto), 'Más de 5 % de diferencia') +
      kpi('Ya unidos en el inventario', u.entero(U.ambosInventario), 'Fichas «Ambos módulos»') +
      '</div>';

    h += '<div class="tarjeta"><div class="seccion-cab"><div><h2>Sugerencias</h2>' +
      '<p class="bajada">Cada producto de MobilVendor con su candidato más probable de Módulo B. Revisa con calma las de nombre parecido antes de unirlas. «Descartar» deja de sugerir ese producto; si tiene equivalente, únelo a mano.</p></div>' +
      (k.porCodigo ? '<button class="btn btn-accion" type="button" data-uni-accion="unificar-codigo">Unificar las ' + u.entero(k.porCodigo) + ' de mismo código</button>' : '') +
      '</div><div id="lst-sugerencias"></div></div>';

    h += '<div class="tarjeta"><h2>Unificar a mano</h2><p class="bajada">Para productos que no aparecen como sugerencia. Escribe parte del nombre o del código y elige de la lista.</p>' +
      '<form class="form-uni" data-form-uni novalidate>' +
      '<div class="campo"><label for="uni-mv">Producto de MobilVendor</label><input type="text" id="uni-mv" list="dl-uni-mv" autocomplete="off"><datalist id="dl-uni-mv">' + opcionesCatalogo(U.catalogo.mv, U.enGrupo.mv) + '</datalist></div>' +
      '<div class="campo"><label for="uni-mb">Producto de Módulo B</label><input type="text" id="uni-mb" list="dl-uni-mb" autocomplete="off"><datalist id="dl-uni-mb">' + opcionesCatalogo(U.catalogo.mb, U.enGrupo.mb) + '</datalist></div>' +
      '<div class="campo"><label for="uni-nombre">Nombre unificado <span class="opcional">(opcional)</span></label><input type="text" id="uni-nombre" autocomplete="off" maxlength="120"></div>' +
      '<div class="form-uni-pie"><button class="btn btn-primario" type="submit">Unificar</button></div>' +
      '</form><p class="mensaje-error" id="uni-error" role="alert"></p></div>';

    var f = ui.filtros.uni;
    var cuentaDif = { precio: k.difPrecio, costo: k.difCosto };
    h += '<div class="tarjeta"><div class="seccion-cab"><div><h2>Comparación entre módulos</h2>' +
      '<p class="bajada">Cada fila muestra MobilVendor / Módulo B. El precio es el promedio vendido en el período; el costo, el del inventario o, si falta, el de las ventas.</p></div></div>' +
      (U.grupos.length ? '<div class="fchips" role="group" aria-label="Filtrar diferencias">' +
        '<button class="fchip" type="button" data-fchip="uni.dif" data-valor="" aria-pressed="' + (!f.dif) + '">Todos <b>' + U.grupos.length + '</b></button>' +
        ['precio', 'costo'].filter(function (d) { return cuentaDif[d]; }).map(function (d) {
          return '<button class="fchip" type="button" data-fchip="uni.dif" data-valor="' + d + '" aria-pressed="' + (f.dif === d) + '">' + (d === 'precio' ? 'Precio distinto' : 'Costo distinto') + ' <b>' + cuentaDif[d] + '</b></button>';
        }).join('') + '</div>' +
        '<div class="filtros"><div class="filtro filtro-ancho"><label for="un-q">Buscar producto o código</label><input type="search" id="un-q" data-filtro="uni.q" value="' + esc(f.q) + '" autocomplete="off"></div></div>' : '') +
      '<div id="tb-unificados"></div></div>';
    if (U.marcasDistintas.length) {
      h += '<div class="tarjeta"><h2>Marcas con nombre distinto entre módulos</h2>' +
        '<p class="bajada">Estos productos unificados tienen otra marca en cada sistema. Mientras no se corrija el nombre en uno de los dos, esa línea (marca) se analiza partida. El producto unificado se cuenta en la marca de MobilVendor.</p>' +
        '<ul class="lista-seg">' + U.marcasDistintas.map(function (m) {
          return '<li>' + u.etiqueta(m.mv) + ' en MobilVendor y ' + u.etiqueta(m.mb) + ' en Módulo B: ' + u.entero(m.n) + (m.n === 1 ? ' producto' : ' productos') + '.</li>';
        }).join('') + '</ul></div>';
    }
    h += archivo;
    cont.innerHTML = h;
    unificacionListas(A, ui);
  }

  function unificacionListas(A, ui) {
    var U = A.unificacion;
    if (!U) return;
    var cajaS = $('lst-sugerencias');
    if (cajaS) {
      var n = Math.min(U.sugerencias.length, ui.paginas['uni-sug'] || 25);
      cajaS.innerHTML = U.sugerencias.length ? tabla([{ t: 'MobilVendor' }, { t: 'Módulo B' }, { t: 'Coincidencia' }, { t: 'Acción' }],
        U.sugerencias.slice(0, n).map(function (s) {
          return '<tr>' + celdaProd(s.a.nombre, s.a.cod, null, s.a.marca, 'MobilVendor') +
            celdaProd(s.b.nombre, s.b.cod, null, s.b.marca, 'Módulo B') +
            td('<span class="coincide' + (s.puntos >= 92 ? ' coincide-alta' : '') + '">' + esc(s.motivo) + '</span>', 'Coincidencia') +
            td('<div class="acciones-fila"><button class="btn btn-primario btn-chico" type="button" data-uni-accion="unificar" data-mv="' + esc(s.a.codN) + '" data-mb="' + esc(s.b.codN) + '">Unificar</button>' +
              '<button class="btn btn-sec btn-chico" type="button" data-uni-accion="descartar" data-mv="' + esc(s.a.codN) + '" data-mb="' + esc(s.b.codN) + '">Descartar</button></div>', 'Acción', 'td-sin-etq') + '</tr>';
        })) + mas('uni-sug', n, U.sugerencias.length) :
        '<p class="nota-base">No quedan sugerencias. Usa «Unificar a mano» para los casos que falten.</p>';
    }
    var cajaG = $('tb-unificados');
    if (cajaG) {
      var f = ui.filtros.uni, q = normQ(f.q);
      var lista = U.grupos.filter(function (x) {
        if (f.dif === 'precio' && !x.difPrecioAlta) return false;
        if (f.dif === 'costo' && !x.difCostoAlta) return false;
        return coincide(x.g.nombre, q) || coincide(x.g.mv, q) || coincide(x.g.mb, q) || (x.mv && coincide(x.mv.nombre, q)) || (x.mb && coincide(x.mb.nombre, q));
      });
      if (!U.grupos.length) { cajaG.innerHTML = '<p class="nota-base">Todavía no hay productos unificados. Empieza por las sugerencias de mismo código.</p>'; return; }
      if (!lista.length) { cajaG.innerHTML = '<p class="nota-base">Ningún producto coincide con el filtro.</p>'; return; }
      var ng = Math.min(lista.length, ui.paginas['uni-grupos'] || PAGINA);
      cajaG.innerHTML = tabla([{ t: 'Producto unificado' }, { t: 'Stock', num: 1 }, { t: 'Vendido (unid.)', num: 1 }, { t: 'Precio (US$)', num: 1 },
        { t: 'Costo (US$)', num: 1 }, { t: 'Margen', num: 1 }, { t: 'Cobertura', num: 1 }, { t: 'Acción' }],
        lista.slice(0, ng).map(function (x) {
          var a = x.mv || {}, b = x.mb || {};
          var conMV = x.mv && x.mv.stock != null, conMB = x.mb && x.mb.stock != null;
          var ficha = x.fichaUnica ? 'Ficha única «Ambos módulos» en el inventario' :
            x.unido ? 'Fichas de inventario combinadas' :
            conMV ? 'Solo MobilVendor tiene ficha de inventario' :
            conMB ? 'Solo Módulo B tiene ficha de inventario' : 'Sin ficha de inventario';
          var stock = x.fichaUnica ? u.entero(x.stock) : par(x.mv && x.mv.stock, x.mb && x.mb.stock, u.entero);
          return '<tr><td class="td-prod" data-label="Producto unificado"><div class="prod-nombre">' + esc(x.g.nombre) + '</div>' +
            '<div class="prod-meta"><span>MV ' + esc(a.cod || x.g.mv) + '</span><span>B ' + esc(b.cod || x.g.mb) + '</span>' + (x.marca ? u.etiqueta(x.marca) : '') + '</div>' +
            '<div class="prod-meta"><span>' + ficha + '</span></div></td>' +
            td(stock, 'Stock', 'num') +
            td(par(a.uds, b.uds, u.entero), 'Vendido (unid.)', 'num') +
            td('<span class="celda-par">' + par(a.precio, b.precio, u.precio) + difChip(x.difPrecio, x.difPrecioAlta) + '</span>', 'Precio (US$)', 'num') +
            td('<span class="celda-par">' + par(a.costo, b.costo, u.precio) + difChip(x.difCosto, x.difCostoAlta) + '</span>', 'Costo (US$)', 'num') +
            td(par(a.mpct, b.mpct, u.pct), 'Margen', 'num') +
            td(x.cobertura == null ? 'n/d' : u.dias(x.cobertura), 'Cobertura', 'num') +
            td('<button class="btn btn-sec btn-chico" type="button" data-uni-accion="separar" data-id="' + esc(x.g.id) + '">Separar</button>', 'Acción', 'td-sin-etq') + '</tr>';
        })) + mas('uni-grupos', ng, lista.length);
    }
  }

  VJ.vistas = {
    unificacion: unificacion,
    unificacionListas: unificacionListas,
    cabecera: cabecera,
    ranura: ranura,
    ventas: ventas,
    ventasTablas: ventasTablas,
    inventario: inventario,
    inventarioTabla: inventarioTabla,
    rentabilidad: rentabilidad,
    rentabilidadListas: rentabilidadListas,
    lineas: lineas,
    PAGINA: PAGINA
  };
})(window);
