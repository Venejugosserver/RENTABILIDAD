/*!
 * VENEJUGOS 2015, tablero comercial.
 * Copyright (c) 2026 DISTRIBUIDORA VENEJUGOS 2015, C.A. Todos los derechos reservados.
 * Uso interno exclusivo. Prohibida su copia, distribucion o modificacion sin autorizacion escrita.
 *
 * Configuracion del sitio. Aqui NO va ningun secreto:
 *  - La clave de acceso se guarda solo como huella PBKDF2-SHA-256 (no se puede leer al reves).
 *  - El token de GitHub nunca va en el codigo: se carga desde un archivo en cada sesion.
 */
window.VJ_CONFIG = Object.freeze({
  version: '1.2.0',
  marca: 'VENEJUGOS 2015',
  empresa: 'DISTRIBUIDORA VENEJUGOS 2015, C.A.',
  rif: 'J-29941545-6',

  // Huella de la clave de acceso. Para cambiarla: pestaña Carga de datos > Sesión y seguridad > Preparar una clave nueva.
  clave: Object.freeze({
    sal: 'g4WeWByRmVxAxx40BqJZTQ==',
    iteraciones: 310000,
    huella: 'D4b8XnhgP5X3muS1dEAMiNzxa/4Iuwjfnaz55TdFnt8='
  }),

  // Modulos que piden la clave. Valores posibles: 'rentabilidad', 'unificacion', 'ventas', 'inventario'.
  modulosProtegidos: Object.freeze(['rentabilidad', 'unificacion']),

  bloqueo: Object.freeze({ intentos: 5, minutos: 5, inactividadMinutos: 15 }),

  // Dominios donde el tablero puede funcionar. Cambia '*.github.io' por tu dominio exacto,
  // por ejemplo 'venejugos.github.io'. La cadena vacia permite abrirlo como archivo local.
  dominiosPermitidos: Object.freeze(['localhost', '127.0.0.1', '', '*.github.io']),

  // Repositorio de respaldos. El archivo de token puede traer estos datos; si no, se usan estos.
  github: Object.freeze({ owner: '', repo: '', rama: '', carpeta: 'respaldos' }),

  // Lector de Excel (SheetJS). Se prueba en orden: la version oficial actual y, si falla, la de cdnjs.
  lectorExcel: Object.freeze([
    'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
  ]),

  // Umbrales iniciales del analisis (se pueden ajustar en pantalla durante la sesion).
  ajustes: Object.freeze({ bajaDias: 45, quiebreDias: 7, vencDias: 30, puntosSim: 5, montoMinimo: 200 }),

  maxFotos: 80
});
