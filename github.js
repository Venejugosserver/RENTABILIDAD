/*!
 * VENEJUGOS 2015, tablero comercial.
 * Copyright (c) 2026 DISTRIBUIDORA VENEJUGOS 2015, C.A. Todos los derechos reservados.
 * Uso interno exclusivo. Prohibida su copia, distribucion o modificacion sin autorizacion escrita.
 *
 * Respaldos en GitHub. El token llega en un archivo que el usuario elige en cada sesion:
 * se guarda solo en memoria, nunca en el navegador ni en el codigo. Lo que se sube ya va cifrado.
 */
(function (global) {
  'use strict';
  var VJ = global.VJ = global.VJ || {};
  var C = global.VJ_CONFIG;
  var API = 'https://api.github.com';
  var cod = encodeURIComponent;
  var sesion = null;

  function interpretar(texto) {
    var t = String(texto || '').trim();
    var d = {};
    if (t.charAt(0) === '{') {
      try { d = JSON.parse(t); } catch (e) { throw new Error('El archivo de token no es un JSON válido.'); }
    } else {
      d = { token: t.split(/\s+/)[0] };
    }
    var token = String(d.token || d.github_token || '').trim();
    if (!/^(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})$/.test(token)) {
      throw new Error('No encontré un token de GitHub válido en el archivo.');
    }
    var g = C.github || {};
    var s = {
      token: token,
      owner: String(d.owner || d.propietario || d.usuario || g.owner || '').trim(),
      repo: String(d.repo || d.repositorio || g.repo || '').trim(),
      rama: String(d.rama || d.branch || g.rama || '').trim(),
      carpeta: String(d.carpeta || d.path || d.folder || g.carpeta || 'respaldos').trim().replace(/^\/+|\/+$/g, '')
    };
    if (!s.owner || !s.repo) throw new Error('Falta el dueño o el nombre del repositorio. Agrégalos al archivo de token.');
    if (!/^[A-Za-z0-9_.-]+$/.test(s.owner) || !/^[A-Za-z0-9_.-]+$/.test(s.repo)) throw new Error('El dueño o el repositorio tienen caracteres no válidos.');
    return s;
  }

  function errorGitHub(status, j) {
    var t;
    if (status === 401) t = 'GitHub rechazó el token: es inválido o ya venció.';
    else if (status === 403) t = 'El token no tiene permiso para esta acción, o GitHub limitó las consultas por un rato.';
    else if (status === 404) t = 'No encontré el repositorio o el respaldo. Revisa dueño, repositorio y permisos del token.';
    else if (status === 409 || status === 422) t = 'GitHub no aceptó el cambio. Vuelve a intentar en unos segundos.';
    else t = 'GitHub respondió con el error ' + status + '.';
    var e = new Error(t);
    e.status = status;
    e.detalle = j && j.message ? j.message : '';
    return e;
  }

  function pedir(ruta, op) {
    op = op || {};
    if (!sesion) return Promise.reject(new Error('Primero carga el archivo de token.'));
    var cab = {
      'Authorization': 'Bearer ' + sesion.token,
      'Accept': op.accept || 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (op.cuerpo) cab['Content-Type'] = 'application/json';
    return fetch(API + ruta, {
      method: op.metodo || 'GET', headers: cab, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
      body: op.cuerpo ? JSON.stringify(op.cuerpo) : undefined
    }).catch(function () {
      throw new Error('Sin conexión con GitHub. Revisa internet y vuelve a intentar.');
    }).then(function (r) {
      if (r.ok) return r;
      return r.json().catch(function () { return {}; }).then(function (j) { throw errorGitHub(r.status, j); });
    });
  }

  function rutaContenido(nombre) {
    var base = '/repos/' + cod(sesion.owner) + '/' + cod(sesion.repo) + '/contents/' + sesion.carpeta.split('/').map(cod).join('/');
    return nombre ? base + '/' + cod(nombre) : base;
  }

  function conectar(file) {
    return file.text().then(function (texto) {
      var s = interpretar(texto);
      sesion = s;
      return pedir('/repos/' + cod(s.owner) + '/' + cod(s.repo)).then(function (r) { return r.json(); }).then(function (repo) {
        s.privado = !!repo.private;
        if (!s.rama) s.rama = repo.default_branch || 'main';
        return info();
      }).catch(function (e) { sesion = null; throw e; });
    });
  }

  function info() {
    return sesion ? { owner: sesion.owner, repo: sesion.repo, rama: sesion.rama, carpeta: sesion.carpeta, privado: sesion.privado } : null;
  }

  function listar() {
    return pedir(rutaContenido('') + '?ref=' + cod(sesion.rama)).then(function (r) { return r.json(); }).then(function (lista) {
      if (!Array.isArray(lista)) return [];
      return lista.filter(function (f) { return f.type === 'file' && /\.vjenc$/.test(f.name); })
        .map(function (f) { return { nombre: f.name, bytes: f.size }; })
        .sort(function (a, b) { return a.nombre < b.nombre ? 1 : -1; });
    }).catch(function (e) { if (e.status === 404) return []; throw e; });
  }

  function guardar(bytes, nombre) {
    var ruta = rutaContenido(nombre);
    var cuerpo = { message: 'Respaldo cifrado del tablero: ' + nombre, content: VJ.seg.bytesAb64(bytes), branch: sesion.rama };
    // Los nombres llevan fecha y hora, así que casi nunca existen; si existe, GitHub pide su versión (sha).
    return pedir(ruta, { metodo: 'PUT', cuerpo: cuerpo })
      .catch(function (e) {
        if (e.status !== 422 && e.status !== 409) throw e;
        return pedir(ruta + '?ref=' + cod(sesion.rama)).then(function (r) { return r.json(); }).then(function (j) {
          cuerpo.sha = j.sha;
          return pedir(ruta, { metodo: 'PUT', cuerpo: cuerpo });
        });
      })
      .then(function () { return { nombre: nombre, bytes: bytes.length }; });
  }

  function abrir(nombre) {
    return pedir(rutaContenido(nombre) + '?ref=' + cod(sesion.rama), { accept: 'application/vnd.github.raw+json' })
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (b) { return new Uint8Array(b); });
  }

  VJ.gh = {
    conectar: conectar,
    info: info,
    conectado: function () { return !!sesion; },
    olvidar: function () { sesion = null; },
    listar: listar,
    guardar: guardar,
    abrir: abrir
  };
})(window);
