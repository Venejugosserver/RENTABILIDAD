/*!
 * VENEJUGOS 2015, tablero comercial.
 * Copyright (c) 2026 DISTRIBUIDORA VENEJUGOS 2015, C.A. Todos los derechos reservados.
 * Uso interno exclusivo. Prohibida su copia, distribucion o modificacion sin autorizacion escrita.
 *
 * Lee los Excel en un hilo aparte para que la pantalla no se congele con la dinamica (15 MB o mas).
 * No hace ninguna conexion de red salvo descargar el lector de Excel la primera vez.
 */
'use strict';
var listo = false;

function preparar(urls) {
  if (listo) return;
  importScripts('lectores.js');
  for (var i = 0; i < urls.length; i++) {
    try {
      importScripts(urls[i]);
      if (self.XLSX) { listo = true; return; }
    } catch (e) { /* probar el siguiente */ }
  }
  throw new Error('No se pudo descargar el lector de Excel. Revisa la conexión a internet y vuelve a intentar.');
}

// SheetJS avisa por consola de registros .xls que no usa; no son errores del archivo.
function filtrar(original) {
  return function () {
    var t = String(arguments[0] || '');
    if (/Missing Info for XLS Record|Bad uncompressed size/.test(t)) return;
    original.apply(console, arguments);
  };
}

self.onmessage = function (e) {
  var m = e.data;
  var errorOriginal = console.error;
  console.error = filtrar(errorOriginal);
  try {
    preparar(m.urls || []);
    var r = self.VJLectores.procesar(self.XLSX, new Uint8Array(m.buffer), m.pedido);
    self.postMessage({ id: m.id, r: r });
  } catch (err) {
    var texto = err && err.message ? err.message : String(err);
    if (!/lector de Excel/.test(texto)) texto = 'No pude leer el archivo. ¿Es un Excel válido? Detalle técnico: ' + texto;
    self.postMessage({ id: m.id, r: { ok: false, error: texto } });
  } finally {
    console.error = errorOriginal;
  }
};
