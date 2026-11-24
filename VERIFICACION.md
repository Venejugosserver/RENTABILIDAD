# Verificación antes de la entrega

Fecha: 23/11/2026. Versión 1.0.0.

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
| ReporteGeneral (82).xlsx, ventas de MobilVendor | Ventas directas de MobilVendor (83 columnas) | 17.303 líneas, del 02/11 al 23/11; 3,5 s | Venta US$ 464.952,34 y costo US$ 327.967,73, iguales a pandas; aceite de soya Vatel 1.292 unidades y US$ 3.294,14, igual al reporte de rentabilidad |

Resultado del ReporteGeneral de MobilVendor:

- Del 02 al 20/11 suma US$ 448.847,98, contra US$ 448.833,16 de la dinámica (diferencia de US$ 14,82).
- La cantidad viene en unidad de venta (display, caja o unidad), igual que en la dinámica.
- Notas de crédito:
  - 108 son descuentos (pronto pago, diferencia de precio) y quedan como ajustes comerciales.
  - 363 líneas son devoluciones de producto con razón «CADUCA»: 174 productos, 3.392 unidades y US$ 7.244,47.

En modalidad directa (MobilVendor y Módulo B, del 02 al 23/11):

- 36 productos y 190 líneas por debajo del costo, con US$ 1.749,29 de pérdida.
- Cuadre contra rentabilidad: −0,59 % en MobilVendor y −1,39 % en Módulo B.

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
| Archivos directos cruzados | El ReporteGeneral en la casilla de Módulo B y el archivo de Módulo B en la de MobilVendor se reconocieron por su formato y quedaron en su casilla, con aviso |
| Devueltos por caducidad | Indicador y columna en Ventas; tabla cruzada con la rotación en Inventario; 39 alertas «Vuelve vencido» en Rentabilidad (21 altas), con la redacción correcta cuando lo devuelto supera lo vendido |
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

Nota de proceso: una edición temprana de `js/analisis.js` se aplicó con un script de reemplazo de texto. El archivo final es código fuente normal, revisado y probado; no hay ningún paso de parcheo en la entrega.

## 7. Lo que no se pudo verificar aquí

- La API real de GitHub (se probó contra una simulación con el mismo contrato). Hay que hacer una prueba con el token y el repositorio reales.
- El campo «Razón» de MobilVendor dice «CADUCA» también en las notas de descuento. Por eso el tablero solo cuenta como caducadas las notas de producto. Si el sistema usa «CADUCA» como valor por defecto, conviene confirmarlo con quien carga las notas de crédito.
- Safari de iPhone y Firefox: solo se probó Chromium. Las funciones usadas (Web Crypto, CompressionStream, `<dialog>`) existen en las versiones actuales de ambos.
- Métricas de rendimiento en campo (LCP, INP, CLS): no medidas.
