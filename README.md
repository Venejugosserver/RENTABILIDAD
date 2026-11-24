# Tablero comercial VENEJUGOS 2015

Uso interno de DISTRIBUIDORA VENEJUGOS 2015, C.A. El tablero lee en el navegador el inventario, los reportes de rentabilidad y las ventas (MobilVendor, Módulo B o la dinámica agrupada). Con eso valida precios contra costo, mide la rotación, sugiere dónde colocar cada producto y genera alertas de rentabilidad comparando cada producto con sus similares.

Ningún archivo de la empresa se sube a un servidor. Todo se procesa en la pestaña del navegador y se olvida al cerrarla.

## Archivos

| Archivo | Para qué sirve |
| --- | --- |
| `index.html` | Página del tablero |
| `privacidad.html` | Política de privacidad |
| `css/styles.css` | Identidad visual y adaptación a teléfono, tableta y escritorio |
| `js/config.js` | Empresa, huella de la clave, dominios permitidos y umbrales |
| `js/lectores.js` | Reconoce y lee cada tipo de Excel; descarta RIF, cédulas y direcciones |
| `js/lector-worker.js` | Lee los Excel grandes en un hilo aparte para no congelar la pantalla |
| `js/carga.js` | Coordina la lectura y el respaldo de lectura sin hilo aparte |
| `js/analisis.js` | Cruza ventas, inventario y rentabilidad |
| `js/vistas.js` | Dibuja cada pestaña |
| `js/app.js` | Estado en memoria, eventos, fotos, respaldos y plantilla |
| `js/seguridad.js` | Clave, bloqueo, cifrado de respaldos, candado de dominio |
| `js/github.js` | Respaldos cifrados en GitHub con archivo de token |
| `js/fotos.js` | Reduce las fotos y les quita ubicación y datos de cámara |
| `js/util.js` | Formato de cifras y fechas |
| `assets/logo.svg` | Logo **provisional**: reemplázalo por el logo oficial en blanco con el mismo nombre |
| `github-token.ejemplo.json` | Modelo del archivo de token (el real nunca se sube) |
| `LICENSE` | Licencia de uso interno |
| `VERIFICACION.md` | Pruebas hechas antes de la entrega |

## Publicar en GitHub Pages

1. Crea un repositorio para el sitio y sube estos archivos tal cual, con `index.html` en la raíz.
2. En el repositorio: **Settings > Pages > Build and deployment > Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. Edita `js/config.js` y en `dominiosPermitidos` cambia `'*.github.io'` por tu dominio exacto, por ejemplo `'venejugos.github.io'`. Así una copia publicada en otro sitio no arranca.
4. Abre `https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/`.

Sobre la privacidad del repositorio: con el plan gratuito de GitHub, Pages solo publica desde repositorios públicos, así que el código queda visible. Los datos no, porque nunca se suben. Con GitHub Pro o Team el repositorio del sitio puede ser privado, aunque la página publicada sigue siendo accesible para quien tenga la dirección.

## Clave de acceso

- En `js/config.js` solo está la **huella** de la clave (PBKDF2-SHA-256 con 310.000 iteraciones), nunca la clave.
- La clave actual se definió fuera de este repositorio. Conviene cambiarla por una más difícil de adivinar:
  1. En el tablero: **Carga de datos > Sesión y seguridad > Preparar una clave nueva**.
  2. Copia el bloque que aparece y reemplaza el bloque `clave` de `js/config.js`.
  3. Publica el cambio.
- Para proteger también Ventas o Inventario, en `js/config.js`: `modulosProtegidos: ['rentabilidad', 'ventas', 'inventario']`.
- Después de 5 intentos fallidos el acceso se pausa 5 minutos. Sin uso durante 15 minutos, se vuelve a bloquear. Estos valores están en `bloqueo`.

## Respaldos cifrados en GitHub (token + clave)

Guardar o abrir un respaldo pide dos llaves: el archivo de token y la clave de acceso.

1. Crea un **segundo repositorio privado** solo para datos, por ejemplo `tablero-datos`. No uses el repositorio del sitio.
2. Crea un token de acceso de grano fino en GitHub: **Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token**.
   - Repository access: *Only select repositories* > `tablero-datos`.
   - Permissions > Repository permissions > **Contents: Read and write**. Nada más.
   - Expiration: 90 días o menos.
3. Copia `github-token.ejemplo.json` a un archivo en tu equipo (por ejemplo `github-token.json`), pega el token y completa `owner` (usuario u organización) y `repo`.
4. En el tablero: **Respaldo cifrado en GitHub > Elegir archivo de token**. Luego **Guardar respaldo** o **Abrir respaldo**.

Qué se sube: un archivo `.vjenc` cifrado con AES-256-GCM. La llave sale de la clave, y cada respaldo lleva su propia sal y vector aleatorios. Sin la clave, el archivo no se puede leer. Si cambias la clave, los respaldos anteriores piden la clave anterior al abrirlos.

El token nunca se guarda en el navegador ni en el código, y `.gitignore` impide subirlo por error. Si se pierde, revócalo en GitHub y crea otro.

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
   - Margen por línea y capital inmovilizado.
   - Detalle por producto.
5. **Líneas y fotos**: números de cada línea junto a sus fotos.

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
- **Similares**: productos de la misma sublínea. Si hay menos de 3 con venta, se usa la línea. Se compara contra la mediana del margen.
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
- Respaldos cifrados que piden token y clave.
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

- Reemplazar `assets/logo.svg` por el logo oficial.
- Completar en `privacidad.html` el correo de contacto y el plazo de conservación de respaldos, y hacer revisar la política por el asesor legal.
- Cuando salga una versión nueva de SheetJS, actualizar las direcciones en `lectorExcel` de `js/config.js` (siempre con versión exacta).
