/*!
 * VENEJUGOS 2015, tablero comercial.
 * Copyright (c) 2026 DISTRIBUIDORA VENEJUGOS 2015, C.A. Todos los derechos reservados.
 * Uso interno exclusivo. Prohibida su copia, distribucion o modificacion sin autorizacion escrita.
 *
 * Estado en memoria de la pestaña. Nada de los archivos se guarda en el navegador.
 */
(function (global) {
  'use strict';
  var VJ = global.VJ;
  var C = global.VJ_CONFIG;
  var u = VJ.u;

  var RANURAS = {
    'inventario': { panel: 'inventario', titulo: 'Inventario general' },
    'rent-mv': { panel: 'rentabilidad', titulo: 'Rentabilidad MobilVendor', mod: 'mv' },
    'rent-mb': { panel: 'rentabilidad', titulo: 'Rentabilidad Módulo B', mod: 'mb' },
    'ventas-mv': { panel: 'ventas', titulo: 'Ventas MobilVendor', modulo: 'mv', modo: 'directo', fuente: 'mv' },
    'ventas-mb': { panel: 'ventas', titulo: 'Ventas Módulo B', modulo: 'mb', modo: 'directo', fuente: 'mb' },
    'ventas-din': { panel: 'ventas', titulo: 'Ventas dinámica', modulo: '', modo: 'dinamica', fuente: 'din' }
  };
  var PAGINAS_INICIALES = { 'bajo-costo': 50, 'sin-ficha': 15, 'rotacion': 50, 'alertas': 25, 'inmovilizado': 20, 'rent-prod': 50 };
  var GRUPO_DE_LISTA = { 'bajo-costo': 'ventas', 'sin-ficha': 'ventas', 'rotacion': 'inventario', 'alertas': 'rentabilidad', 'inmovilizado': 'rentabilidad', 'rent-prod': 'rentProd' };
  var LISTAS_DE_GRUPO = { ventas: ['bajo-costo', 'sin-ficha'], inventario: ['rotacion'], rentabilidad: ['alertas'], rentProd: ['rent-prod'] };
  var FAB = { carga: 'Elegir archivo', ventas: 'Cargar ventas', inventario: 'Cargar inventario', rentabilidad: 'Cargar rentabilidad', lineas: 'Agregar fotos' };

  function estadoInicial() {
    return {
      ajustes: Object.assign({}, C.ajustes),
      inventario: null,
      rentabilidad: { mv: null, mb: null },
      ventas: { modo: 'directo', fuentes: { mv: null, mb: null, din: null } },
      fotos: []
    };
  }

  var estado = estadoInicial();
  var A = null;
  var ui = {
    tab: 'carga',
    filtros: {
      ventas: { mod: '', linea: '', q: '' },
      inventario: { estado: '', linea: '', q: '' },
      rentabilidad: { sev: '' },
      rentProd: { mod: '', orden: 'margen', q: '' }
    },
    paginas: {},
    abiertos: {},
    leyendo: {},
    errores: {},
    fotoAbierta: null,
    ocupadoGH: false
  };

  function $(id) { return document.getElementById(id); }

  /* ---------- Avisos ---------- */
  function aviso(texto, tipo) {
    var cont = $('toasts');
    var t = document.createElement('div');
    t.className = 'toast' + (tipo === 'error' ? ' toast-error' : '');
    var p = document.createElement('p');
    p.textContent = texto;
    var b = document.createElement('button');
    b.className = 'btn-cerrar';
    b.type = 'button';
    b.setAttribute('aria-label', 'Cerrar aviso');
    b.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>';
    b.addEventListener('click', function () { t.remove(); });
    t.appendChild(p);
    t.appendChild(b);
    cont.appendChild(t);
    while (cont.children.length > 3) cont.firstChild.remove();
    setTimeout(function () { t.remove(); }, tipo === 'error' ? 10000 : 5500);
  }

  /* ---------- Diálogos ---------- */
  function confirmar(titulo, texto, textoAceptar) {
    return new Promise(function (resolver) {
      var d = $('dlg-confirmar'), btn = $('dc-aceptar');
      $('dc-titulo').textContent = titulo;
      $('dc-texto').textContent = texto;
      btn.textContent = textoAceptar || 'Aceptar';
      var hecho = false;
      function fin(v) {
        if (hecho) return;
        hecho = true;
        btn.removeEventListener('click', alAceptar);
        d.removeEventListener('close', alCerrar);
        if (d.open) d.close();
        resolver(v);
      }
      function alAceptar() { fin(true); }
      function alCerrar() { fin(false); }
      btn.addEventListener('click', alAceptar);
      d.addEventListener('close', alCerrar);
      d.showModal();
    });
  }

  // Pide una clave y la valida con la función dada; resuelve con la clave o null.
  function pedirClave(texto, validar) {
    return new Promise(function (resolver) {
      var d = $('dlg-clave'), form = $('form-clave'), input = $('dk-input'), err = $('dk-error');
      $('dk-texto').textContent = texto;
      input.value = '';
      err.textContent = '';
      var hecho = false;
      function fin(v) {
        if (hecho) return;
        hecho = true;
        form.removeEventListener('submit', alEnviar);
        d.removeEventListener('close', alCerrar);
        if (d.open) d.close();
        input.value = '';
        resolver(v);
      }
      function alEnviar(e) {
        e.preventDefault();
        var v = input.value;
        err.textContent = 'Verificando…';
        validar(v).then(function (r) {
          if (r.ok) fin(v);
          else { err.textContent = r.mensaje; input.value = ''; input.focus(); }
        });
      }
      function alCerrar() { fin(null); }
      form.addEventListener('submit', alEnviar);
      d.addEventListener('close', alCerrar);
      d.showModal();
      input.focus();
    });
  }

  function asegurarClave(texto) {
    if (VJ.seg.desbloqueado()) return Promise.resolve(true);
    return pedirClave(texto, VJ.seg.desbloquear).then(function (k) { return !!k; });
  }

  /* ---------- Casillas de carga ---------- */
  function datosRanura(id) {
    var d = RANURAS[id];
    if (id === 'inventario') return estado.inventario;
    if (d.panel === 'rentabilidad') return estado.rentabilidad[d.mod];
    return estado.ventas.fuentes[d.fuente];
  }
  function ponerRanura(id, valor) {
    var d = RANURAS[id];
    if (id === 'inventario') estado.inventario = valor;
    else if (d.panel === 'rentabilidad') estado.rentabilidad[d.mod] = valor;
    else estado.ventas.fuentes[d.fuente] = valor;
  }
  function ubicarHash(hash) {
    return Object.keys(RANURAS).filter(function (id) {
      var d = datosRanura(id);
      return d && d.archivo && d.archivo.hash === hash;
    })[0] || null;
  }

  function infoRanura(id) {
    if (ui.leyendo[id]) return { estado: 'leyendo', nombre: ui.leyendo[id].nombre, bytes: ui.leyendo[id].bytes };
    if (ui.errores[id]) return { estado: 'error', nombre: ui.errores[id].nombre, error: ui.errores[id].error };
    var d = datosRanura(id);
    if (!d) return { estado: 'vacio' };
    var lineas = [], aviso = '';
    if (id === 'inventario') {
      var inactivos = d.items.filter(function (i) { return !i.activo; }).length;
      lineas.push('<strong>' + u.entero(d.items.length) + '</strong> productos' + (inactivos ? ' (' + u.entero(inactivos) + ' inactivos)' : ''));
      lineas.push('Hoja «' + u.esc(d.hoja) + '»' + (d.hojas.length > 1 ? '; ' + (d.hojas.length - 1) + (d.hojas.length === 2 ? ' hoja más sin usar' : ' hojas más sin usar') : ''));
      var avisos = [];
      if (!d.tieneVenc) avisos.push('No trae fecha de vencimiento: usa «Descargar plantilla con vencimiento» para agregarla.');
      if (!d.tieneCosto) avisos.push('No trae costo: la rentabilidad usará el costo de las ventas.');
      aviso = avisos.join(' ');
    } else if (RANURAS[id].panel === 'rentabilidad') {
      var p = d.periodo || {};
      lineas.push('<strong>' + u.entero(d.items.length) + '</strong> productos y ajustes');
      if (p.desde) lineas.push('Período del ' + u.fecha(p.desde) + ' al ' + u.fecha(p.hasta) + (p.emitido ? ', emitido el ' + u.fecha(p.emitido) : ''));
      if (d.totales && d.totales.venta != null) lineas.push('Venta del reporte: ' + u.dinero(d.totales.venta));
      if (p.empresa) lineas.push(u.esc(p.empresa));
    } else {
      var R = d.resumen;
      lineas.push('<strong>' + u.entero(R.filas) + '</strong> líneas, ' + u.entero(R.docs) + ' documentos');
      lineas.push('Del ' + u.fecha(R.desde) + ' al ' + u.fecha(R.hasta) + ' (' + R.dias.length + ' días con despacho)');
      lineas.push(Object.keys(R.porModulo).map(function (m) {
        return u.esc(u.MODULOS[m] || 'Sin módulo') + ': ' + u.dinero(R.porModulo[m].venta);
      }).join('; '));
      aviso = d.aviso || '';
    }
    lineas.push('Archivo del ' + u.fecha(d.archivo.fecha) + ', ' + u.mb(d.archivo.bytes));
    return { estado: 'listo', nombre: d.archivo.nombre, lineas: lineas, aviso: aviso };
  }

  function pintarRanura(id) { VJ.vistas.ranura(id, infoRanura(id)); }

  function marcarLectura() { document.body.classList.toggle('leyendo', Object.keys(ui.leyendo).length > 0); }

  function cargarArchivo(file, id) {
    if (!file || !RANURAS[id]) return;
    var def = RANURAS[id];
    if (ui.leyendo[id]) { aviso('Espera a que termine la lectura de ' + def.titulo + '.'); return; }
    delete ui.errores[id];
    if (!/\.(xlsx|xlsm|xls|csv)$/i.test(file.name)) {
      ui.errores[id] = { nombre: file.name, error: 'Ese formato no se puede leer. Usa el Excel tal como sale del sistema (.xlsx o .xls) o un .csv.' };
      pintarRanura(id);
      return;
    }
    ui.leyendo[id] = { nombre: file.name, bytes: file.size, inicio: Date.now() };
    pintarRanura(id);
    marcarLectura();
    var reloj = setInterval(function () {
      var l = ui.leyendo[id], s = document.querySelector('#r-' + id + ' [data-segundos]');
      if (l && s) s.textContent = Math.round((Date.now() - l.inicio) / 1000);
    }, 1000);
    VJ.carga.leer(file, { panel: def.panel, modulo: def.modulo || '' })
      .then(function (res) { colocar(id, file, res); })
      .catch(function (e) { ui.errores[id] = { nombre: file.name, error: (e && e.message) || 'No pude leer el archivo.' }; })
      .then(function () {
        clearInterval(reloj);
        delete ui.leyendo[id];
        marcarLectura();
        recalcular();
      });
  }

  function colocar(id, file, res) {
    var r = res.r, def = RANURAS[id];
    var donde = ubicarHash(res.hash);
    if (donde === id) { aviso('Ese archivo ya estaba cargado en «' + def.titulo + '».'); return; }
    if (donde) {
      ui.errores[id] = { nombre: file.name, error: 'Este mismo archivo ya está cargado en «' + RANURAS[donde].titulo + '». No se carga dos veces.' };
      return;
    }
    if (!r || !r.ok) { ui.errores[id] = { nombre: file.name, error: (r && r.error) || 'No pude leer el archivo.' }; return; }
    var archivo = { nombre: file.name, bytes: file.size, hash: res.hash, fecha: u.isoDeFecha(new Date(file.lastModified || Date.now())) };

    if (def.panel === 'inventario') {
      var inv = r.inventario;
      estado.inventario = {
        items: inv.items, tieneVenc: inv.tieneVenc, tieneCosto: inv.tieneCosto,
        hoja: r.hoja, hojas: r.hojas, fechaArchivo: archivo.fecha, archivo: archivo
      };
      aviso('Inventario cargado: ' + u.entero(inv.items.length) + ' productos.');
      return;
    }

    if (def.panel === 'rentabilidad') {
      var R = r.rentabilidad, destino = 'rent-' + R.modulo;
      if (destino !== id) {
        delete ui.errores[destino];
        aviso('Era el reporte de ' + u.MODULOS[R.modulo] + '; quedó en su casilla.');
      } else {
        aviso('Rentabilidad de ' + u.MODULOS[R.modulo] + ' cargada.');
      }
      estado.rentabilidad[R.modulo] = { items: R.items, totales: R.totales, periodo: R.periodo, grupos: R.grupos, archivo: archivo };
      return;
    }

    var V = r.ventas;
    var mods = Object.keys(V.porModulo).filter(function (m) { return m === 'mv' || m === 'mb'; });
    var fuente = def.fuente;
    if (def.modo === 'directo' && r.tieneModulo) {
      if (mods.length > 1) {
        ui.errores[id] = { nombre: file.name, error: 'Este archivo trae ventas de MobilVendor y de Módulo B: es un agrupado. Cárgalo en la modalidad «Agrupado (dinámica)».' };
        return;
      }
      if (mods.length === 1 && mods[0] !== def.modulo) {
        fuente = mods[0];
        delete ui.errores['ventas-' + fuente];
        aviso('Eran ventas de ' + u.MODULOS[fuente] + '; quedaron en su casilla.');
      }
    } else if (def.modo === 'directo' && r.moduloUsado && r.moduloUsado !== def.modulo) {
      fuente = r.moduloUsado;
      delete ui.errores['ventas-' + fuente];
      aviso('Por su formato, es el archivo de ventas de ' + u.MODULOS[fuente] + '; quedó en su casilla.');
    }
    var avisoVentas = r.aviso || '';
    if (def.modo === 'dinamica' && !r.tieneModulo) avisoVentas = 'No trae la columna MODULOS: las ventas se muestran como un solo grupo. ' + avisoVentas;
    estado.ventas.fuentes[fuente] = { resumen: V, archivo: archivo, aviso: avisoVentas.trim(), tieneModulo: !!r.tieneModulo };
    if (fuente === def.fuente) aviso('Ventas cargadas: ' + u.entero(V.filas) + ' líneas.');
  }

  function quitar(id) {
    var d = datosRanura(id);
    delete ui.errores[id];
    ponerRanura(id, null);
    recalcular();
    if (d) aviso('Se quitó «' + d.archivo.nombre + '».');
    var input = $('f-' + id);
    if (input) input.focus();
  }

  /* ---------- Recalcular y pintar ---------- */
  function conteoArchivos() {
    var f = estado.ventas.fuentes, din = estado.ventas.modo === 'dinamica';
    var n = (estado.inventario ? 1 : 0) + (estado.rentabilidad.mv ? 1 : 0) + (estado.rentabilidad.mb ? 1 : 0) +
      (din ? (f.din ? 1 : 0) : (f.mv ? 1 : 0) + (f.mb ? 1 : 0));
    return { n: n, total: din ? 4 : 5 };
  }

  function recalcular() {
    try {
      A = VJ.an.analizar(estado);
    } catch (e) {
      if (global.console) console.error(e);
      aviso('No pude analizar los datos cargados (' + (e && e.message ? e.message : e) + '). Quita el último archivo e intenta de nuevo.', 'error');
      A = A || { hay: {}, lineas: [] };
    }
    pintarTodo();
  }

  function pintarTodo() {
    if (!A) return;
    var activo = document.activeElement;
    var claveFoco = activo && activo.getAttribute ? (activo.getAttribute('data-ajuste') || '') : '';
    VJ.vistas.cabecera(A, estado, conteoArchivos());
    Object.keys(RANURAS).forEach(pintarRanura);
    VJ.vistas.ventas(A, estado, ui);
    VJ.vistas.inventario(A, estado, ui);
    VJ.vistas.rentabilidad(A, estado, ui);
    VJ.vistas.lineas(A, estado, ui);
    actualizarModo();
    actualizarSesion();
    actualizarListaLineas();
    if (claveFoco) {
      var nuevo = document.querySelector('[data-ajuste="' + claveFoco + '"]');
      if (nuevo) nuevo.focus();
    }
  }

  function actualizarModo() {
    var din = estado.ventas.modo === 'dinamica', f = estado.ventas.fuentes;
    $('g-directo').hidden = din;
    $('g-dinamica').hidden = !din;
    $('modo-' + estado.ventas.modo).checked = true;
    var t = din ? 'Un solo archivo con las ventas de los dos módulos, identificadas en la columna MODULOS.' :
      'Los archivos tal como salen del sistema: uno de MobilVendor y otro de Módulo B.';
    if (din && (f.mv || f.mb)) t += ' Los archivos directos siguen cargados, pero no se suman.';
    if (!din && f.din) t += ' La dinámica sigue cargada, pero no se suma.';
    $('ayuda-modo').textContent = t;
  }

  function actualizarSesion() {
    var n = conteoArchivos().n, fotos = estado.fotos.length;
    $('sesion-resumen').textContent = n || fotos ?
      'En memoria: ' + n + (n === 1 ? ' archivo' : ' archivos') + ' y ' + fotos + (fotos === 1 ? ' foto.' : ' fotos.') : 'No hay datos cargados.';
    var chip = $('chip-fotos');
    chip.textContent = fotos ? fotos + (fotos === 1 ? ' foto' : ' fotos') : 'Sin fotos';
    chip.classList.toggle('chip-ok', fotos > 0);
    $('fotos-resumen').textContent = fotos ? 'Las fotos se ven en la pestaña Líneas y fotos.' : '';
  }

  function actualizarListaLineas() {
    var dl = $('lista-lineas');
    var nombres = (A.lineas || []).map(function (g) { return g.nombre; }).filter(function (n) { return n && n !== 'Sin línea'; }).sort();
    dl.textContent = '';
    nombres.forEach(function (n) { var o = document.createElement('option'); o.value = n; dl.appendChild(o); });
  }

  /* ---------- Pestañas ---------- */
  function irA(tab, enfocar) {
    if (!$('p-' + tab)) tab = 'carga';
    ui.tab = tab;
    u.qsa('.pestana').forEach(function (b) {
      var activa = b.getAttribute('data-tab') === tab;
      b.setAttribute('aria-selected', activa ? 'true' : 'false');
      b.tabIndex = activa ? 0 : -1;
      if (activa && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    u.qsa('.panel').forEach(function (p) { p.hidden = p.id !== 'p-' + tab; });
    if (global.history && history.replaceState) history.replaceState(null, '', '#' + tab);
    $('fab').textContent = FAB[tab];
    var limite = document.querySelector('.carretera');
    var tope = limite ? limite.getBoundingClientRect().bottom + global.scrollY : 0;
    if (global.scrollY > tope) global.scrollTo(0, tope);
    if (enfocar) $('t-' + tab).focus();
  }

  function abrirSelector(id) {
    var input = $('f-' + id);
    if (input) input.click();
  }

  function accionFab() {
    var din = estado.ventas.modo === 'dinamica';
    var ventasActivas = din ? ['ventas-din'] : ['ventas-mv', 'ventas-mb'];
    var vacias = function (lista) { return lista.filter(function (id) { return !datosRanura(id); }); };
    if (ui.tab === 'lineas') {
      if (!$('foto-linea').value.trim()) {
        irA('carga');
        $('foto-linea').focus();
        aviso('Escribe o elige la línea y luego elige las fotos.');
        return;
      }
      $('f-fotos').click();
      return;
    }
    var destino;
    if (ui.tab === 'inventario') destino = 'inventario';
    else if (ui.tab === 'rentabilidad') destino = vacias(['rent-mv', 'rent-mb'])[0] || 'rent-mv';
    else if (ui.tab === 'ventas') destino = vacias(ventasActivas)[0] || ventasActivas[0];
    else destino = vacias(['inventario', 'rent-mv', 'rent-mb'].concat(ventasActivas))[0];
    if (!destino) { aviso('Ya están cargados todos los archivos. Usa «Reemplazar» en la casilla que quieras cambiar.'); return; }
    if (ui.tab !== 'carga') irA('carga');
    abrirSelector(destino);
  }

  /* ---------- Filtros y listas ---------- */
  function subPintar(grupo) {
    if (grupo === 'ventas') VJ.vistas.ventasTablas(A, ui);
    else if (grupo === 'inventario') VJ.vistas.inventarioTabla(A, ui);
    else VJ.vistas.rentabilidadListas(A, ui);
  }
  function aplicarFiltro(el) {
    var p = el.getAttribute('data-filtro').split('.');
    ui.filtros[p[0]][p[1]] = el.value;
    (LISTAS_DE_GRUPO[p[0]] || []).forEach(function (k) { delete ui.paginas[k]; });
    subPintar(p[0]);
  }

  /* ---------- Fotos ---------- */
  function urlDe(dataUrl) {
    var bin = atob(dataUrl.split(',')[1] || ''), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
  }
  function fechaHora(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return 'n/d';
    return u.fecha(u.isoDeFecha(d)) + ' a las ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function agregarFotos(files) {
    files = files.filter(Boolean);
    if (!files.length) return;
    var linea = $('foto-linea').value.trim();
    if (!linea) {
      aviso('Escribe o elige la línea antes de agregar las fotos.', 'error');
      $('foto-linea').focus();
      return;
    }
    var libres = C.maxFotos - estado.fotos.length;
    if (libres <= 0) { aviso('Llegaste al máximo de ' + C.maxFotos + ' fotos por sesión. Elimina alguna para agregar más.', 'error'); return; }
    var lote = files.slice(0, libres), nota = $('foto-nota').value.trim(), errores = [], agregadas = 0;
    $('fotos-resumen').textContent = 'Procesando ' + lote.length + (lote.length === 1 ? ' foto…' : ' fotos…');
    lote.reduce(function (cadena, file) {
      return cadena.then(function () {
        return VJ.fotos.procesar(file).then(function (r) {
          var ahora = new Date();
          estado.fotos.push({
            id: u.uid(), linea: linea, nota: nota, fecha: ahora.toISOString(), fechaTexto: u.fecha(u.isoDeFecha(ahora)),
            dataUrl: r.dataUrl, url: urlDe(r.dataUrl), w: r.w, h: r.h, bytes: r.bytes
          });
          agregadas++;
        }).catch(function (e) { errores.push(e.message); });
      });
    }, Promise.resolve()).then(function () {
      if (files.length > lote.length) errores.push('Se omitieron ' + (files.length - lote.length) + ' fotos por el máximo de la sesión.');
      if (agregadas) aviso('Se agregaron ' + agregadas + (agregadas === 1 ? ' foto' : ' fotos') + ' a ' + linea + '.');
      if (errores.length) aviso(errores.join(' '), 'error');
      $('foto-nota').value = '';
      recalcular();
    });
  }

  function abrirFoto(id) {
    var f = estado.fotos.filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    ui.fotoAbierta = id;
    $('df-titulo').textContent = f.linea;
    var img = $('df-img');
    img.src = f.url;
    img.width = f.w;
    img.height = f.h;
    img.alt = 'Foto de la línea ' + f.linea + (f.nota ? ': ' + f.nota : '');
    $('df-meta').textContent = 'Agregada el ' + fechaHora(f.fecha) + '.' + (f.nota ? ' Nota: ' + f.nota + '.' : '') + ' ' + u.mb(f.bytes) + ', ' + f.w + ' × ' + f.h + ' px.';
    $('dlg-foto').showModal();
  }

  /* ---------- Plantilla de inventario ---------- */
  function descargarPlantilla() {
    aviso('Preparando la plantilla…');
    VJ.carga.asegurarXLSX().then(function (X) {
      var cab = ['Modulo', 'Codigo', 'Productos', 'Unidad', 'Stock', 'Precio', 'Costo', 'Unidad de Negocio', 'Sublinea', 'Lineas', 'estatus', 'Impuesto', 'Vencimiento', 'Lote'];
      var nombreMod = { mv: 'MobilVendor', mb: 'Modulo B', ambos: 'Ambos Modulos' };
      var filas = estado.inventario ? estado.inventario.items.map(function (i) {
        return [nombreMod[i.mod] || '', String(i.cod), i.nombre, i.unidad, i.stock, i.precio, i.costo, i.un, i.sub, i.linea,
          i.activo ? 'Activo' : 'Inactivo', i.impuesto, i.venc ? u.fecha(i.venc) : '', i.lote];
      }) : [['MobilVendor', '21126', 'ACEITE DE SOYA VATEL 12X800ML', 'UNI', 2090, 2.47, 2.06, 'GRUPO MIMESA', 'ACEITES Y MANTECAS', 'VIVERES & ALIMENTOS', 'Activo', 0, '30/06/2027', 'L-0001']];
      var hoja = X.utils.aoa_to_sheet([cab].concat(filas));
      hoja['!cols'] = [12, 14, 46, 8, 9, 9, 9, 24, 24, 24, 9, 9, 13, 12].map(function (w) { return { wch: w }; });
      for (var r = 1; r <= filas.length; r++) {
        var ref = X.utils.encode_cell({ r: r, c: 1 });
        if (hoja[ref]) { hoja[ref].t = 's'; hoja[ref].v = String(hoja[ref].v); }
      }
      var instrucciones = X.utils.aoa_to_sheet([
        ['Inventario con vencimiento, VENEJUGOS 2015'],
        [''],
        ['1. Completa la columna Vencimiento con la fecha en formato dd/mm/aaaa y, si aplica, la columna Lote.'],
        ['2. Si un producto tiene varios lotes, anota la fecha y el lote del que vence primero.'],
        ['3. Guarda el archivo y cárgalo en el panel Inventario del tablero.'],
        [''],
        [estado.inventario ? 'Las filas son el inventario cargado en el tablero el ' + u.fecha(u.hoyISO()) + '.' : 'La fila 2 de la hoja «inventario» es un ejemplo: bórrala o reemplázala.'],
        ['No cambies los nombres de las columnas ni el nombre de la hoja «inventario».']
      ]);
      instrucciones['!cols'] = [{ wch: 110 }];
      var libro = X.utils.book_new();
      X.utils.book_append_sheet(libro, hoja, 'inventario');
      X.utils.book_append_sheet(libro, instrucciones, 'Instrucciones');
      X.writeFile(libro, 'inventario_con_vencimiento.xlsx');
      aviso('Plantilla descargada: inventario_con_vencimiento.xlsx');
    }).catch(function (e) { aviso(e.message, 'error'); });
  }

  /* ---------- Respaldo en GitHub ---------- */
  function hayDatos() { return conteoArchivos().n > 0 || estado.fotos.length > 0 || !!estado.ventas.fuentes.din || !!estado.ventas.fuentes.mv || !!estado.ventas.fuentes.mb; }

  function ghOcupado(v) {
    ui.ocupadoGH = v;
    var conectado = VJ.gh.conectado();
    $('btn-gh-guardar').disabled = v || !conectado;
    $('btn-gh-abrir').disabled = v || !conectado || !$('sel-respaldo').value;
    $('sel-respaldo').disabled = v || !conectado || $('sel-respaldo').options.length < 1 || !$('sel-respaldo').options[0].value;
  }

  function ghPintar(texto, tipo) {
    var chip = $('chip-gh');
    var conectado = VJ.gh.conectado();
    chip.textContent = tipo === 'error' ? 'Error' : conectado ? 'Conectado' : 'Sin conectar';
    chip.classList.toggle('chip-ok', conectado && tipo !== 'error');
    chip.classList.toggle('chip-error', tipo === 'error');
    $('gh-estado').textContent = texto || '';
    $('btn-gh-salir').hidden = !conectado;
    $('zona-token').hidden = conectado;
    ghOcupado(ui.ocupadoGH);
  }

  function listarRespaldos() {
    var sel = $('sel-respaldo');
    return VJ.gh.listar().then(function (lista) {
      sel.textContent = '';
      if (!lista.length) {
        var o = document.createElement('option');
        o.value = '';
        o.textContent = 'Aún no hay respaldos';
        sel.appendChild(o);
      }
      lista.forEach(function (r) {
        var o = document.createElement('option');
        o.value = r.nombre;
        o.textContent = r.nombre.replace(/\.vjenc$/, '') + ' (' + u.mb(r.bytes) + ')';
        sel.appendChild(o);
      });
      ghOcupado(false);
    }).catch(function (e) { ghPintar(e.message, 'error'); });
  }

  function conectarToken(file) {
    if (!file) return;
    ghPintar('Verificando el token con GitHub…');
    VJ.gh.conectar(file).then(function (info) {
      var texto = 'Conectado a ' + info.owner + '/' + info.repo + ', rama ' + info.rama + ', carpeta «' + info.carpeta + '».';
      if (!info.privado) texto += ' Ojo: el repositorio es público. Los respaldos van cifrados, pero conviene usar uno privado.';
      ghPintar(texto);
      return listarRespaldos();
    }).catch(function (e) { ghPintar(e.message, 'error'); });
  }

  function modeloRespaldo() {
    return {
      formato: 'VJ-tablero', version: 1, creado: new Date().toISOString(), empresa: C.empresa,
      ajustes: estado.ajustes,
      inventario: estado.inventario ? Object.assign({}, estado.inventario, {
        items: estado.inventario.items.map(function (i) { var c = Object.assign({}, i); delete c.rot; return c; })
      }) : null,
      rentabilidad: estado.rentabilidad,
      ventas: estado.ventas,
      fotos: estado.fotos.map(function (f) {
        return { id: f.id, linea: f.linea, nota: f.nota, fecha: f.fecha, dataUrl: f.dataUrl, w: f.w, h: f.h, bytes: f.bytes };
      })
    };
  }

  function nombreRespaldo() {
    var d = new Date(), dd = function (n) { return String(n).padStart(2, '0'); };
    return 'tablero-' + u.isoDeFecha(d) + '-' + dd(d.getHours()) + dd(d.getMinutes()) + dd(d.getSeconds()) + '.vjenc';
  }

  function guardarRespaldo() {
    if (!hayDatos()) { aviso('No hay nada cargado para respaldar.', 'error'); return; }
    asegurarClave('Para cifrar el respaldo escribe la clave de acceso.').then(function (ok) {
      if (!ok) return null;
      ghOcupado(true);
      ghPintar('Cifrando y subiendo el respaldo…');
      return VJ.seg.cifrar(modeloRespaldo()).then(function (bytes) {
        if (bytes.length > 40 * 1024 * 1024) {
          throw new Error('El respaldo pesa ' + u.mb(bytes.length) + ', más de lo que conviene subir. Quita algunas fotos e intenta de nuevo.');
        }
        return VJ.gh.guardar(bytes, nombreRespaldo());
      }).then(function (r) {
        aviso('Respaldo guardado: ' + r.nombre + ' (' + u.mb(r.bytes) + ').');
        ghPintar('Último respaldo: ' + r.nombre + '.');
        return listarRespaldos();
      }).catch(function (e) {
        ghPintar(e.message, 'error');
      }).then(function () { ghOcupado(false); });
    });
  }

  function restaurar(m) {
    if (!m || m.formato !== 'VJ-tablero' || !m.ventas || !m.ventas.fuentes) throw new Error('El archivo no es un respaldo de este tablero.');
    estado.fotos.forEach(function (f) { URL.revokeObjectURL(f.url); });
    var nuevo = estadoInicial();
    nuevo.ajustes = Object.assign({}, C.ajustes, m.ajustes || {});
    nuevo.inventario = m.inventario || null;
    nuevo.rentabilidad = { mv: (m.rentabilidad && m.rentabilidad.mv) || null, mb: (m.rentabilidad && m.rentabilidad.mb) || null };
    nuevo.ventas = { modo: m.ventas.modo === 'dinamica' ? 'dinamica' : 'directo', fuentes: { mv: m.ventas.fuentes.mv || null, mb: m.ventas.fuentes.mb || null, din: m.ventas.fuentes.din || null } };
    nuevo.fotos = (m.fotos || []).filter(function (f) { return f && /^data:image\/jpeg;base64,/.test(f.dataUrl || ''); }).map(function (f) {
      return Object.assign({}, f, { url: urlDe(f.dataUrl), fechaTexto: u.fecha(u.isoDeFecha(new Date(f.fecha))) });
    });
    estado = nuevo;
    ui.errores = {};
    ui.paginas = {};
    ui.abiertos = {};
    recalcular();
  }

  function abrirRespaldo() {
    var nombre = $('sel-respaldo').value;
    if (!nombre) return;
    (hayDatos() ? confirmar('Abrir respaldo', 'Abrir «' + nombre + '» reemplaza lo que está cargado ahora en esta pestaña.', 'Abrir respaldo') : Promise.resolve(true))
      .then(function (si) {
        if (!si) return null;
        return asegurarClave('Para abrir el respaldo escribe la clave de acceso.').then(function (ok) {
          if (!ok) return null;
          ghOcupado(true);
          ghPintar('Descargando y descifrando…');
          return VJ.gh.abrir(nombre).then(function (bytes) {
            return VJ.seg.descifrar(bytes).catch(function (e) {
              if (!e.claveIncorrecta) throw e;
              var modelo = null;
              return pedirClave('Ese respaldo no abre con la clave actual. Si se guardó con una clave anterior, escríbela.', function (k) {
                return VJ.seg.descifrar(bytes, k).then(function (m) { modelo = m; return { ok: true }; }, function () {
                  return { ok: false, mensaje: 'Esa clave tampoco abre el respaldo.' };
                });
              }).then(function (k) {
                if (!k) throw new Error('No se abrió el respaldo.');
                return modelo;
              });
            });
          }).then(function (m) {
            restaurar(m);
            ghPintar('Respaldo abierto: ' + nombre + '.');
            aviso('Respaldo abierto: ' + nombre + '.');
          }).catch(function (e) {
            ghPintar(e.message, 'error');
          }).then(function () { ghOcupado(false); });
        });
      });
  }

  /* ---------- Clave nueva ---------- */
  function abrirNuevaClave() {
    var abrir = function () {
      $('dn-1').value = '';
      $('dn-2').value = '';
      $('dn-error').textContent = '';
      $('dn-resultado').hidden = true;
      $('dlg-nueva').showModal();
      $('dn-1').focus();
    };
    if (VJ.seg.desbloqueado()) abrir();
    else asegurarClave('Para preparar una clave nueva confirma primero la clave actual.').then(function (ok) { if (ok) abrir(); });
  }

  /* ---------- Protección del sitio ---------- */
  function bloquearSitio(mensaje) {
    document.querySelector('.pestanas').hidden = true;
    $('fab').hidden = true;
    $('principal').innerHTML = '<div class="tarjeta vacio-estado"><h2>Acceso no disponible</h2><p>' + u.esc(mensaje) + '</p></div>';
  }

  /* ---------- Eventos ---------- */
  function conectarEventos() {
    // Pestañas
    u.qsa('.pestana').forEach(function (b) {
      b.addEventListener('click', function () { irA(b.getAttribute('data-tab')); });
    });
    document.querySelector('.pestanas-in').addEventListener('keydown', function (e) {
      var tabs = u.qsa('.pestana'), i = tabs.indexOf(document.activeElement), n = null;
      if (i < 0) return;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n === null) return;
      e.preventDefault();
      irA(tabs[n].getAttribute('data-tab'), true);
    });

    // Archivos
    u.qsa('input[type="file"][data-ranura]').forEach(function (input) {
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        input.value = '';
        if (f) cargarArchivo(f, input.getAttribute('data-ranura'));
      });
    });
    $('f-fotos').addEventListener('change', function () {
      var lista = Array.prototype.slice.call(this.files || []);
      this.value = '';
      agregarFotos(lista);
    });
    $('f-token').addEventListener('change', function () {
      var f = this.files && this.files[0];
      this.value = '';
      conectarToken(f);
    });

    // Arrastrar y soltar
    document.addEventListener('dragover', function (e) { e.preventDefault(); });
    document.addEventListener('drop', function (e) { e.preventDefault(); });
    u.qsa('.zona').forEach(function (z) {
      z.addEventListener('dragenter', function (e) { e.preventDefault(); z.classList.add('arrastrando'); });
      z.addEventListener('dragover', function (e) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; z.classList.add('arrastrando'); });
      z.addEventListener('dragleave', function (e) { if (!z.contains(e.relatedTarget)) z.classList.remove('arrastrando'); });
      z.addEventListener('drop', function (e) {
        e.preventDefault();
        z.classList.remove('arrastrando');
        var lista = Array.prototype.slice.call((e.dataTransfer && e.dataTransfer.files) || []);
        if (!lista.length) return;
        if (z.hasAttribute('data-zona-fotos')) { agregarFotos(lista); return; }
        if (z.id === 'zona-token') { conectarToken(lista[0]); return; }
        var input = z.querySelector('input[type="file"][data-ranura]');
        if (input) cargarArchivo(lista[0], input.getAttribute('data-ranura'));
      });
    });

    // Modalidad de ventas
    u.qsa('input[name="modo"]').forEach(function (r) {
      r.addEventListener('change', function () {
        if (!r.checked) return;
        estado.ventas.modo = r.value;
        recalcular();
        aviso(r.value === 'dinamica' ? 'Ahora cuenta la dinámica (agrupado).' : 'Ahora cuentan los archivos directos.');
      });
    });

    // Clics delegados
    document.addEventListener('click', function (e) {
      var t = e.target;
      var ir = t.closest('[data-ir]');
      if (ir) { irA(ir.getAttribute('data-ir'), true); return; }
      var det = t.closest('[data-detalle]');
      if (det) {
        var k = det.getAttribute('data-detalle'), abierto = !ui.abiertos[k];
        if (abierto) ui.abiertos[k] = 1; else delete ui.abiertos[k];
        var fila = $(det.getAttribute('aria-controls'));
        if (fila) fila.hidden = !abierto;
        det.setAttribute('aria-expanded', abierto ? 'true' : 'false');
        det.textContent = abierto ? 'Ocultar facturas' : 'Ver facturas';
        return;
      }
      var masBtn = t.closest('[data-mas]');
      if (masBtn) {
        var clave = masBtn.getAttribute('data-mas');
        ui.paginas[clave] = (ui.paginas[clave] || PAGINAS_INICIALES[clave]) + VJ.vistas.PAGINA;
        subPintar(GRUPO_DE_LISTA[clave]);
        var sig = document.querySelector('[data-mas="' + clave + '"]');
        if (sig) sig.focus();
        return;
      }
      var chip = t.closest('[data-fchip]');
      if (chip) {
        var p = chip.getAttribute('data-fchip').split('.'), valor = chip.getAttribute('data-valor');
        ui.filtros[p[0]][p[1]] = valor;
        (LISTAS_DE_GRUPO[p[0]] || []).forEach(function (kk) { delete ui.paginas[kk]; });
        u.qsa('[data-fchip="' + chip.getAttribute('data-fchip') + '"]').forEach(function (c) {
          c.setAttribute('aria-pressed', c.getAttribute('data-valor') === valor ? 'true' : 'false');
        });
        subPintar(p[0]);
        return;
      }
      var foto = t.closest('[data-foto]');
      if (foto) { abrirFoto(foto.getAttribute('data-foto')); return; }
      var cerrar = t.closest('[data-cerrar]');
      if (cerrar) { var dlg = cerrar.closest('dialog'); if (dlg) dlg.close(); return; }
      var acc = t.closest('[data-accion]');
      if (!acc) return;
      var accion = acc.getAttribute('data-accion');
      if (accion === 'quitar') quitar(acc.getAttribute('data-ranura'));
      else if (accion === 'reemplazar') abrirSelector(acc.getAttribute('data-ranura'));
      else if (accion === 'plantilla') descargarPlantilla();
      else if (accion === 'bloquear') { VJ.seg.bloquear('manual'); aviso('Rentabilidad bloqueada.'); }
      else if (accion === 'ir-fotos') { irA('carga'); $('foto-linea').focus(); }
      else if (accion === 'foto-linea') {
        $('foto-linea').value = acc.getAttribute('data-linea') || '';
        if (!$('foto-linea').value) { irA('carga'); $('foto-linea').focus(); return; }
        $('f-fotos').click();
      }
    });

    // Filtros y umbrales
    var filtroTexto = u.debounce(function (el) { aplicarFiltro(el); }, 200);
    document.addEventListener('input', function (e) {
      var el = e.target.closest('input[data-filtro]');
      if (el) filtroTexto(el);
    });
    document.addEventListener('change', function (e) {
      var aj = e.target.closest('[data-ajuste]');
      if (aj) {
        var k = aj.getAttribute('data-ajuste'), v = Math.round(Number(aj.value));
        if (!isFinite(v)) v = C.ajustes[k];
        v = Math.max(Number(aj.min), Math.min(Number(aj.max), v));
        estado.ajustes[k] = v;
        recalcular();
        return;
      }
      var sel = e.target.closest('select[data-filtro]');
      if (sel) aplicarFiltro(sel);
    });

    // Formularios de clave dentro de las vistas
    document.addEventListener('submit', function (e) {
      var f = e.target.closest('[data-form-clave]');
      if (!f) return;
      e.preventDefault();
      var input = f.querySelector('input[type="password"]'), err = f.querySelector('[data-error-clave]'), btn = f.querySelector('button[type="submit"]');
      btn.disabled = true;
      err.textContent = 'Verificando…';
      VJ.seg.desbloquear(input.value).then(function (r) {
        if (r.ok) return;
        btn.disabled = false;
        err.textContent = r.mensaje;
        input.value = '';
        input.focus();
      });
    });

    // Cambios de candado
    VJ.seg.alCambiar(function (abierto, motivo) {
      pintarTodo();
      if (motivo === 'inactividad') aviso('Rentabilidad se bloqueó por inactividad. Escribe la clave para volver a verla.');
      if (abierto && ui.tab !== 'carga') {
        var titulo = document.querySelector('#p-' + ui.tab + ' .seccion-titulo');
        if (titulo) { titulo.tabIndex = -1; titulo.focus(); }
      }
    });

    // Botones fijos
    $('fab').addEventListener('click', accionFab);
    $('btn-plantilla').addEventListener('click', descargarPlantilla);
    $('btn-gh-guardar').addEventListener('click', guardarRespaldo);
    $('btn-gh-abrir').addEventListener('click', abrirRespaldo);
    $('sel-respaldo').addEventListener('change', function () { ghOcupado(ui.ocupadoGH); });
    $('btn-gh-salir').addEventListener('click', function () {
      VJ.gh.olvidar();
      $('sel-respaldo').innerHTML = '<option value="">Conecta para ver la lista</option>';
      ghPintar('Token olvidado. Para volver a conectar, elige el archivo de token.');
      $('f-token').focus();
    });
    $('btn-borrar').addEventListener('click', function () {
      if (!hayDatos()) { aviso('No hay nada cargado.'); return; }
      confirmar('Borrar todo lo cargado', 'Se quitan los archivos, los análisis y las fotos de esta pestaña. Los respaldos en GitHub no se tocan.', 'Borrar todo').then(function (si) {
        if (!si) return;
        estado.fotos.forEach(function (f) { URL.revokeObjectURL(f.url); });
        var aj = estado.ajustes, modo = estado.ventas.modo;
        estado = estadoInicial();
        estado.ajustes = aj;
        estado.ventas.modo = modo;
        ui.errores = {};
        ui.paginas = {};
        ui.abiertos = {};
        recalcular();
        aviso('Se borró todo lo cargado en esta pestaña.');
      });
    });
    $('btn-nueva-clave').addEventListener('click', abrirNuevaClave);
    $('df-borrar').addEventListener('click', function () {
      var id = ui.fotoAbierta;
      var f = estado.fotos.filter(function (x) { return x.id === id; })[0];
      if (!f) return;
      confirmar('Eliminar foto', '¿Eliminar esta foto de «' + f.linea + '»? No se puede deshacer.', 'Eliminar foto').then(function (si) {
        if (!si) return;
        URL.revokeObjectURL(f.url);
        estado.fotos = estado.fotos.filter(function (x) { return x.id !== id; });
        $('dlg-foto').close();
        recalcular();
        aviso('Foto eliminada.');
      });
    });
    $('form-nueva').addEventListener('submit', function (e) {
      e.preventDefault();
      var a = $('dn-1').value, b = $('dn-2').value, err = $('dn-error');
      if (a.length < 10) { err.textContent = 'Usa al menos 10 caracteres.'; $('dn-1').focus(); return; }
      if (a !== b) { err.textContent = 'Las dos claves no coinciden.'; $('dn-2').focus(); return; }
      if (/venejugos|2015|12345|clave|password/i.test(a)) { err.textContent = 'Evita el nombre de la empresa, el año o palabras comunes: son fáciles de adivinar.'; $('dn-1').focus(); return; }
      err.textContent = 'Generando…';
      VJ.seg.prepararClave(a).then(function (bloque) {
        err.textContent = '';
        $('dn-codigo').textContent = bloque;
        $('dn-resultado').hidden = false;
        $('dn-copiar').focus();
      });
    });
    $('dn-copiar').addEventListener('click', function () {
      var texto = $('dn-codigo').textContent;
      var ok = function () { aviso('Bloque copiado. Pégalo en js/config.js y publica el cambio.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(ok, function () { seleccionar($('dn-codigo')); });
      else seleccionar($('dn-codigo'));
    });
    function seleccionar(el) {
      var r = document.createRange();
      r.selectNodeContents(el);
      var s = global.getSelection();
      s.removeAllRanges();
      s.addRange(r);
      aviso('Selecciona y copia el bloque con Ctrl+C.');
    }
  }

  /* ---------- Inicio ---------- */
  function iniciar() {
    if (VJ.seg.enMarco()) {
      bloquearSitio('Este tablero no se puede abrir dentro de otro sitio.');
      return;
    }
    if (!VJ.seg.dominioPermitido()) {
      bloquearSitio('Copia no autorizada. Este tablero solo funciona en el sitio oficial de ' + C.marca + '.');
      return;
    }
    $('pie-version').textContent = 'Versión ' + C.version;
    $('min-inactividad').textContent = C.bloqueo.inactividadMinutos;
    conectarEventos();
    var tab = (global.location.hash || '').replace('#', '');
    irA(['carga', 'ventas', 'inventario', 'rentabilidad', 'lineas'].indexOf(tab) > -1 ? tab : 'carga');
    recalcular();
  }

  iniciar();
})(window);
