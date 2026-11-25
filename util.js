/*!
 * VENEJUGOS 2015, tablero comercial.
 * Copyright (c) 2026 DISTRIBUIDORA VENEJUGOS 2015, C.A. Todos los derechos reservados.
 * Uso interno exclusivo. Prohibida su copia, distribucion o modificacion sin autorizacion escrita.
 */
(function (global) {
  'use strict';
  var VJ = global.VJ = global.VJ || {};

  var fDinero = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var fEntero = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 });
  var fUno = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var fCuatro = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

  // Escapa todo texto que venga de los archivos antes de insertarlo en la página.
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function ok(n) { return typeof n === 'number' && isFinite(n); }

  var u = {
    esc: esc,
    nd: 'n/d',
    dinero: function (n) { return ok(n) ? 'US$ ' + fDinero.format(n) : 'n/d'; },
    monto: function (n) { return ok(n) ? fDinero.format(n) : 'n/d'; },
    precio: function (n) { return ok(n) ? fCuatro.format(n) : 'n/d'; },
    entero: function (n) { return ok(n) ? fEntero.format(n) : 'n/d'; },
    compacto: function (n) {
      if (!ok(n)) return 'n/d';
      var a = Math.abs(n);
      if (a >= 1e6) return fUno.format(n / 1e6) + ' M';
      if (a >= 1e4) return fUno.format(n / 1e3) + ' mil';
      return fEntero.format(n);
    },
    uno: function (n) { return ok(n) ? fUno.format(n) : 'n/d'; },
    pct: function (n) { return ok(n) ? fUno.format(n) + ' %' : 'n/d'; },
    dias: function (n) {
      if (n === Infinity) return 'Sin venta';
      return ok(n) ? fEntero.format(Math.round(n)) + ' d' : 'n/d';
    },
    fecha: function (iso) {
      if (!iso) return 'n/d';
      var p = String(iso).split('-');
      return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : esc(iso);
    },
    hoyISO: function () {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    isoDeFecha: function (d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    sumarDias: function (iso, dias) {
      var p = iso.split('-').map(Number);
      var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
      d.setUTCDate(d.getUTCDate() + Math.round(dias));
      return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
    },
    difDias: function (a, b) {
      var pa = a.split('-').map(Number), pb = b.split('-').map(Number);
      return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
    },
    mb: function (bytes) {
      if (bytes < 1024 * 1024) return fUno.format(bytes / 1024) + ' KB';
      return fUno.format(bytes / (1024 * 1024)) + ' MB';
    },
    // Tono de etiqueta de categoría asignado por hash del nombre (12 tonos fijos del manual).
    tono: function (nombre) {
      var s = String(nombre || ''), h = 0;
      for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
      return Math.abs(h) % 12;
    },
    etiqueta: function (nombre) {
      if (!nombre) return '<span class="etq etq-vacia">Sin línea</span>';
      return '<span class="etq">' + esc(nombre) + '</span>';
    },
    mediana: function (arr) {
      var a = arr.filter(ok).slice().sort(function (x, y) { return x - y; });
      if (!a.length) return null;
      var m = Math.floor(a.length / 2);
      return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    },
    qs: function (sel, raiz) { return (raiz || document).querySelector(sel); },
    qsa: function (sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); },
    debounce: function (fn, ms) {
      var t;
      return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); };
    },
    uid: function () {
      var a = new Uint8Array(8); crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    },
    MODULOS: { mv: 'MobilVendor', mb: 'Módulo B', gen: 'General', ambos: 'Ambos módulos', uni: 'Unificado' }
  };

  VJ.u = u;
})(window);
