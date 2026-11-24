/*!
 * VENEJUGOS 2015, tablero comercial.
 * Copyright (c) 2026 DISTRIBUIDORA VENEJUGOS 2015, C.A. Todos los derechos reservados.
 * Uso interno exclusivo. Prohibida su copia, distribucion o modificacion sin autorizacion escrita.
 */
(function (global) {
  'use strict';
  var VJ = global.VJ = global.VJ || {};
  var C = global.VJ_CONFIG;
  var MAX_BYTES = 60 * 1024 * 1024;
  var worker = null, sinWorker = false, pendientes = {}, secuencia = 0, promesaXLSX = null;

  function cargarScript(url) {
    return new Promise(function (ok, falla) {
      var s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.referrerPolicy = 'no-referrer';
      s.onload = function () { ok(); };
      s.onerror = function () { s.remove(); falla(new Error('sin conexión')); };
      document.head.appendChild(s);
    });
  }

  // Carga SheetJS en la página (para la plantilla o cuando no hay hilo aparte).
  function asegurarXLSX() {
    if (global.XLSX) return Promise.resolve(global.XLSX);
    if (promesaXLSX) return promesaXLSX;
    var urls = C.lectorExcel.slice();
    promesaXLSX = urls.reduce(function (cadena, url) {
      return cadena.catch(function () { return cargarScript(url).then(function () { if (!global.XLSX) throw new Error('vacío'); }); });
    }, Promise.reject(new Error('inicio'))).then(function () { return global.XLSX; }).catch(function () {
      promesaXLSX = null;
      throw new Error('No se pudo descargar el lector de Excel. Revisa la conexión a internet y vuelve a intentar.');
    });
    return promesaXLSX;
  }

  function silenciar(fn) {
    var original = console.error;
    console.error = function () {
      if (/Missing Info for XLS Record|Bad uncompressed size/.test(String(arguments[0] || ''))) return;
      original.apply(console, arguments);
    };
    try { return fn(); } finally { console.error = original; }
  }

  function leerEnPagina(buffer, pedido) {
    return asegurarXLSX().then(function (X) {
      return new Promise(function (ok) {
        // Pequeña espera para que la pantalla muestre el estado "Leyendo" antes del trabajo pesado.
        setTimeout(function () {
          try {
            ok(silenciar(function () { return global.VJLectores.procesar(X, new Uint8Array(buffer), pedido); }));
          } catch (e) {
            ok({ ok: false, error: 'No pude leer el archivo. ¿Es un Excel válido? Detalle técnico: ' + (e && e.message ? e.message : e) });
          }
        }, 60);
      });
    });
  }

  function crearWorker() {
    if (worker || sinWorker || typeof global.Worker === 'undefined') return worker;
    try {
      worker = new global.Worker('js/lector-worker.js');
    } catch (e) {
      sinWorker = true;
      return null;
    }
    worker.onmessage = function (e) {
      var p = pendientes[e.data.id];
      if (!p) return;
      delete pendientes[e.data.id];
      p.ok(e.data.r);
    };
    worker.onerror = function (ev) {
      // El hilo no pudo arrancar (por ejemplo, abierto como archivo local): seguir en la página.
      if (ev && ev.preventDefault) ev.preventDefault();
      sinWorker = true;
      try { worker.terminate(); } catch (x) { /* ya cerrado */ }
      worker = null;
      var lista = Object.keys(pendientes).map(function (k) { return pendientes[k]; });
      pendientes = {};
      lista.forEach(function (p) { leerEnPagina(p.buffer, p.pedido).then(p.ok, p.falla); });
    };
    return worker;
  }

  function enWorker(w, buffer, pedido) {
    return new Promise(function (ok, falla) {
      var id = ++secuencia;
      pendientes[id] = { ok: ok, falla: falla, buffer: buffer, pedido: pedido };
      var copia = buffer.slice(0);
      w.postMessage({ id: id, buffer: copia, pedido: pedido, urls: C.lectorExcel.slice() }, [copia]);
    });
  }

  function leer(file, pedido) {
    if (file.size > MAX_BYTES) {
      return Promise.reject(new Error('El archivo pesa ' + VJ.u.mb(file.size) + '. El máximo es 60 MB.'));
    }
    return file.arrayBuffer().then(function (buffer) {
      return VJ.seg.huellaArchivo(buffer).then(function (hash) {
        var w = crearWorker();
        return (w ? enWorker(w, buffer, pedido) : leerEnPagina(buffer, pedido)).then(function (r) {
          return { r: r, hash: hash };
        });
      });
    });
  }

  VJ.carga = { leer: leer, asegurarXLSX: asegurarXLSX };
})(window);
