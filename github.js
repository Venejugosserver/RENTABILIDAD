/*!
 * VENEJUGOS 2015, tablero comercial.
 * Copyright (c) 2026 DISTRIBUIDORA VENEJUGOS 2015, C.A. Todos los derechos reservados.
 * Uso interno exclusivo. Prohibida su copia, distribucion o modificacion sin autorizacion escrita.
 *
 * Publicacion en GitHub con un token escrito en el panel (como en el tablero de KPI Nestle).
 * - Publicar: escribe dataset.json en el repositorio del sitio; GitHub Pages lo sirve al equipo.
 * - Copias con fecha: archivos .vjenc en una carpeta del mismo repositorio.
 * Todo lo que sube va cifrado con la clave de acceso. El token solo viaja a api.github.com.
 */
(function (global) {
  'use strict';
  var VJ = global.VJ = global.VJ || {};
  var C = global.VJ_CONFIG;
  var API = 'https://api.github.com';
  var cod = encodeURIComponent;
  var sesion = null;

  // Acepta «usuario/repositorio» o la dirección completa de GitHub.
  function normalizarRepo(texto) {
    return String(texto || '').trim()
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\.git$/i, '')
      .replace(/^\/+|\/+$/g, '');
  }

  function configurar(conf) {
    var repo = normalizarRepo(conf.repo);
    var partes = repo.split('/');
    if (partes.length !== 2 || !/^[A-Za-z0-9_.-]+$/.test(partes[0]) || !/^[A-Za-z0-9_.-]+$/.test(partes[1])) {
      throw new Error('Escribe el repositorio como usuario/repositorio.');
    }
    var token = String(conf.token || '').trim();
    if (!token) throw new Error('Pega el token de acceso.');
    if (!/^(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})$/.test(token)) {
      throw new Error('Eso no parece un token de GitHub. Debe empezar por github_pat_ o ghp_.');
    }
    var ruta = String(conf.ruta || C.datosPublicados || 'dataset.json').trim().replace(/^\/+/, '');
    if (!ruta || /\.\./.test(ruta)) throw new Error('La ruta del archivo no es válida.');
    sesion = {
      token: token, owner: partes[0], repo: partes[1],
      rama: String(conf.rama || '').trim() || 'main',
      ruta: ruta,
      carpeta: String((C.github && C.github.carpeta) || 'respaldos').replace(/^\/+|\/+$/g, '')
    };
    return info();
  }

  function errorGitHub(status, j) {
    var t;
    if (status === 401) t = 'Token inválido o vencido.';
    else if (status === 403) t = 'El token no tiene permiso de escritura sobre este repositorio, o GitHub limitó las consultas por un rato.';
    else if (status === 404) t = 'No se encontró el repositorio o la rama. Revisa el nombre y que el token alcance este repositorio.';
    else if (status === 409) t = 'Conflicto de versión. Vuelve a intentar.';
    else if (status === 422) t = 'GitHub no aceptó el cambio. Vuelve a intentar en unos segundos.';
    else t = 'GitHub respondió con el error ' + status + '.';
    var e = new Error(t);
    e.status = status;
    e.detalle = j && j.message ? j.message : '';
    return e;
  }

  function pedir(ruta, op) {
    op = op || {};
    if (!sesion) return Promise.reject(new Error('Primero completa y guarda la conexión.'));
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

  function base() { return '/repos/' + cod(sesion.owner) + '/' + cod(sesion.repo); }
  function rutaContenido(camino) { return base() + '/contents/' + camino.split('/').map(cod).join('/'); }

  // Verifica acceso a la rama y devuelve el último commit.
  function probar() {
    return pedir(base() + '/branches/' + cod(sesion.rama)).then(function (r) { return r.json(); }).then(function (j) {
      return { commit: j && j.commit && j.commit.sha ? j.commit.sha.slice(0, 7) : '' };
    });
  }

  // Crea o reemplaza un archivo de texto en el repositorio.
  function escribir(camino, texto, mensaje) {
    var ruta = rutaContenido(camino);
    return pedir(ruta + '?ref=' + cod(sesion.rama))
      .then(function (r) { return r.json(); })
      .then(function (j) { return j && j.sha ? j.sha : null; })
      .catch(function (e) { if (e.status === 404) return null; throw e; })
      .then(function (sha) {
        var bytes = new TextEncoder().encode(texto);
        var cuerpo = { message: mensaje, content: VJ.seg.bytesAb64(bytes), branch: sesion.rama };
        if (sha) cuerpo.sha = sha;
        return pedir(ruta, { metodo: 'PUT', cuerpo: cuerpo }).then(function (r) { return r.json(); });
      })
      .then(function (j) {
        return { ruta: camino, commit: j && j.commit && j.commit.sha ? j.commit.sha.slice(0, 7) : '', bytes: texto.length };
      });
  }

  function publicar(texto) {
    return escribir(sesion.ruta, texto, 'Publicar datos del tablero (' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ')');
  }

  function listar() {
    return pedir(rutaContenido(sesion.carpeta) + '?ref=' + cod(sesion.rama)).then(function (r) { return r.json(); }).then(function (lista) {
      if (!Array.isArray(lista)) return [];
      return lista.filter(function (f) { return f.type === 'file' && /\.vjenc$/.test(f.name); })
        .map(function (f) { return { nombre: f.name, bytes: f.size }; })
        .sort(function (a, b) { return a.nombre < b.nombre ? 1 : -1; });
    }).catch(function (e) { if (e.status === 404) return []; throw e; });
  }

  // Copia con fecha: los nombres llevan fecha y hora, así que casi nunca existen.
  function guardar(bytes, nombre) {
    var ruta = rutaContenido(sesion.carpeta + '/' + nombre);
    var cuerpo = { message: 'Copia cifrada del tablero: ' + nombre, content: VJ.seg.bytesAb64(bytes), branch: sesion.rama };
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
    return pedir(rutaContenido(sesion.carpeta + '/' + nombre) + '?ref=' + cod(sesion.rama), { accept: 'application/vnd.github.raw+json' })
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (b) { return new Uint8Array(b); });
  }

  function info() {
    return sesion ? { repo: sesion.owner + '/' + sesion.repo, rama: sesion.rama, ruta: sesion.ruta, carpeta: sesion.carpeta } : null;
  }

  VJ.gh = {
    configurar: configurar,
    normalizarRepo: normalizarRepo,
    info: info,
    conectado: function () { return !!sesion; },
    olvidar: function () { sesion = null; },
    probar: probar,
    publicar: publicar,
    listar: listar,
    guardar: guardar,
    abrir: abrir
  };
})(window);
