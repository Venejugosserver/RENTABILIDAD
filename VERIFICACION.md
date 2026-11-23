# Verificación antes de la entrega

Fecha: 23/11/2026. Versión 1.0.0.

La sección 8 cubre la versión 1.1.0 (lectura del reporte general de ventas de MobilVendor y archivos sueltos en la raíz) y la 9, la versión 1.1.1 (prueba con todos los archivos reales juntos). La sección 9 cubre la 1.1.1: prueba con los archivos reales y un ajuste en el enlace con el inventario.

Entorno de prueba:

- Navegador: Chromium sin interfaz (Playwright), servido desde un servidor local, con la política de seguridad de contenido activa.
- Lector de Excel: SheetJS 0.20.3, más la 0.18.5 de respaldo.
- Tipografías: Barlow instaladas localmente.
- GitHub: simulado (misma API de contenidos: listar, subir y descargar en crudo).

## 1. Lectura de los archivos reales

| Archivo | Se detectó como | Resultado | Control |
| --- | --- | --- | --- |
| INVENTARIO_GENERAL.xlsx | Inventario, hoja «inventario» (de 9 hojas) | 776 productos, 20 inactivos; 0,6 a 1,2 s | Encabezado en la fila 3; columna « CATEGORIAS» con espacio, reconocida |
| rentabilidad_mobilvendor.xlsx | Rentabilidad MobilVendor | 602 líneas (573 productos, 16 bonificaciones, 4 ajustes) | Venta sumada US$ 467.725,68 = total del reporte |
| RENTABILIDAD_MODULO_B.XLS | Rentabilidad Módulo B | 234 líneas, 44 grupos de proveedor | US$ 231.231,92 contra 231.231,94 del pie (redondeo del reporte) |
| ventas_modulo_b_hoy.xls | Ventas directas | 4.594 líneas, del 02/11 al 23/11 | US$ 228.017,14, igual que un cálculo independiente con pandas |
| dinamica_de_ventas.xlsx (15 MB) | Ventas agrupadas | 21.356 líneas, del 02/11 al 20/11; 6,6 a 8,8 s sin congelar la pantalla | MobilVendor US$ 448.833,16 y Módulo B US$ 221.769,35, iguales a pandas |
| formato_carga_productos.xlsx | Inventario (plantilla) | 3 productos | Avisa que no trae costo |

Resultado de validación con la dinámica:

- 31 productos y 179 líneas vendidas por debajo del costo, con US$ 1.650,17 de pérdida. Coincide con el cálculo independiente en Python.
- 2 líneas de obsequio a precio cero.

## 2. Recorrido de cada control

| Control | Resultado |
| --- | --- |
| Casilla Inventario | Lee el archivo; «Reemplazar» abre el selector y cambia el archivo; «Quitar» la vacía y devuelve el foco al selector |
| Rentabilidad cruzada | El reporte de Módulo B puesto en la casilla de MobilVendor quedó en su casilla, con aviso |
| Mismo archivo dos veces | En la misma casilla avisa «ya estaba cargado»; en otra casilla lo rechaza con el nombre de la casilla original |
| Archivo de otro tipo | La plantilla de inventario en Ventas responde «Este archivo parece de inventario. Cárgalo en el panel de Inventario.» |
| Formato no admitido | Una foto .jpg en Rentabilidad muestra un mensaje que indica los formatos válidos |
| Modalidades de ventas | Cambiar de modalidad recalcula; la otra queda cargada y se avisa que no se suma |
| Pestañas | Clic, flechas izquierda y derecha, Inicio y Fin; la dirección #rentabilidad abre esa pestaña |
| Ventas | «Ver facturas» abre y cierra el detalle (aria-expanded); filtros de módulo, línea y búsqueda sin distinguir tildes |
| Inventario | Filtros por estado (aria-pressed), umbrales que recalculan y devuelven el foco, «Mostrar 50 más» |
| Rentabilidad | Clave incorrecta avisa los intentos que quedan; al quinto, pausa de 5 minutos que sobrevive a recargar |
| Desbloqueo y bloqueo | La clave correcta desbloquea y mueve el foco al título; «Bloquear ahora» vuelve al candado |
| Bloqueo por inactividad | Con el reloj adelantado 16 minutos, se bloqueó solo y avisó |
| Fotos | Sin línea pide la línea y enfoca el campo; con línea agrega la foto |
| Fotos en Líneas | «Agregar fotos a esta línea» abre el selector ya con la línea; el visor abre, cierra con Escape y elimina con confirmación |
| Plantilla con vencimiento | Descarga inventario_con_vencimiento.xlsx con el inventario cargado |
| Vencimientos | Llenada y vuelta a cargar, clasificó los cinco casos: vencido, no alcanza a venderse (con unidades sobrantes), vence pronto y se vende a tiempo |
| Clave nueva | Pide la clave actual; rechaza claves cortas, con el nombre de la empresa o que no coinciden |
| Huella de la clave nueva | La huella generada se verificó por separado con Python (PBKDF2-SHA-256); «Copiar bloque» copia el texto exacto |
| GitHub, token | Un token inválido muestra «No encontré un token de GitHub válido»; el válido conecta y lista |
| GitHub, respaldo | «Guardar respaldo» sube un archivo .vjenc; «Borrar todo» y luego «Abrir respaldo» restauran ventas, inventario, rentabilidad y fotos; «Desconectar» olvida el token |
| Botón flotante | Visible solo en teléfono; su texto cambia por pestaña y abre el selector que corresponde |
| Enlace «Saltar al contenido» | Es el primer elemento con Tab y lleva a #principal |

## 3. Seguridad y privacidad

- **Política de seguridad de contenido:** activa. Bloqueó incluso la evaluación de texto como código de la herramienta de pruebas.
- **Texto malicioso:** un inventario con nombres como `<img src=x onerror=...>` y `<script>` se mostró como texto literal; no se ejecutó nada.
- **Respaldo cifrado:** el archivo subido empieza con la cabecera `VJ1` y no contiene texto legible (por ejemplo, no aparece «UNIVERSAL»).
- **Fotos:** a una foto con metadatos de cámara se le quitó el bloque EXIF; el modelo de cámara ya no aparece en los bytes.
- **Almacenamiento:** el navegador solo guarda `vj-intentos` (contador de intentos fallidos).
- **Secretos:** no hay clave en texto plano ni tokens en ningún archivo del proyecto.
- **Estilos y eventos:** no hay estilos ni manejadores de eventos en línea.
- **Apertura local:** abierto como archivo local (file://), arranca y lee el inventario en la página cuando el hilo aparte no está disponible.
- **CDN caído:** con el CDN principal de SheetJS caído, el lector usó el de cdnjs y leyó la dinámica completa.

## 4. Adaptabilidad

- Anchos medidos: 320, 375, 414, 640, 768, 1024, 1100, 1280, 1440 y 1920 px, en las 5 pestañas y con todos los datos cargados.
- Resultado: 0 elementos fuera de la pantalla en las 50 combinaciones. Las tablas anchas se desplazan dentro de su propio contenedor; en teléfono se convierten en tarjetas.
- La página de privacidad no tiene desbordes en 320, 375, 768 y 1440 px.
- Consola sin errores. La única excepción es el 404 que GitHub responde cuando la carpeta de respaldos todavía no existe; el tablero lo muestra como «Aún no hay respaldos».

## 5. Contraste (WCAG AA)

| Par | Contraste |
| --- | --- |
| Texto #18233A sobre blanco | 15,67:1 |
| Acero #5A6A80 sobre blanco / sobre fondo / sobre encabezado de tabla | 5,51:1 / 4,83:1 / 5,23:1 |
| Total ámbar #E9A21B sobre azul #1B3663 | 5,50:1 |
| Azul profundo sobre botón ámbar | 7,29:1 |
| Éxito / error sobre sus fondos | 4,54:1 / 5,75:1 |
| Notas del encabezado sobre azul | 7,33:1 |
| Texto de etiqueta de categoría (tono 214) | 9,78:1 |

## 6. Control de calidad de diseño (antislop, modo durante)

Lectura del encargo: tablero de operación interna para el equipo comercial de una distribuidora venezolana, con la identidad vial fijada por el dueño. Diales: ENERGÍA 2, RITMO 1, MOVIMIENTO 1.

Todos los puntos obligatorios pasan:

- **Sin rayas largas:** no hay ninguna en el proyecto.
- **Sin desbordes:** 0 en 54 mediciones.
- **Cifras reales:** el encabezado muestra «Sin datos» hasta que hay archivos.
- **Sin elementos inventados:** no hay testimonios ni contenido de relleno.
- **Logo provisional rotulado:** está marcado en el SVG, en la guía y en la entrega.
- **Navegación real:** las 5 pestañas y el enlace a la política llevan a contenido existente.
- **Contraste:** todos los pares superan 4,5:1.
- **Sin controles muertos:** se recorrieron todos.
- **Estados completos:** vacío, leyendo y error en cada casilla y vista.
- **Teclado:** se puede usar completo, con foco ámbar visible.
- **Movimiento:** se respeta la preferencia de movimiento reducido.
- **Semántica:** `lang`, `<title>`, regiones, un `h1` por página y zoom permitido.
- **Imágenes:** todas con ancho y alto; el logo con prioridad alta.
- **Scripts:** ninguno bloquea la carga.
- **Rendimiento:** no se midió; no se reporta ninguna cifra.

Decisiones de diseño y su razón:

- **Degradado radial del encabezado:** es la firma pedida en el manual.
- **Recuadros translúcidos:** solo en el encabezado, sin desenfoque.
- **Ámbar:**
  - En la acción principal y la pestaña activa.
  - En el total y en la línea vial.
  - En la barra de lectura, que repite la carretera como señal de que se está leyendo un archivo y solo se mueve durante la lectura.
- **Rojo:** solo para errores, ventas bajo costo y agotados.
- **Íconos:** propios y ligados a su función (subir, cámara, llave, candado).
- **Tema:** claro, porque el manual fija la paleta y prohíbe colores fuera de la lista.

Nota de proceso: una edición temprana de `analisis.js` se aplicó con un script de reemplazo de texto. El archivo final es código fuente normal, revisado y probado; no hay ningún paso de parcheo en la entrega.

## 7. Lo que no se pudo verificar aquí

- La API real de GitHub (se probó contra una simulación con el mismo contrato). Hay que hacer una prueba con el token y el repositorio reales.
- El archivo directo de ventas de MobilVendor: no se recibió una muestra. Se probó en la versión 1.1.0 (sección 8).
- Safari de iPhone y Firefox: solo se probó Chromium. Las funciones usadas (Web Crypto, CompressionStream, `<dialog>`) existen en las versiones actuales de ambos.
- Métricas de rendimiento en campo (LCP, INP, CLS): no medidas.

## 8. Versión 1.1.0: ventas directas de MobilVendor y archivos sueltos

Fecha: 23/11/2026. Mismo entorno de prueba de arriba, más Node 22 para comparar el lector anterior con el nuevo.

Cambios:

- El lector reconoce el reporte general de ventas de MobilVendor (hoja «Ventas», 83 columnas). Antes lo rechazaba con «No encontré una fila de encabezados reconocible».
- La cantidad se toma en unidad de inventario y el descuento en porcentaje. El código del producto se toma tal cual.
- En el cuadre contra la rentabilidad, entre líneas con el mismo código se prefiere la del mismo nombre.
- La casilla de ventas muestra el formato reconocido.
- Todos los archivos quedaron en la raíz, sin carpetas. Se ajustaron las rutas de `index.html`, `privacidad.html` y `carga.js`, y tres textos en pantalla que mencionaban `js/config.js`.

### Lectura del archivo real

| Archivo | Se detectó como | Resultado | Control |
| --- | --- | --- | --- |
| ReporteGeneral (82).xlsx (4,7 MB) | Ventas MobilVendor, hoja «Ventas», encabezado en la fila 1 | 17.303 líneas, 3.192 documentos, 1.281 clientes y 591 productos, del 02/11 al 23/11 (16 días con despacho); 3,9 a 4,4 s en el navegador (dos corridas) | US$ 464.952,34 de venta neta, igual que un cálculo independiente con pandas |

Resultado de validación:

- 22 productos y 75 líneas vendidas por debajo del costo, con US$ 692,85 de pérdida. Coincide con pandas.
- 2 líneas de obsequio a precio cero, US$ 5,56 a costo.
- 477 líneas de notas de crédito por US$ -9.591,09: 369 de mercancía (US$ -7.249,11 y 4.115 unidades) y 108 de descuentos por pronto pago y diferencias de precio (US$ -2.341,98), que van como ajustes.
- Del 02/11 al 20/11 la venta da US$ 448.847,98. La dinámica de la sección 1 registró US$ 448.833,16 para MobilVendor en esas fechas.
- Unidad: con `Cantidad` en lugar de `CantidadEnUnidadInventario`, el margen mediano de las líneas vendidas por display o bulto sería de 95 %; con la unidad de inventario es de 22,3 %.

### Controles

| Control | Resultado |
| --- | --- |
| Sin `CantidadEnUnidadInventario` | Una copia del archivo sin esa columna dio los mismos números, con `Cantidad` por `UnidadFactor` |
| Sin esa columna ni `UnidadFactor` | La casilla muestra el aviso de unidades; el costo cae a US$ 327.967,73 |
| Formatos anteriores | Lector 1.0.0 contra 1.1.0 con archivos de prueba armados con los encabezados de la dinámica, Módulo B, inventario y las dos rentabilidades: 50 de 50 resultados idénticos con SheetJS 0.20.3 y 0.18.5. Con un alias quitado a propósito, la misma comparación marcó 6 diferencias |
| Casilla de Módulo B | El reporte quedó en la casilla de MobilVendor, con el aviso «Eran ventas de MobilVendor; quedaron en su casilla.» |
| Modalidad agrupada | Lo lee y avisa que solo trae las ventas de MobilVendor |
| Panel de Inventario | Responde «Este archivo parece de ventas. Cárgalo en el panel de Ventas.» |
| Mismo archivo dos veces | Lo rechaza con el nombre de la casilla original |
| Pestaña Ventas | Indicadores, tabla de ventas bajo costo y «Ver facturas» (aria-expanded) con los datos del archivo |
| Archivos sueltos | Todos responden 200 desde la raíz; la lectura corre en el hilo aparte (`lector-worker.js`); la página de privacidad carga estilos y logo, y «Volver al tablero» funciona |
| Consola y red | Sin errores de consola ni solicitudes fallidas |
| Desbordes | 0 a 320, 375, 768 y 1280 px en Carga de datos, Ventas y Líneas y fotos |

### Lo que no se pudo verificar en 1.1.0

- El cuadre con el reporte real de rentabilidad de MobilVendor, el cruce con el inventario real y la dinámica y Módulo B reales no se tenían en esta prueba. Se verificaron después: ver la sección 9.

Los tres puntos se probaron con los archivos reales en la versión 1.1.1 (sección 9).

Observado y sin cambiar: en la cabecera, a 1280 px, la venta neta abreviada se corta («465,0 …»). No viene de este cambio: la cabecera y los estilos no se tocaron.

## 9. Versión 1.1.1: prueba con los archivos reales

Fecha: 23/11/2026. Se recibieron INVENTARIO_GENERAL.xlsx, rentabilidad_mobilvendor.xlsx, RENTABILIDAD_MODULO_B.XLS, ventas_modulo_b_hoy.xls y dinamica_de_ventas.xlsx, los mismos de la sección 1.

Cambio: en el enlace con el inventario, si el código coincide exacto pero los nombres no comparten ninguna palabra, no se enlaza y se busca por nombre exacto. El enlace por `-1` no cambia.

### Formatos anteriores con los archivos reales

| Archivo | Lector 1.0.0 contra 1.1.1 | Resultado |
| --- | --- | --- |
| INVENTARIO_GENERAL.xlsx | Idéntico | 776 productos |
| rentabilidad_mobilvendor.xlsx | Idéntico | 602 líneas, US$ 467.725,68 |
| RENTABILIDAD_MODULO_B.XLS | Idéntico | 234 líneas, US$ 231.231,92 |
| ventas_modulo_b_hoy.xls | Idéntico | 4.594 líneas, US$ 228.017,14 |
| dinamica_de_ventas.xlsx | Idéntico | 21.356 líneas; MobilVendor US$ 448.833,16 y Módulo B US$ 221.769,35 |

Idénticos con SheetJS 0.20.3 y con 0.18.5 (10 de 10).

### Cuadre de MobilVendor

- Ventas US$ 464.952,34 contra US$ 467.725,68 de la rentabilidad: US$ -2.773,34 (-0,6 %).
- Los ajustes por pronto pago y diferencias de precio son iguales en los dos: US$ -2.341,98.
- Los 51 productos con diferencia tienen más unidades en la rentabilidad, al mismo precio; ninguno tiene más en ventas. En total son 2.977 unidades, sobre todo cigarrillos (Pall Mall P20: 1.000 cajetillas). Apunta a facturas que están en la rentabilidad y no en el reporte general, probablemente hechas después de exportarlo.
- No son notas de crédito: solo en 1 de los 51 productos la diferencia es igual a sus notas de crédito.
- El reporte de ventas tiene 550 líneas el 23/11, frente a 836 a 1.023 en los lunes anteriores.
- Con la dinámica, que llega al 20/11, la diferencia es de US$ -18.892,51 (-4,0 %).
- Módulo B muestra una diferencia del mismo tipo (-1,4 %). No viene de este cambio: su lectura es idéntica a la de 1.0.0.

### Unidades y enlace con el inventario

- De los 35 productos que MobilVendor vende alguna vez por display o bulto, en ninguno el precio del inventario se parece al del display: en 26 coincide (±25 %) con el precio por unidad de inventario de MobilVendor y en los otros 9 es entre 1,3 y 1,5 veces ese precio. El stock está en esa unidad, que es la de `CantidadEnUnidadInventario`.
- El reporte de rentabilidad de MobilVendor cuenta igual: en 34 de esos 35 productos su cantidad coincide con `CantidadEnUnidadInventario`.
- La dinámica cuenta en unidad de venta pero con costo por unidad: así pasa en 33 de los 34 productos vendidos por display o bulto entre el 02/11 y el 20/11 (Savoy Leche: 1.044 displays contra 8.469 barras). En los 584 productos de MobilVendor comunes de ese período la venta coincide (US$ 446.288,89 contra 446.715,93) y el costo no (US$ 387.972,59 contra 313.910,44): margen de 13,1 % con el reporte directo, 29,7 % con la dinámica y 12,9 % en el reporte de rentabilidad. Ya pasaba en 1.0.0.
- De 491 productos de MobilVendor enlazados con costo, 461 tienen el mismo costo unitario en el inventario (±10 %). Los otros 30 son costos del inventario con IVA (razón 0,86; sopa de pollo Maggi: 0,912 contra 1,06), costos por display con precio por unidad en el inventario (Samba Fresa: costo 14,15 y precio 0,90) y las cajas de cigarrillos.
- 492 de los 587 productos de MobilVendor se enlazan con el inventario. Los dos códigos `855` del inventario (pudín de fresa y azúcar morena) quedan cada uno con su producto.
- Con la regla nueva cambian solo dos enlaces, igual en el reporte directo, en la dinámica y en la rentabilidad: Marilú Choc. Tub (`028`) ya no cae en Piñata Surtido (`28`, Módulo B) y Panettone de Frutas (`40`) ya no cae en Jelly Cup (`40`, Módulo B). Los otros 2.464 de los 2.470 renglones de ventas y rentabilidad quedan igual.
- Sin cambiar, en pendientes: 8 cajas de cigarrillos se enlazan con la cajetilla y cada caja cuenta como una cajetilla (151 cajas, US$ 3.034,83).

### Recorrido en Chromium con los seis archivos

| Control | Resultado |
| --- | --- |
| Casillas (dos corridas) | Inventario 0,8 a 1,0 s; rentabilidades 0,1 a 0,2 s; ventas de MobilVendor 4,3 a 4,4 s; ventas de Módulo B 1,5 a 1,6 s |
| Ventas | Venta neta US$ 692.969,48; 39 productos y 193 líneas bajo costo con US$ 1.831,48 de pérdida; cuadre por módulo y 137 productos sin ficha: 90 de MobilVendor (US$ 21.193,97) y 47 de Módulo B (US$ 17.268,27). Con la dinámica salen 135, así que la falta está en el inventario |
| Inventario | 756 activos, cobertura mediana de 31 días, 106 en riesgo de quiebre, 181 sin movimiento |
| Dinámica | 6,3 a 7,1 s en el hilo aparte, mismas cifras de la sección 1 |
| Consola y red | Sin errores de consola ni solicitudes fallidas |
| Desbordes | 0 a 320, 375, 768 y 1280 px en las cinco pestañas |

No se pudo verificar: el contenido de la pestaña Rentabilidad en pantalla, porque pide la clave. El cálculo se revisó en Node: 81 alertas (8 críticas, 27 altas, 46 medias).
