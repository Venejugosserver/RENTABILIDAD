# Tablero comercial VENEJUGOS 2015

Uso interno de DISTRIBUIDORA VENEJUGOS 2015, C.A. El tablero lee en el navegador el inventario, los reportes de rentabilidad y las ventas (MobilVendor, Módulo B o la dinámica agrupada). Con eso valida precios contra costo, mide la rotación, sugiere dónde colocar cada producto y genera alertas de rentabilidad comparando cada producto con sus similares.

Ningún archivo de la empresa se sube a un servidor. Todo se procesa en la pestaña del navegador y se olvida al cerrarla.

## Archivos

Todos los archivos van sueltos en la raíz, sin carpetas.

| Archivo | Para qué sirve |
| --- | --- |
| `index.html` | Página del tablero |
| `privacidad.html` | Política de privacidad |
| `styles.css` | Identidad visual y adaptación a teléfono, tableta y escritorio |
| `config.js` | Empresa, huella de la clave, dominios permitidos y umbrales |
| `lectores.js` | Reconoce y lee cada tipo de Excel; descarta RIF, cédulas y direcciones |
| `lector-worker.js` | Lee los Excel grandes en un hilo aparte para no congelar la pantalla |
| `carga.js` | Coordina la lectura y el respaldo de lectura sin hilo aparte |
| `analisis.js` | Cruza ventas, inventario y rentabilidad |
| `vistas.js` | Dibuja cada pestaña |
| `app.js` | Estado en memoria, eventos, fotos, respaldos y plantilla |
| `seguridad.js` | Clave, bloqueo, cifrado de respaldos, candado de dominio |
| `github.js` | Respaldos cifrados en GitHub con archivo de token |
| `fotos.js` | Reduce las fotos y les quita ubicación y datos de cámara |
| `util.js` | Formato de cifras y fechas |
| `logo.svg` | Logo **provisional**: reemplázalo por el logo oficial en blanco con el mismo nombre |
| `favicon.svg` | Ícono de la pestaña del navegador |
| `github-token.ejemplo.json` | Modelo del archivo de token (el real nunca se sube) |
| `.gitignore` | Impide subir por error el token, los respaldos y los Excel de la empresa |
| `LICENSE` | Licencia de uso interno |
| `VERIFICACION.md` | Pruebas hechas antes de cada entrega |

## Publicar en GitHub Pages

1. Crea un repositorio para el sitio y sube todos los archivos tal cual. Van sueltos, sin carpetas, con `index.html` en la raíz.
2. En el repositorio: **Settings > Pages > Build and deployment > Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. Edita `config.js` y en `dominiosPermitidos` cambia `'*.github.io'` por tu dominio exacto, por ejemplo `'venejugos.github.io'`. Así una copia publicada en otro sitio no arranca.
4. Abre `https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/`.

Sobre la privacidad del repositorio: con el plan gratuito de GitHub, Pages solo publica desde repositorios públicos, así que el código queda visible. Los datos no, porque nunca se suben. Con GitHub Pro o Team el repositorio del sitio puede ser privado, aunque la página publicada sigue siendo accesible para quien tenga la dirección.

## Clave de acceso

- En `config.js` solo está la **huella** de la clave (PBKDF2-SHA-256 con 310.000 iteraciones), nunca la clave.
- La clave actual se definió fuera de este repositorio. Conviene cambiarla por una más difícil de adivinar:
  1. En el tablero: **Carga de datos > Sesión y seguridad > Preparar una clave nueva**.
  2. Copia el bloque que aparece y reemplaza el bloque `clave` de `config.js`.
  3. Publica el cambio.
- Para proteger también Ventas o Inventario, en `config.js`: `modulosProtegidos: ['rentabilidad', 'ventas', 'inventario']`.
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
     - *Archivos directos*: MobilVendor (el reporte general de ventas, tal como sale) y Módulo B.
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

Archivos admitidos: `.xlsx`, `.xls`, `.xlsm` o `.csv`, hasta 60 MB. Los nombres de columna pueden variar un poco: el lector reconoce los de MobilVendor, Módulo B, la dinámica y la plantilla de productos.

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
- **Enlace con el inventario**: por código. Si el código coincide pero los nombres no comparten ninguna palabra (por ejemplo, un código que en el otro módulo es otro producto), no se enlaza y se busca por el nombre exacto. Los códigos con `-1` se siguen enlazando con su código base.

## Ventas directas de MobilVendor

Se carga el **reporte general de ventas** de MobilVendor tal como sale del sistema (hoja «Ventas»). El tablero lo reconoce por sus columnas y siempre lo toma como ventas de MobilVendor: si se suelta en la casilla de Módulo B, se acomoda solo. En la modalidad agrupada también se lee, con un aviso de que solo trae MobilVendor.

- **Producto**: `CodProducto` y `DescrProducto`. El código se toma tal cual, así que `000855` y `855` son productos distintos.
- **Cantidad**: `CantidadEnUnidadInventario`, que es la cantidad vendida por el factor de la unidad de venta (un display de 18 cuenta 18). Se usa esa porque `Costo` viene por unidad de inventario. Si el reporte no la trae, se calcula con `Cantidad` por `UnidadFactor`; si tampoco trae el factor, la casilla lo avisa.
- **Cajas de cigarrillos**: los códigos sin `-1` (P20, B20, UNI20...) son cajas y se enlazan con la cajetilla del inventario, donde cada caja se cuenta como una cajetilla. Está en pendientes.
- **Venta**: `PrecioTotal`, ya con descuentos y sin IVA. `Total con IVA` no se usa.
- **Descuento**: `Descuento, %`. La columna `Descuento` es el monto.
- **Fecha**: `FechaFactura`. Los pedidos se despachan por lo general al día siguiente y la cantidad de días queda igual; `FechaDespacho` sumaría días sueltos, como los lunes que solo tienen notas de crédito.
- **Cliente, vendedor y ruta**: `CódigoCliente`, `RazónSocial`, `NombreVend` y `Ruta de Documento`. Las líneas sin ruta quedan como «Sin ruta».
- **Segmento**: `NombSubCanal` (abasto o bodega, kiosco, panadería...).
- **Línea, sublínea, marca y unidad de negocio**: `DescrCategoría`, `DescrSubCategoría`, `DescrMarca` y `DescrTipoInv`. Si el producto está en el inventario, manda la línea del inventario.
- **Notas de crédito**: traen cantidad y monto negativos y cuentan como devoluciones. Los renglones «DESCUENTO POR PRONTO PAGO» y «DIFERENCIA DE PRECIOS» van como ajustes.
- **Lo que se descarta**: RUC, cédulas, teléfonos y direcciones del cliente, del vendedor y del supervisor, y los comentarios.

Para MobilVendor es más exacta la modalidad de archivos directos. La dinámica cuenta en display o bulto los productos que se venden así, pero con costo por unidad: a esos productos les baja el costo, les sube la cobertura y no deja ver si se vendieron bajo costo. Con los archivos reales del 02/11 al 20/11, el margen de MobilVendor da 13,1 % con el archivo directo, 29,7 % con la dinámica y 12,9 % en el reporte de rentabilidad.

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

- Decidir cómo contar las cajas de cigarrillos de MobilVendor. Hoy cada caja vendida suma como una cajetilla del inventario; por los costos, cada caja trae 10 cajetillas. En el archivo del 02/11 al 23/11 fueron 151 cajas, US$ 3.034,83.
- Volver a revisar el cuadre de MobilVendor exportando el reporte general de ventas y el de rentabilidad a la misma hora. Con los archivos del 23/11 la rentabilidad trae 2.977 unidades más (US$ 2.773,34), al mismo precio y en 51 productos; lo más probable es que sean facturas hechas después de exportar el reporte general.
- Revisar en el inventario los costos guardados con IVA y los costos por display con precio por unidad (VERIFICACION.md, sección 9).
- Reemplazar `logo.svg` por el logo oficial.
- Completar en `privacidad.html` el correo de contacto y el plazo de conservación de respaldos, y hacer revisar la política por el asesor legal.
- Cuando salga una versión nueva de SheetJS, actualizar las direcciones en `lectorExcel` de `config.js` (siempre con versión exacta).
