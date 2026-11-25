# Tablero comercial VENEJUGOS 2015

Uso interno de DISTRIBUIDORA VENEJUGOS 2015, C.A. El tablero lee en el navegador el inventario, los reportes de rentabilidad y las ventas (MobilVendor, Módulo B o la dinámica agrupada). Con eso valida precios contra costo, mide la rotación, sugiere dónde colocar cada producto y genera alertas de rentabilidad comparando cada producto con sus similares.

Ningún archivo de la empresa se sube a un servidor. Todo se procesa en la pestaña del navegador y se olvida al cerrarla.

## Archivos

Todos los archivos van sueltos en la raíz del repositorio, sin carpetas, igual que NEXUS.

| Archivo | Para qué sirve |
| --- | --- |
| `index.html` | Página del tablero |
| `privacidad.html` | Política de privacidad |
| `styles.css` | Identidad visual (la de NEXUS) y adaptación a teléfono, tableta y escritorio |
| `config.js` | Empresa, huella de la clave, dominios permitidos y umbrales |
| `lectores.js` | Reconoce y lee cada tipo de Excel; descarta RIF, cédulas, direcciones y teléfonos |
| `lector-worker.js` | Lee los Excel grandes en un hilo aparte para no congelar la pantalla |
| `carga.js` | Coordina la lectura, y la hace en la página si el hilo aparte no está disponible |
| `analisis.js` | Cruza ventas, inventario y rentabilidad; unifica productos entre módulos |
| `vistas.js` | Dibuja cada sección |
| `app.js` | Estado en memoria, eventos, fotos, equivalencias, respaldos y plantilla |
| `seguridad.js` | Clave, bloqueo, cifrado de respaldos, candado de dominio |
| `github.js` | Publica `dataset.json` y guarda copias con fecha en GitHub, con el token escrito en el panel |
| `fotos.js` | Reduce las fotos y les quita ubicación y datos de cámara |
| `util.js` | Formato de cifras y fechas |
| `logo-venejugos.png`, `icon-192.png`, `icon-180.png` | Logo e íconos de Venejugos, los mismos de NEXUS |
| `bricolage.woff2`, `hanken.woff2` | Tipografías Bricolage Grotesque y Hanken Grotesk, servidas desde el propio sitio |
| `OFL-bricolage.txt`, `OFL-hanken.txt` | Licencias libres de las tipografías (deben acompañarlas) |
| `dataset.json` | No viene en el zip: lo crea el botón **Publicar dataset.json** en el repositorio |
| `LICENSE` | Licencia de uso interno |
| `VERIFICACION.md` | Pruebas hechas antes de la entrega |

## Publicar en GitHub Pages

1. Descomprime el zip y sube **todos** los archivos sueltos a la raíz del repositorio. Desde la web de GitHub: **Add file > Upload files** y arrastra los archivos (no una carpeta).
2. En el repositorio: **Settings > Pages > Build and deployment > Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. Edita `config.js` y en `dominiosPermitidos` cambia `'*.github.io'` por tu dominio exacto, por ejemplo `'venejugosserver.github.io'`. Así una copia publicada en otro sitio no arranca.
4. Abre `https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/`.

Si abres `index.html` con doble clic desde tu computadora, el tablero funciona, pero Chrome no carga las tipografías propias desde un archivo local y usa las del sistema. En GitHub Pages se ven bien.

Sobre la privacidad del repositorio: con el plan gratuito de GitHub, Pages solo publica desde repositorios públicos, así que el código queda visible. Los datos no, porque nunca se suben. Con GitHub Pro o Team el repositorio del sitio puede ser privado, aunque la página publicada sigue siendo accesible para quien tenga la dirección.

## Clave de acceso

- En `config.js` solo está la **huella** de la clave (PBKDF2-SHA-256 con 310.000 iteraciones), nunca la clave.
- La clave actual se definió fuera de este repositorio. Conviene cambiarla por una más difícil de adivinar:
  1. En el tablero: **Carga de datos > Sesión y seguridad > Preparar una clave nueva**.
  2. Copia el bloque que aparece y reemplaza el bloque `clave` de `config.js`.
  3. Publica el cambio.
- Rentabilidad y Unificación piden la misma clave; al abrir una, se abre la otra.
- Para proteger también Ventas o Inventario, en `config.js`: `modulosProtegidos: ['rentabilidad', 'unificacion', 'ventas', 'inventario']`.
- Después de 5 intentos fallidos el acceso se pausa 5 minutos. Sin uso durante 15 minutos, se vuelve a bloquear. Estos valores están en `bloqueo`.

## Publicar los datos en la web (token + clave)

El tablero escribe `dataset.json` en el repositorio del sitio, igual que el tablero de KPI Nestlé. GitHub Pages lo publica y el equipo lo ve al abrir el tablero.

**Configuración inicial, una sola vez**

1. En GitHub: **Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token**.
   - *Repository access*: solo el repositorio del sitio.
   - *Permissions > Repository permissions > Contents*: **Read and write**. Nada más.
   - *Expiration*: 90 días o menos.
2. En el tablero, pestaña **Carga de datos**, tarjeta **Publicar en GitHub**:
   - Escribe el repositorio (`usuario/repositorio`; también acepta la dirección completa), la rama (`main`) y la ruta (`dataset.json`).
   - Pega el token.
   - Marca **Recordar el token en este navegador** solo si es tu equipo de trabajo.
3. Pulsa **Probar conexión** y luego **Guardar conexión**.

**Actualización, en tres pasos**

1. Carga los archivos del mes en el tablero (y unifica productos si hace falta).
2. Revisa los resultados.
3. Pulsa **Publicar dataset.json** y escribe la clave de acceso. GitHub registra el cambio y GitHub Pages republica el sitio en uno o dos minutos. Si ya había un `dataset.json`, se reemplaza.

**Cómo lo ve el equipo**

- Al abrir el tablero aparece el aviso **Datos publicados**, con la fecha de publicación y el período de ventas.
- **Abrir datos publicados** pide la clave de acceso y carga todo: archivos, unificaciones y fotos.
- Si alguien desbloquea Rentabilidad o Unificación con la pestaña vacía, los datos publicados se abren solos.
- Antes de la primera publicación, la consola del navegador muestra un 404 al buscar `dataset.json`. Es esperado y no afecta el uso.

**Por qué se publica cifrado**

Con el plan gratuito de GitHub el repositorio del sitio es público, y el tablero de KPI Nestlé publica su `dataset.json` legible. Este tablero maneja costos, márgenes y nombres de clientes, así que `dataset.json` lleva todo cifrado con AES-256-GCM:

- La llave sale de la clave de acceso (PBKDF2-SHA-256, 310.000 iteraciones), con sal y vector aleatorios.
- Sin la clave, solo se ven la fecha, los nombres de los archivos y el período.
- Si cambias la clave, lo publicado antes pide la clave anterior; vuelve a publicar con la nueva.

**Copias con fecha (opcional)**

Con la misma conexión, **Guardar copia con fecha** deja una copia cifrada en la carpeta `respaldos/` del repositorio, y **Abrir copia** la recupera. Sirven para volver al estado de un mes anterior.

**Sobre el token**

- Solo viaja a `api.github.com`; nunca va dentro de `dataset.json` ni de los archivos del sitio.
- Sin «Recordar», se olvida al cerrar la pestaña. Con «Recordar», queda en ese navegador hasta pulsar **Olvidar token**.
- Se puede revocar desde GitHub en cualquier momento.

## Uso diario

1. **Carga de datos**:
   - El inventario general (se usa la hoja «inventario»).
   - Los dos reportes de rentabilidad.
   - Las ventas en una de las dos modalidades:
     - *Archivos directos*: MobilVendor y Módulo B.
     - *Agrupado*: la dinámica, con la columna MODULOS.
   - Solo cuenta una modalidad a la vez, y un mismo archivo no se puede cargar dos veces.
2. **Ventas**:
   - Productos vendidos por debajo del costo, con sus facturas.
   - Obsequios a precio cero y devoluciones.
   - Productos vendidos que no están en el inventario.
   - Cuadre contra los reportes de rentabilidad.
3. **Inventario**:
   - Cobertura en días, riesgo de quiebre e inventario sin movimiento.
   - Sugerencias de colocación según dónde venden sus similares.
   - Vencimientos y calidad de los datos.
4. **Rentabilidad** (con clave):
   - Alertas de margen frente a similares y a la rotación.
   - Margen por línea (marca) y capital inmovilizado.
   - Detalle por producto.
5. **Unificación** (con clave): une los códigos de MobilVendor y de Módulo B que son el mismo producto.
   - Sugerencias automáticas por mismo código, código sin «-1», mismo nombre o nombre parecido. Las de mismo código se unen con un botón.
   - Unión a mano para lo que falte. Si los nombres no comparten ninguna palabra, pide confirmación.
   - Comparación de stock, ventas, precio, costo y margen entre módulos, y aviso de marcas con nombre distinto en cada sistema.
   - Las equivalencias se descargan y se cargan en Excel (`equivalencias_productos.xlsx`) y viajan dentro de `dataset.json` y de las copias con fecha.
6. **Líneas y fotos**: números de cada línea (marca) junto a sus fotos.

El tablero no hace sugeridos de compra ni de reposición: muestra cobertura, colocación y vencimientos.

Archivos admitidos: `.xlsx`, `.xls`, `.xlsm` o `.csv`, hasta 60 MB. El lector reconoce estos formatos aunque los nombres de columna varíen un poco:

- El ReporteGeneral de ventas de MobilVendor.
- El reporte de ventas de Módulo B.
- La dinámica.
- Los dos reportes de rentabilidad.
- El inventario y la plantilla de productos.

Si un archivo directo se suelta en la casilla del otro módulo, el tablero lo reconoce por su formato y lo acomoda.

Para activar las alertas de vencimiento, usa **Descargar plantilla con vencimiento**. Descarga el inventario cargado con las columnas `Vencimiento` y `Lote`; complétalas y vuelve a cargar el archivo.

## Cómo calcula

- **Venta bajo costo**: precio neto por unidad (total en US$ dividido entre cantidad, ya con descuentos) menor que el costo unitario en US$ del sistema.
- **Obsequio**: precio cero o descuento del 100 % en un producto con costo.
- **Cobertura**: stock dividido entre la venta diaria promedio. La venta diaria son las unidades netas del período entre los días con despacho.
- **Estados de rotación**:
  - Riesgo de quiebre: menos de 7 días.
  - Rotación baja: más de 45 días.
  - Sin movimiento: hay stock y no hubo ventas.
  - Agotado con demanda: no hay stock y hubo ventas.
  - Los umbrales se ajustan en pantalla.
- **Clase ABC**: A son los productos que suman el 80 % de la venta, B el siguiente 15 % y C el resto.
- **Línea**: es la marca, la «Unidad de Negocio» del inventario, de Módulo B y de la dinámica, y la «DescrMarca» del ReporteGeneral de MobilVendor. MobilVendor llama «NIM» a Nestlé; el tablero lo lee como NESTLE, igual que la dinámica.
- **Similares**: productos de la misma sublínea (tipo de producto). Si hay menos de 3 con venta, se usa la categoría. Se compara contra la mediana del margen.
- **Productos unificados**:
  - El inventario suma el stock de las dos fichas y la rotación usa las ventas de ambos módulos.
  - El costo es el promedio ponderado por stock.
  - Si el inventario ya lo tiene como «Ambos Modulos», se usa esa ficha única sin contarla dos veces.
- **Precio de referencia en alertas**: el precio que igualaría la mediana de los similares, calculado como costo unitario dividido entre (1 menos el margen mediano).
- **Retorno del inventario**: margen del período dividido entre el inventario a costo.
- **Vencimientos**: unidades que se alcanzan a vender antes de la fecha, igual a venta diaria por días que faltan por la proporción de días con despacho. Lo demás es excedente en riesgo.
- **Devueltos por caducidad**: las notas de crédito de MobilVendor con razón «CADUCA».
  - Se cuentan solo las de producto. Las notas de descuento por pronto pago o diferencia de precio son ajustes comerciales.
  - Se cruzan con la rotación actual de cada producto.
  - Generan una alerta de rentabilidad cuando el monto devuelto supera la cuarta parte del umbral de capital inmovilizado: US$ 50 con el umbral inicial de US$ 200.
  - La alerta es alta si lo devuelto llega al 10 % de lo vendido en el período.

## Qué protege y qué no

Protege:

- Datos en memoria, nada en el navegador salvo el contador de intentos fallidos.
- RIF, cédulas y direcciones descartados al leer los archivos.
- Fotos sin metadatos.
- `dataset.json` y las copias con fecha van cifrados: publicar pide token y clave, y abrir lo publicado pide la clave.
- Bloqueo por intentos fallidos e inactividad.
- Política de seguridad de contenido: solo código propio, el lector de Excel y la conexión con GitHub.
- Texto de los archivos siempre escapado.
- No arranca dentro de otro sitio ni en dominios no autorizados.

No protege:

- En un sitio estático el código siempre se puede ver y copiar.
- La clave es un candado de acceso, no una bóveda. Alguien con conocimientos técnicos puede saltarse la pantalla de clave en una copia del código. Por eso los datos sensibles viajan cifrados y el token nunca se publica.
- El candado de dominio disuade copias casuales, no a quien edite el código.
- La protección de fondo es legal: la licencia y la Ley Especial contra los Delitos Informáticos.

## Pendientes

- Completar en `privacidad.html` el correo de contacto y el plazo de conservación de respaldos, y hacer revisar la política por el asesor legal.
- Cuando salga una versión nueva de SheetJS, actualizar las direcciones en `lectorExcel` de `config.js` (siempre con versión exacta).
