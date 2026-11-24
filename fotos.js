/*!
 * VENEJUGOS 2015, tablero comercial.
 * Copyright (c) 2026 DISTRIBUIDORA VENEJUGOS 2015, C.A. Todos los derechos reservados.
 * Uso interno exclusivo. Prohibida su copia, distribucion o modificacion sin autorizacion escrita.
 *
 * Las fotos se redibujan en un lienzo y se guardan como JPEG nuevo: eso elimina los metadatos
 * EXIF (ubicacion GPS, modelo de camara, fecha original) y reduce el peso.
 */
(function (global) {
  'use strict';
  var VJ = global.VJ = global.VJ || {};
  var MAX_LADO = 1600, CALIDAD = 0.82, MAX_BYTES = 30 * 1024 * 1024;

  function porElemento(file) {
    return new Promise(function (ok, falla) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); ok(img); };
      img.onerror = function () { URL.revokeObjectURL(url); falla(new Error('formato')); };
      img.src = url;
    });
  }

  function abrir(file) {
    if (typeof global.createImageBitmap === 'function') {
      return global.createImageBitmap(file, { imageOrientation: 'from-image' })
        .catch(function () { return global.createImageBitmap(file); })
        .catch(function () { return porElemento(file); });
    }
    return porElemento(file);
  }

  function procesar(file) {
    if (!/^image\//.test(file.type || '') && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)) {
      return Promise.reject(new Error(file.name + ' no es una imagen.'));
    }
    if (file.size > MAX_BYTES) return Promise.reject(new Error(file.name + ' pesa más de 30 MB.'));
    return abrir(file).catch(function () {
      throw new Error('No pude abrir ' + file.name + '. Si es HEIC (iPhone), configura la cámara en «Más compatible» o envíala como JPEG.');
    }).then(function (img) {
      var w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
      if (!w || !h) throw new Error('La imagen ' + file.name + ' está vacía.');
      var escala = Math.min(1, MAX_LADO / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * escala)), ch = Math.max(1, Math.round(h * escala));
      var lienzo = document.createElement('canvas');
      lienzo.width = cw; lienzo.height = ch;
      var ctx = lienzo.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      if (typeof img.close === 'function') img.close();
      var dataUrl = lienzo.toDataURL('image/jpeg', CALIDAD);
      lienzo.width = lienzo.height = 0;
      return { dataUrl: dataUrl, w: cw, h: ch, bytes: Math.round((dataUrl.length - 23) * 0.75) };
    });
  }

  VJ.fotos = { procesar: procesar };
})(window);
