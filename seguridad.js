/*!
 * VENEJUGOS 2015, tablero comercial.
 * Copyright (c) 2026 DISTRIBUIDORA VENEJUGOS 2015, C.A. Todos los derechos reservados.
 * Uso interno exclusivo. Prohibida su copia, distribucion o modificacion sin autorizacion escrita.
 *
 * Seguridad del lado del navegador:
 *  - La clave se compara contra una huella PBKDF2-SHA-256; nunca se guarda en disco.
 *  - Mientras esta desbloqueado, la clave vive solo en memoria para cifrar respaldos.
 *  - Respaldos: AES-256-GCM con llave derivada de la clave (sal e IV aleatorios por respaldo).
 * Esto es un candado de acceso, no una boveda: el codigo de una pagina estatica siempre es visible.
 */
(function (global) {
  'use strict';
  var VJ = global.VJ = global.VJ || {};
  var C = global.VJ_CONFIG;
  var ALMACEN = 'vj-intentos';
  var cod = new TextEncoder();
  var clave = null;
  var ultimaActividad = Date.now();
  var oyentes = [];
  var memoriaIntentos = { fallos: 0, hasta: 0 };

  function b64aBytes(b64) {
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function bytesAb64(bytes) {
    var s = '', paso = 0x8000;
    for (var i = 0; i < bytes.length; i += paso) s += String.fromCharCode.apply(null, bytes.subarray(i, i + paso));
    return btoa(s);
  }
  function iguales(a, b) {
    if (a.length !== b.length) return false;
    var d = 0;
    for (var i = 0; i < a.length; i++) d |= a[i] ^ b[i];
    return d === 0;
  }
  function hayCripto() { return !!(global.crypto && global.crypto.subtle); }

  function derivarBits(texto, sal, iteraciones) {
    return crypto.subtle.importKey('raw', cod.encode(texto), 'PBKDF2', false, ['deriveBits'])
      .then(function (k) { return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones }, k, 256); })
      .then(function (b) { return new Uint8Array(b); });
  }
  function derivarLlave(texto, sal, iteraciones) {
    return crypto.subtle.importKey('raw', cod.encode(texto), 'PBKDF2', false, ['deriveKey'])
      .then(function (k) {
        return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones }, k,
          { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      });
  }

  /* ---------- Intentos fallidos (se guardan para que recargar la página no los reinicie) ---------- */
  function leerIntentos() {
    try {
      var v = JSON.parse(global.localStorage.getItem(ALMACEN));
      return v && typeof v.fallos === 'number' ? v : { fallos: 0, hasta: 0 };
    } catch (e) { return memoriaIntentos; }
  }
  function guardarIntentos(v) {
    memoriaIntentos = v;
    try { global.localStorage.setItem(ALMACEN, JSON.stringify(v)); } catch (e) { /* sin almacenamiento: queda en memoria */ }
  }

  function estado() {
    var i = leerIntentos(), ahora = Date.now();
    return {
      desbloqueado: clave !== null,
      esperaMs: i.hasta > ahora ? i.hasta - ahora : 0,
      restantes: Math.max(C.bloqueo.intentos - i.fallos, 0)
    };
  }

  function avisar(motivo) { oyentes.forEach(function (fn) { try { fn(clave !== null, motivo || ''); } catch (e) { /* oyente roto */ } }); }

  function minutos(ms) {
    var m = Math.ceil(ms / 60000);
    return m + (m === 1 ? ' minuto' : ' minutos');
  }

  function desbloquear(texto) {
    var e = estado();
    if (e.esperaMs > 0) return Promise.resolve({ ok: false, mensaje: 'Demasiados intentos. Vuelve a probar en ' + minutos(e.esperaMs) + '.' });
    if (!texto) return Promise.resolve({ ok: false, mensaje: 'Escribe la clave de acceso.' });
    if (!hayCripto()) return Promise.resolve({ ok: false, mensaje: 'Este navegador no permite verificar la clave. Abre el tablero desde su dirección https.' });
    return derivarBits(texto, b64aBytes(C.clave.sal), C.clave.iteraciones).then(function (bits) {
      if (iguales(bits, b64aBytes(C.clave.huella))) {
        clave = texto;
        ultimaActividad = Date.now();
        guardarIntentos({ fallos: 0, hasta: 0 });
        avisar('desbloqueo');
        return { ok: true };
      }
      var i = leerIntentos();
      i.fallos += 1;
      if (i.fallos >= C.bloqueo.intentos) {
        guardarIntentos({ fallos: 0, hasta: Date.now() + C.bloqueo.minutos * 60000 });
        return { ok: false, mensaje: 'Clave incorrecta. Por seguridad, el acceso queda en pausa ' + minutos(C.bloqueo.minutos * 60000) + '.' };
      }
      guardarIntentos(i);
      var r = C.bloqueo.intentos - i.fallos;
      return { ok: false, mensaje: 'Clave incorrecta. Te ' + (r === 1 ? 'queda 1 intento' : 'quedan ' + r + ' intentos') + '.' };
    });
  }

  function bloquear(motivo) {
    if (clave === null) return;
    clave = null;
    avisar(motivo || 'manual');
  }

  // Cierre automático por inactividad.
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
    global.addEventListener(ev, function () { ultimaActividad = Date.now(); }, { passive: true, capture: true });
  });
  global.setInterval(function () {
    if (clave !== null && Date.now() - ultimaActividad > C.bloqueo.inactividadMinutos * 60000) bloquear('inactividad');
  }, 15000);

  /* ---------- Cifrado de respaldos ---------- */
  function comprimir(bytes) {
    if (typeof global.CompressionStream === 'undefined') return Promise.resolve({ bytes: bytes, gzip: false });
    var flujo = new Blob([bytes]).stream().pipeThrough(new global.CompressionStream('gzip'));
    return new Response(flujo).arrayBuffer().then(function (b) { return { bytes: new Uint8Array(b), gzip: true }; });
  }
  function descomprimir(bytes) {
    if (typeof global.DecompressionStream === 'undefined') return Promise.reject(new Error('Este navegador no puede abrir respaldos comprimidos. Usa Chrome, Edge, Firefox o Safari actualizados.'));
    var flujo = new Blob([bytes]).stream().pipeThrough(new global.DecompressionStream('gzip'));
    return new Response(flujo).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }

  // Formato: "VJ1" + bandera gzip (1 byte) + iteraciones (4 bytes) + sal (16) + iv (12) + datos cifrados.
  function cifrar(objeto, claveUsar) {
    var k = claveUsar || clave;
    if (!k) return Promise.reject(new Error('Desbloquea con la clave antes de guardar.'));
    var sal = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var it = C.clave.iteraciones;
    return comprimir(cod.encode(JSON.stringify(objeto))).then(function (c) {
      return derivarLlave(k, sal, it).then(function (llave) {
        return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, llave, c.bytes);
      }).then(function (cifrado) {
        var out = new Uint8Array(36 + cifrado.byteLength);
        out.set([0x56, 0x4A, 0x31, c.gzip ? 1 : 0], 0);
        new DataView(out.buffer).setUint32(4, it);
        out.set(sal, 8);
        out.set(iv, 24);
        out.set(new Uint8Array(cifrado), 36);
        return out;
      });
    });
  }

  function descifrar(bytes, claveUsar) {
    var k = claveUsar || clave;
    if (!k) return Promise.reject(new Error('Desbloquea con la clave antes de abrir un respaldo.'));
    if (bytes.length < 37 || bytes[0] !== 0x56 || bytes[1] !== 0x4A || bytes[2] !== 0x31) {
      return Promise.reject(new Error('El archivo no es un respaldo de este tablero.'));
    }
    var gzip = bytes[3] === 1;
    var it = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4);
    var sal = bytes.slice(8, 24), iv = bytes.slice(24, 36), datos = bytes.slice(36);
    return derivarLlave(k, sal, it)
      .then(function (llave) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, llave, datos); })
      .catch(function () {
        var e = new Error('La clave no abre este respaldo o el archivo está dañado.');
        e.claveIncorrecta = true;
        throw e;
      })
      .then(function (plano) { return gzip ? descomprimir(new Uint8Array(plano)) : new Uint8Array(plano); })
      .then(function (b) { return JSON.parse(new TextDecoder().decode(b)); });
  }

  /* ---------- Huella de archivos (evita cargar el mismo archivo dos veces) ---------- */
  function huellaArchivo(buffer) {
    if (!hayCripto()) {
      var v = new Uint8Array(buffer), h = 2166136261;
      for (var i = 0; i < v.length; i += 97) { h ^= v[i]; h = Math.imul(h, 16777619); }
      return Promise.resolve('fnv-' + (h >>> 0).toString(16) + '-' + v.length);
    }
    return crypto.subtle.digest('SHA-256', buffer).then(function (d) {
      return Array.prototype.map.call(new Uint8Array(d), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  /* ---------- Clave nueva: genera el bloque para pegar en config.js ---------- */
  function prepararClave(nueva) {
    var sal = crypto.getRandomValues(new Uint8Array(16));
    return derivarBits(nueva, sal, C.clave.iteraciones).then(function (bits) {
      return "  clave: Object.freeze({\n    sal: '" + bytesAb64(sal) + "',\n    iteraciones: " + C.clave.iteraciones +
        ",\n    huella: '" + bytesAb64(bits) + "'\n  }),";
    });
  }

  /* ---------- Protección del sitio ---------- */
  function dominioPermitido() {
    var h = global.location.hostname || '';
    return (C.dominiosPermitidos || []).some(function (p) {
      if (p === '*') return true;
      if (p.indexOf('*.') === 0) return h.length > p.length - 2 && h.slice(-(p.length - 1)) === p.slice(1);
      return h === p;
    });
  }
  function enMarco() {
    try { return global.top !== global.self; } catch (e) { return true; }
  }

  VJ.seg = {
    estado: estado,
    desbloqueado: function () { return clave !== null; },
    desbloquear: desbloquear,
    bloquear: bloquear,
    alCambiar: function (fn) { oyentes.push(fn); },
    protegido: function (modulo) { return C.modulosProtegidos.indexOf(modulo) > -1 && clave === null; },
    cifrar: cifrar,
    descifrar: descifrar,
    huellaArchivo: huellaArchivo,
    prepararClave: prepararClave,
    dominioPermitido: dominioPermitido,
    enMarco: enMarco,
    bytesAb64: bytesAb64,
    hayCripto: hayCripto
  };
})(window);
