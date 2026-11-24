# Verificación antes de la entrega

Fecha: 24/11/2026. Versión 1.2.0: archivos sueltos en la raíz, sin carpetas, y diseño tomado de NEXUS. Incluye lo de la 1.1.0: líneas como marcas, sección privada de unificación y sin sugeridos de compra.

Entorno de prueba:

- Navegador: Chromium sin interfaz (Playwright), servido desde un servidor local, con la política de seguridad de contenido activa.
- Lector de Excel: SheetJS 0.20.3, más la 0.18.5 de respaldo.
- Tipografías: Bricolage y Hanken, servidas desde el propio sitio. El navegador confirmó que ambas cargan.
- GitHub: simulado (misma API de contenidos: listar, subir y descargar en crudo).

## 0. Cambios de la versión 1.2.0

**Archivos sin carpetas**

Los 28 archivos van sueltos en la raíz, como en NEXUS. Se ajustaron las rutas de la página, de la política y del lector que trabaja en hilo aparte. El tablero se probó completo con esta estructura.

**Diseño tomado de NEXUS**

El repositorio público de NEXUS (Venejugosserver/NEXUS) se descargó y se mostró en el navegador para tomar sus medidas y colores. Del original se adoptó:

- Fondo azul Venejugos en degradado y titulares con brillo plateado.
- Logo e íconos reales de Venejugos, con el logo en marco plateado.
- Navegación como control segmentado y la cinta ondulada blanca y roja, que se dibuja al cargar.
- Hojas blancas con marco de plata, insignias y bordes en rojo metálico, botones plateados sobre azul y azul metálico dentro de las hojas.
- Tipografías Bricolage y Hanken, alojadas en el sitio. Ya no se usa Google Fonts.

Ajustes propios:

- El texto secundario de las hojas es un poco más oscuro que en NEXUS.
- Un tramo del degradado se oscureció levemente.
- Los rótulos pequeños sobre zonas translúcidas van en blanco.
- Cuando hay seis indicadores, se acomodan en tres columnas parejas.
- El «US$» de las cifras grandes va como prefijo pequeño, para que no se corten.

Los primeros tres ajustes son para cumplir el contraste mínimo de lectura (sección 5).

La cinta se mueve mientras se lee un archivo, como aviso de que el tablero está trabajando. Con la preferencia de movimiento reducido no hay animaciones.

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

## 1 bis. Cambios de la versión 1.1.0

**Líneas = marcas**

- La marca es la «Unidad de Negocio» del inventario, de Módulo B y de la dinámica, y la «DescrMarca» del ReporteGeneral de MobilVendor.
- Al cruzar el ReporteGeneral con la dinámica, la única diferencia es «NIM» en MobilVendor contra «NESTLE» en la dinámica, en 7.558 líneas. El tablero hace la misma traducción.
- Líneas que más venden en modalidad directa: BIGOTT (US$ 258.884), NESTLE (US$ 177.426) y PEPSICO (US$ 45.482).
- La categoría (VIVERES & ALIMENTOS, SNACKS…) queda solo como respaldo para comparar similares.

**Unificación entre módulos** (con todos los archivos en modalidad directa)

- Sugerencias:
  - 116 en total: 113 de mismo código, una de mismo nombre y dos de nombre parecido.
  - «Unificar las 113 de mismo código» las unió en un clic.
  - La sugerencia equivocada (GLUP FRESH con GLUP MANZANA ROJA, sabores distintos) se descartó; ese producto dejó de sugerirse.
- Efecto en la comparación y el inventario:
  - Con los 113 unidos: 68 productos con precio distinto entre módulos (más de 5 %) y 40 con costo distinto.
  - 6 pares de fichas de inventario quedaron combinados. Por ejemplo, Caldo de pollo 8 (92 g): 2.626 unidades, 120 por día, 22 días de cobertura.
- Marcas con nombre distinto entre módulos: BIGOTT y DISTRIBUIDORA BIGOTT (9 productos), TIO CACO y TU ALIADO COMERCIAL (3), P&G y ALIMENTOS POLAR (3).
- Unión a mano:
  - Rechaza productos que no están en la lista.
  - Pide confirmación cuando los nombres no comparten ninguna palabra.
- Separar devuelve el producto a las sugerencias.
- Excel de equivalencias:
  - Se descargó con 114 filas y se cargó en una pestaña nueva (114 equivalencias).
  - Cargar el mismo archivo otra vez no duplica: 0 nuevas, 114 omitidas.
- El respaldo cifrado con productos unificados se guardó (206 KB) y se restauró con sus 114 equivalencias y el descarte.

**Sin sugeridos de compra**

Con todos los archivos cargados se revisaron todas las sugerencias de inventario y todas las alertas: ningún texto menciona pedidos, compras ni reposición.

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

- Anchos medidos: 320, 375, 414, 640, 768, 1024, 1100, 1280, 1440 y 1920 px, en las 6 pestañas, con todos los datos cargados y 113 productos unificados.
- Resultado: 0 elementos fuera de la pantalla en las 60 combinaciones. Las tablas anchas se desplazan dentro de su propio contenedor; en teléfono se convierten en tarjetas.
- La página de privacidad no tiene desbordes en 320, 375, 768 y 1440 px.
- Consola sin errores, con dos excepciones esperadas:
  - El 404 que GitHub responde cuando la carpeta de respaldos todavía no existe; el tablero lo muestra como «Aún no hay respaldos».
  - Al abrir `index.html` como archivo local, Chrome bloquea las tipografías propias y usa las del sistema. Servido desde un sitio (como GitHub Pages) cargan bien.

## 5. Contraste (WCAG AA)

| Par | Contraste |
| --- | --- |
| Blanco sobre el fondo azul, en su tramo más claro | 6,06:1 |
| Texto suave #dbe4ff sobre ese mismo tramo | 4,78:1 |
| Blanco sobre los recuadros translúcidos del resumen | 4,79:1 |
| Blanco sobre el resplandor superior izquierdo | 4,61:1 |
| Azul #163db0 sobre la plata de la pestaña activa, en su tramo más oscuro | 5,65:1 |
| Texto de hoja #0b2559 sobre blanco | 14,76:1 |
| Texto secundario #4f6091 sobre el tramo más oscuro de la hoja | 5,09:1 |
| Etiqueta de línea #1f4fd1 sobre #e8eeff | 5,85:1 |
| Alerta #b80016 / correcto #14663f sobre sus fondos | 5,87:1 / 6,22:1 |
| Diferencia de precio #5c4400 sobre #fff3c4 | 8,27:1 |
| Blanco sobre rojo metálico / sobre azul metálico | 4,94:1 / 6,78:1 |

## 6. Control de calidad de diseño (antislop, modo durante)

Lectura del encargo: tablero de operación interna para el equipo comercial de Venejugos, con la identidad de NEXUS, el portal de reportes de la misma empresa. Diales: ENERGÍA 3, RITMO 1, MOVIMIENTO 2 (la entrada se anima una vez y la cinta se mueve solo mientras se lee un archivo).

Todos los puntos obligatorios pasan:

- **Sin rayas largas:** no hay ninguna en el proyecto.
- **Sin desbordes:** 0 en 64 mediciones (60 del tablero y 4 de la política).
- **Cifras reales:** el encabezado muestra «Sin datos» hasta que hay archivos.
- **Sin elementos inventados:** no hay testimonios ni contenido de relleno.
- **Logo real:** el de Venejugos, tomado de NEXUS; ya no hay logo provisional.
- **Navegación real:** las 6 secciones, el logo y el enlace a la política llevan a contenido existente.
- **Contraste:** todos los pares de texto superan 4,5:1 (sección 5).
- **Sin controles muertos:** se recorrieron todos.
- **Estados completos:** vacío, leyendo y error en cada casilla y vista; las vistas vacías y con candado conservan su titular.
- **Teclado:** se puede usar completo, con foco visible blanco sobre azul y azul sobre las hojas.
- **Movimiento:** se respeta la preferencia de movimiento reducido.
- **Semántica:** `lang`, `<title>`, regiones, un `h1` visible por sección y zoom permitido.
- **Imágenes:** todas con ancho y alto; el logo con prioridad alta.
- **Scripts:** ninguno bloquea la carga.
- **Rendimiento:** no se midió; no se reporta ninguna cifra.

Decisiones de diseño y su razón:

- **Paleta, tipografías y componentes:** son los de NEXUS, a pedido del dueño, para que los dos portales de Venejugos se vean como uno.
- **Degradados y brillo metálico:** son la firma de NEXUS; aquí se limitan al fondo, los titulares, la cinta y los acentos.
- **Rojo:** en acentos de marca (cinta, insignias, borde del indicador principal), en errores, ventas bajo costo y agotados, y en las acciones que borran.
- **Íconos:** propios y ligados a su función (subir, cámara, llave, candado).
- **Tema:** el de NEXUS, fijo, porque el dueño pidió seguir ese portal.

Nota de proceso: una edición temprana de `analisis.js` se aplicó con un script de reemplazo de texto. El archivo final es código fuente normal, revisado y probado; no hay ningún paso de parcheo en la entrega.

## 7. Lo que no se pudo verificar aquí

- La API real de GitHub (se probó contra una simulación con el mismo contrato). Hay que hacer una prueba con el token y el repositorio reales.
- El campo «Razón» de MobilVendor dice «CADUCA» también en las notas de descuento. Por eso el tablero solo cuenta como caducadas las notas de producto. Si el sistema usa «CADUCA» como valor por defecto, conviene confirmarlo con quien carga las notas de crédito.
- Safari de iPhone y Firefox: solo se probó Chromium. Las funciones usadas (Web Crypto, CompressionStream, `<dialog>`) existen en las versiones actuales de ambos.
- Métricas de rendimiento en campo (LCP, INP, CLS): no medidas.
