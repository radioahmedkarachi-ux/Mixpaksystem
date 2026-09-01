# Mantenimiento Industrial — Guía de instalación y APK

Esta app tiene: login por técnico, tablero de tareas en tiempo real, y fotos de
máquinas/averías guardadas en la nube. Está lista para convertirse en un APK
instalable en Android.

---

## 🔵 MÉTODO SIN ORDENADOR — compilar el APK desde el móvil con GitHub Actions

Este proyecto incluye un archivo `.github/workflows/build-apk.yml` que hace que
**GitHub compile el APK por ti en la nube**. Tú solo subes el código desde el
teléfono y descargas el `.apk` ya terminado. No necesitas Android Studio.

### Paso 1 — Completa primero la Parte 1 de abajo (Firebase)
Eso sí es necesario y se hace igual desde el navegador del móvil
(console.firebase.google.com funciona bien en Chrome de Android).
Recuerda pegar tu `firebaseConfig` en `src/firebase.js` **antes** de subir el
código a GitHub.

### Paso 2 — Crea una cuenta y un repositorio en GitHub
1. Ve a https://github.com desde el navegador del móvil y crea una cuenta (gratis).
2. Pulsa **+** → **New repository**. Nómbralo, por ejemplo, `mantenimiento-industrial`.
   Puede ser privado.

### Paso 3 — Sube el proyecto
La forma más fiable desde el móvil:
1. En tu teléfono, descomprime el `app-mantenimiento.zip` con la app de Archivos.
2. En tu navegador (activa "Sitio de escritorio" en el menú del navegador para
   que se vea la página completa), entra a tu repositorio → **Add file → Upload files**.
3. Selecciona **todos los archivos y carpetas** descomprimidos (tu explorador de
   archivos debería permitir elegir la carpeta completa). Confirma y haz commit.

   Si tu navegador no te deja subir carpetas enteras y solo archivos sueltos,
   usa la alternativa: entra a **Add file → Create new file** y en el nombre
   escribe la ruta completa (ej. `src/App.jsx`), pega el contenido de ese
   archivo, y repite para cada uno. Son 10 archivos en total — tedioso pero
   garantizado que funciona.

### Paso 4 — Deja que GitHub compile
En cuanto subas los archivos (incluido `.github/workflows/build-apk.yml`),
GitHub arrancará la compilación solo. Para verlo:
1. Entra a la pestaña **Actions** de tu repositorio.
2. Verás "Compilar APK" ejecutándose (tarda 3-5 minutos).
3. Cuando termine (✅ verde), entra a esa ejecución y baja hasta **Artifacts**.
4. Descarga `app-mantenimiento-apk` — es un `.zip` que contiene el `.apk`.

### Paso 5 — Instalar en el móvil
1. Descomprime ese zip para sacar el `.apk`.
2. Ajustes → Seguridad → permite instalar apps de origen desconocido.
3. Abre el `.apk` descargado y pulsa Instalar.
4. Repite la descarga en los móviles de los otros técnicos (o compárteles el `.apk` por WhatsApp/Drive).

> Nota: este método genera un APK de tipo "debug", perfecto para instalar
> directamente en los 15 móviles sin pasar por Google Play. Si más adelante
> quieres publicarlo en Play Store, ese paso sí requiere una firma de
> "release" — se puede automatizar también, pero es un paso extra.

---

## Parte 1 — Crear el backend en Firebase (gratis, ~15 min)

1. Ve a https://console.firebase.google.com y crea un proyecto nuevo (ej. "mantenimiento-planta").
2. **Authentication**: en el menú lateral, entra a *Authentication* → pestaña *Sign-in method* →
   activa **Correo electrónico/contraseña**.
3. Crea a tus 15 técnicos: *Authentication* → *Users* → *Add user*, uno por uno
   (correo + contraseña temporal que ellos podrán cambiar luego).
4. **Firestore**: menú lateral → *Firestore Database* → *Crear base de datos* →
   modo producción → elige la región más cercana a tu planta.
5. **Storage**: menú lateral → *Storage* → *Comenzar* → acepta las reglas por defecto
   (las sustituiremos por las tuyas en el paso 7).
6. Ve a *Configuración del proyecto* (el engranaje) → baja a "Tus apps" → pulsa
   el icono `</>` (Web) → dale un nombre → copia el objeto `firebaseConfig` que
   te muestra.
7. Pega ese objeto en `src/firebase.js`, reemplazando los valores de ejemplo.
8. Sube las reglas de seguridad incluidas en este proyecto:
   - En *Firestore Database* → pestaña *Reglas*, pega el contenido de `firestore.rules`.
   - En *Storage* → pestaña *Reglas*, pega el contenido de `storage.rules`.
   - Publica ambas.

Con esto, solo tus técnicos logueados pueden leer y escribir tareas y fotos.

---

## Parte 2 — Probar la app en el navegador

Necesitas [Node.js](https://nodejs.org) instalado (versión 18 o superior).

```bash
cd app-mantenimiento
npm install
npm run dev
```

Abre la URL que te muestra (normalmente `http://localhost:5173`) y prueba
iniciar sesión con uno de los usuarios que creaste.

---

## Parte 3 — Generar el APK con Capacitor

1. Instala Android Studio: https://developer.android.com/studio (necesario para compilar).
2. Genera la versión de producción de la app:
   ```bash
   npm run build
   ```
3. Inicializa Capacitor (solo la primera vez):
   ```bash
   npx cap init "Mantenimiento Industrial" "com.tuempresa.mantenimiento" --web-dir=dist
   ```
4. Añade la plataforma Android:
   ```bash
   npm run cap:add
   ```
5. Sincroniza el build web con el proyecto Android (repite esto cada vez que cambies código):
   ```bash
   npm run cap:sync
   ```
6. Abre el proyecto en Android Studio:
   ```bash
   npm run cap:open
   ```
7. En Android Studio: menú **Build → Generate Signed Bundle / APK** → elige **APK** →
   crea una "keystore" nueva (guárdala bien, la necesitarás para futuras actualizaciones) →
   completa el asistente → Android Studio te dejará el archivo `.apk` en
   `android/app/release/`.

---

## Parte 4 — Instalar en los móviles de los técnicos

- Copia el `.apk` a cada teléfono (por USB, Drive, WhatsApp, etc.).
- En el móvil: *Ajustes → Seguridad → Permitir instalar apps de origen desconocido*
  (el texto exacto varía según el fabricante).
- Abre el archivo `.apk` descargado y pulsa **Instalar**.

Si más adelante quieres evitar este paso manual y que las actualizaciones
lleguen solas, puedes subir la app a Google Play como **app privada/interna**
de tu organización (requiere cuenta de desarrollador de Google, pago único).

---

## Permisos de cámara en Android

Capacitor necesita permiso de cámara para que el botón de subir fotos funcione
bien en el móvil. Después de `npx cap add android`, abre
`android/app/src/main/AndroidManifest.xml` y confirma que incluya:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

Si no aparecen, añádelos justo antes de `<application ...>`.

---

## Resumen de qué guarda cada cosa

| Dato | Dónde vive |
|---|---|
| Login de los 15 técnicos | Firebase Authentication |
| Tareas (máquina, prioridad, estado, técnico, fecha) | Firestore, en tiempo real |
| Fotos de máquinas/averías | Firebase Storage (comprimidas antes de subir) |

Todo el plan gratuito de Firebase ("Spark") cubre perfectamente 15 usuarios y
un volumen normal de tareas y fotos.

---

## Novedades: Materiales, Producción y Calidad

La app ahora tiene 4 pestañas: **Mantenimiento**, **Materiales**, **Producción** y **Calidad**.

- **Materiales**: inventario de repuestos/consumibles con stock actual, stock mínimo, ubicación en almacén y botones rápidos +/- para ajustar stock. Se marca en rojo lo que está bajo mínimo.
- **Producción**: órdenes de producción por línea y turno, con objetivo, producido, rechazo, barra de avance y una tarjeta de eficiencia del día.
- **Calidad**: incidencias/no conformidades con tipo, severidad, referencia (lote, línea, orden), fotos y acción correctiva.

**Importante:** como se añadieron 3 colecciones nuevas en Firestore (`materials`, `production_orders`, `quality_issues`) y una ruta nueva en Storage (`quality/`), debes volver a publicar las reglas:

1. *Firestore Database* → pestaña *Reglas* → pega el contenido actualizado de `firestore.rules` → Publicar.
2. *Storage* → pestaña *Reglas* → pega el contenido actualizado de `storage.rules` → Publicar.

No hace falta crear nada más a mano: las colecciones se crean solas la primera vez que guardas un material, una orden de producción o una incidencia.

---

## ⚠️ Modo prueba (sin usuarios todavía)

Mientras terminas de configurar Firebase, la app está en **modo prueba**:
se salta el login y las reglas de Firestore/Storage están abiertas (cualquiera
con el enlace podría leer/escribir datos). Esto es solo para que puedas probar
la app sin crear usuarios aún.

**Necesitas igualmente:**
- Un proyecto de Firebase creado, con Firestore Database y Storage activados.
- Pegar tu `firebaseConfig` en `src/firebase.js`.
- Subir las reglas de `firestore.rules` y `storage.rules` (las que están en modo prueba).

**Antes de dar la app a tus técnicos con datos reales:**
1. Crea sus cuentas en *Authentication → Users*.
2. En `src/App.jsx`, cambia `const DEV_MODE = true;` por `const DEV_MODE = false;`.
3. En `firestore.rules` y `storage.rules`, cambia cada `allow read, write: if true;`
   por `allow read, write: if request.auth != null;` y vuelve a publicar ambas.
4. Vuelve a subir el código a GitHub para que se genere un nuevo APK.

---

## Trazabilidad, cliente y resumen (Mixpak System)

- **Materiales**: ahora tiene lote y fecha de caducidad, con aviso si está caducado o caduca en menos de 30 días. Nueva categoría "Formato de envase" (film/sachet/stick/doypack).
- **Producción**: cada orden tiene Cliente y Lote, además de línea/turno.
- **Calidad**: cada incidencia se puede vincular a Cliente y Lote, para relacionarla directamente con una orden de producción.
- **Resumen** (nueva primera pestaña): un vistazo rápido a los 4 módulos — pendientes/críticas de mantenimiento, materiales bajo mínimo o caducando, producción y eficiencia de hoy, e incidencias de calidad abiertas. Toca el título de cada bloque para ir directo a ese módulo.
- La marca de la app ahora dice "Mixpak System" en el login y en la cabecera.

---

## Categorías / roles por persona

La primera vez que alguien entra, la app le pide elegir su categoría:
**Mecánico** (solo ve Mantenimiento), **Calidad** (solo Calidad), **Producción**
(solo Producción), **Almacén** (solo Materiales) o **Supervisor** (ve todo).
Esa elección se guarda en Firestore (colección `team`) y a partir de ahí solo
ve las pestañas que le tocan, tanto en el menú como en el Resumen.

Puede cambiar su categoría en cualquier momento con el botón "Cambiar categoría"
de la cabecera (por ejemplo, si un mecánico también hace de supervisor).

**Nota:** en modo prueba, como todos entráis como el mismo usuario "de prueba",
compartiréis una sola categoría. Cuando actives usuarios reales (`DEV_MODE = false`
y cuentas en Authentication), cada persona tendrá su propia categoría porque
cada una tiene su propio inicio de sesión.

## Basado en mixpaksystem.com

Se añadieron dos tipos de incidencia de Calidad que corresponden a servicios que
ofrecéis: **Control de estabilidad / envejecimiento** y **Compatibilidad de
materiales**. Si tenéis más actividades que no estén reflejadas en la app
(formulación, I+D+I…), decidme y seguimos ampliando.

---

## Si las fotos se quedan en "Guardando…" sin terminar

Ahora, si subir una foto tarda más de 20 segundos o falla, verás un mensaje de
error claro (la orden/incidencia sí se guarda, solo falla la foto). Si ves ese
mensaje, revisa esto en Firebase:

1. **Storage → ¿está activado?** Si nunca pulsaste "Comenzar" en la sección
   Storage del panel de Firebase, actívalo ahora.
2. **Storage → Reglas** → confirma que pegaste el contenido de `storage.rules`
   de este proyecto y le diste a Publicar.
3. En `src/firebase.js`, revisa que `storageBucket` no esté vacío ni sea el
   de ejemplo.

Sin estos tres pasos, las fotos nunca podrán subirse aunque el resto de la
app (tareas, materiales, etc.) funcione perfectamente, porque esos datos
viven en Firestore, no en Storage.

---

## Fotos ahora van a Cloudinary, no a Firebase Storage

Desde julio de 2026, Firebase exige el plan de pago "Blaze" (con tarjeta,
aunque no cobre nada) para usar Storage. Para no pedirte tarjeta, las fotos
ahora se suben a **Cloudinary** (gratis, sin tarjeta, 25 GB al mes).

**Configuración (una sola vez):**
1. Crea una cuenta gratis en https://cloudinary.com/users/register/free
2. En el Dashboard, copia tu **Cloud name** (arriba del todo).
3. Ve a **Settings** (engranaje, arriba a la derecha) → pestaña **Upload** →
   busca "Upload presets" → **Add upload preset**.
4. En "Signing Mode" elige **Unsigned** (importante, si no, no funcionará).
   Guarda y copia el nombre del preset que le pusiste.
5. Abre `src/cloudinary.js` y pega ambos valores:
   ```
   const CLOUDINARY_CLOUD_NAME = "tu-cloud-name";
   const CLOUDINARY_UPLOAD_PRESET = "tu-preset";
   ```
6. Sube el cambio a GitHub y genera el APK nuevo.

**Nota:** ya no hace falta activar Firebase Storage ni publicar `storage.rules`
— ese archivo se eliminó del proyecto. Si borras una tarea o incidencia con
fotos, la foto queda guardada en Cloudinary (no se borra automáticamente,
por eso no hace falta ninguna clave secreta ni backend).

---

## Registro dentro de la app (ya no es modo prueba)

Ahora `DEV_MODE = false`: cada persona necesita su propia cuenta. La pantalla
de inicio tiene dos pestañas: **Entrar** y **Crear cuenta**. Cualquiera puede
crear su cuenta desde el móvil con nombre, correo y contraseña — no hace falta
que tú se las crees a mano en Firebase.

**Un paso más, obligatorio, para que el registro funcione:**
1. Firebase console → Authentication → pestaña **Sign-in method**
2. Activa **Correo electrónico/contraseña** si no lo has hecho ya

Sin ese paso, tanto "Entrar" como "Crear cuenta" fallarán.

También se cerraron las reglas de Firestore (`firestore.rules`): ya no
cualquiera puede leer/escribir, solo quien haya iniciado sesión. Tienes que
publicar este `firestore.rules` actualizado en Firestore Database → Reglas.

**Recuerda:** la primera vez que alguien entra (o se registra), la app le
pide elegir su categoría (mecánico, calidad, producción, almacén o
supervisor) — eso sigue funcionando igual.

---

## Aprobación manual de cuentas

Ahora nadie entra a la app hasta que un **administrador** lo apruebe. Al
registrarse (o elegir categoría), la cuenta queda pendiente y ve una pantalla
de espera. Un admin la aprueba (o le cambia la categoría) desde la nueva
pestaña **Aprobaciones**, que solo ve quien tenga el rol "Administrador".

**Paso obligatorio, una sola vez: aprobar tu propia cuenta admin**

El primer administrador no lo puede aprobar nadie desde la app (todavía no
hay ningún admin aprobado). Hazlo tú mismo, a mano, en Firebase:

1. Regístrate en la app normalmente y elige la categoría **"Administrador"**.
   Verás la pantalla de "pendiente de aprobación" — es normal.
2. Ve a Firebase console → **Firestore Database** → pestaña **Datos**.
3. Abre la colección **`team`** → busca el documento con tu correo.
4. Toca el campo **`aprobado`** → cámbialo de `false` a `true` → guarda.
5. Vuelve a abrir la app (o recarga) — ya deberías entrar y ver la pestaña
   "Aprobaciones" para aprobar a los demás desde ahí en adelante.

Publica también el `firestore.rules` actualizado (Firestore Database →
Reglas) — ahora incluye las reglas de aprobación y del rol admin.

## Ver fotos dentro de la app

Al tocar una foto en el detalle de una tarea o incidencia, ahora se abre un
visor a pantalla completa dentro de la propia app (con flechas para pasar
entre varias fotos), en vez de abrir el navegador.

---

## Aviso por Gmail cuando alguien se registra

Cada vez que alguien nuevo se registra y elige categoría, se dispara un aviso
por correo (a través de EmailJS, gratis, sin tarjeta) para que no tengas que
estar mirando la app.

**Configuración (una sola vez):**
1. Crea cuenta gratis en https://www.emailjs.com (puedes entrar con Google).
2. **Email Services** → Add New Service → **Gmail** → conecta tu cuenta →
   copia el **Service ID**.
3. **Email Templates** → Create New Template. En el cuerpo escribe algo así:
   ```
   Nuevo registro pendiente: {{new_user_email}} (categoría: {{new_user_role}})
   ```
   En el campo "To email" pon tu Gmail directamente → copia el **Template ID**.
4. Arriba a la derecha, tu cuenta → **General** → copia tu **Public Key**.
5. Abre `src/emailjs.js` y pega los 4 valores:
   ```
   const EMAILJS_SERVICE_ID = "tu-service-id";
   const EMAILJS_TEMPLATE_ID = "tu-template-id";
   const EMAILJS_PUBLIC_KEY = "tu-public-key";
   const ADMIN_NOTIFY_EMAIL = "tu-correo@gmail.com";
   ```
6. Sube el cambio a GitHub y genera el APK.

Mientras no rellenes esos datos, el registro sigue funcionando normal — solo
que no se envía ningún correo (no rompe nada si lo dejas para después).

---

## Búsqueda, fotos en cada categoría, exportar y compartir

- **Buscar**: Mantenimiento, Producción y Calidad ahora tienen una caja de búsqueda (Materiales ya la tenía). Busca por los campos relevantes de cada uno (máquina/tarea, producto/cliente/lote, título/cliente/lote/referencia).
- **Estado de la foto al subir**: mientras se sube, el botón de guardar muestra "Subiendo foto 1 de 2…" en vez de solo "Guardando…", para que sepas que está en proceso y no se ha quedado colgado.
- **Fotos en cada categoría**: ahora Materiales y Producción también permiten adjuntar fotos (antes solo Mantenimiento y Calidad podían). Se suben a Cloudinary igual que las demás.
- **Exportar**: cada módulo (Mantenimiento, Materiales, Producción, Calidad) tiene un botón "Exportar" que descarga un CSV con lo que se esté viendo en ese momento (respeta los filtros y la búsqueda activa). Se puede abrir con Excel, Google Sheets, etc.
- **Compartir**: en el detalle de una tarea o incidencia, y en cada tarjeta de material u orden de producción, hay un botón de compartir — usa el selector nativo de Android (WhatsApp, Gmail, etc.); si el dispositivo no lo soporta, copia el texto al portapapeles.

**Importar** no se ha añadido todavía (es más delicado: hay que validar cada fila antes de guardarla). Si lo necesitas, dímelo y lo hacemos como un paso aparte.

---

## Compartir de verdad (WhatsApp, Gmail, etc.)

El botón "Compartir" antes solo copiaba el texto porque el WebView de Android
no tiene el selector de compartir del navegador normal. Ahora usa el plugin
nativo de Capacitor (`@capacitor/share`), así que abre el selector real de
Android con WhatsApp, Gmail, Mensajes, etc.

No necesitas configurar nada — solo subir el `package.json` y `src/shared.jsx`
actualizados y generar el APK de nuevo (el workflow instala el plugin solo).

---

## Aviso de órdenes vencidas

Las órdenes de mantenimiento con fecha límite ya pasada (y que no estén
"Completadas") ahora se marcan en rojo con la etiqueta "Vencida", tanto en la
tarjeta como en las estadísticas de Mantenimiento y en el Resumen general.

---

## Logo real de Mixpak System

Se sustituyó el icono genérico por vuestro logo real (`src/assets/logo-mixpak.png`,
con el fondo blanco quitado para que se vea bien tanto en pantallas claras
como en la cabecera oscura). Aparece en el login, en la pantalla de elegir
categoría y en la cabecera principal.

---

## Eliminar cuentas desde Aprobaciones

Cada persona (pendiente o aprobada) tiene ahora un botón de papelera junto a
"Aprobar"/"Revocar" para eliminarla de la app. Un admin no puede eliminarse
a sí mismo (el botón sale desactivado en tu propia fila).

**Importante:** esto borra su registro dentro de la app (su categoría y
aprobación), pero **no borra su cuenta de correo** — Firebase no permite
borrar la cuenta de otra persona desde el propio móvil, solo desde el panel.
Si esa persona vuelve a entrar, tendrá que elegir categoría y esperar
aprobación de nuevo, como si fuera nueva. Si quieres bloquearla del todo para
que ni siquiera pueda volver a entrar, tienes que borrar su cuenta también en
Firebase → Authentication → Users.

---

## Historial de cambios

Nueva pestaña **Historial**, visible solo para Supervisor y Administrador.
Registra automáticamente quién hizo qué y cuándo en:

- Mantenimiento: crear orden, cambiar estado, eliminar.
- Materiales: crear, editar, ajustar stock (+/-), eliminar.
- Producción: crear orden, editar, cambiar estado, eliminar.
- Calidad: crear incidencia, cambiar estado, eliminar.
- Aprobaciones: aprobar, revocar, cambiar categoría de alguien, eliminar cuenta.

Se puede buscar y filtrar por módulo. Muestra las últimas 200 acciones,
la más reciente arriba. Las entradas del historial no se pueden editar ni
borrar (ni siquiera un admin), para que quede como un registro fiable.

**Importante:** además de subir el código, tienes que publicar el
`firestore.rules` actualizado (añade la colección `activity_log`).

---

## Filtrar por fechas y gráficas de tendencia

- **Filtrar por rango de fechas**: Mantenimiento, Producción, Calidad e Historial
  tienen ahora un par de campos "Desde"/"Hasta" junto a la búsqueda. Se puede
  dejar solo uno de los dos (por ejemplo, "desde hace una semana" sin fecha
  final). El botón "Limpiar" quita el filtro.
- **Gráficas de tendencia**: en el Resumen general, debajo de las tarjetas de
  Producción y Calidad, hay dos gráficas de los últimos 14 días — evolución
  de la eficiencia de producción, e incidencias de calidad creadas por día.

Estas gráficas usan la librería `recharts` (se instala sola al compilar, no
hace falta configurar nada).

---

## Kardex de materiales

Cada material tiene ahora dos botones nuevos:

- **Movimiento**: registra una entrada o salida controlada (cantidad, motivo,
  y opcionalmente un nuevo lote). Ya no hace falta usar solo los botones +/-1
  rápidos — para cantidades grandes o con motivo, usa este.
- **Kardex**: muestra el historial completo de movimientos de ese material
  (entradas y salidas, con fecha, cantidad, saldo resultante, lote, motivo y
  quién lo hizo), el más reciente arriba.

Los botones rápidos +/-1 se mantienen para ajustes al vuelo, y también quedan
registrados en el kardex (como "Ajuste rápido").

**Importante:** hay una colección nueva en Firestore (`material_movements`),
así que hay que publicar el `firestore.rules` actualizado.

---

## Múltiples lotes por material

Un mismo material ya puede tener **varios lotes activos a la vez**, cada uno
con su propia cantidad y fecha de caducidad.

- **Movimiento → Entrada**: ahora pide el código de lote y su caducidad. Si
  el lote ya existe (mismo código), suma la cantidad a ese lote; si no,
  crea uno nuevo.
- **Movimiento → Salida**: te hace elegir de qué lote sale, con una lista
  ordenada por caducidad (el que caduca antes aparece primero, sugerido por
  defecto — lógica FEFO). No deja sacar más de lo que tiene ese lote.
- **Botón "Lotes"** (nuevo, junto a Movimiento y Kardex): muestra todos los
  lotes activos del material con su cantidad y caducidad, resaltando en rojo
  los caducados y en ámbar los que caducan pronto.

Los botones rápidos +/-1 siguen existiendo para ajustes simples, pero no
distinguen lote (quedan registrados en el kardex sin lote específico) — para
manejar lotes usa siempre "Movimiento".

**Importante:** hay una colección nueva en Firestore (`material_lots`),
así que hay que publicar el `firestore.rules` actualizado.

---

## Arreglo: la caducidad ahora mira los lotes de verdad

Desde que se añadieron los lotes múltiples, la tarjeta de cada material y el
aviso de "Caducando" (en Materiales y en el Resumen general) miraban solo el
campo suelto antiguo, no los lotes reales creados con "Movimiento → Entrada".
Ya está corregido: ahora se calcula la caducidad más próxima entre todos los
lotes activos de cada material, tanto en la tarjeta como en las dos
estadísticas. El campo suelto antiguo solo se usa como reserva para
materiales que nunca han tenido un movimiento de entrada.

---

## Arreglo: ya no se puede cambiar el stock a mano al editar

Editar un material ya creado permitía cambiar el "Stock actual" directamente,
sin dejar ningún rastro en el kardex — un agujero por donde el stock podía
descuadrarse sin explicación. Ahora, al editar, ese campo se muestra solo
como información (no editable) y te indica que uses "Movimiento" para
cambiarlo. Al crear un material nuevo, sigues pudiendo poner su stock
inicial como antes.

---

## Arreglo: borrar un material ya no deja lotes huérfanos

Al eliminar un material, ahora también se borran sus lotes activos
(`material_lots`) — antes se quedaban en la base de datos sin ningún
material al que pertenecer. El kardex (`material_movements`) sí se conserva
a propósito, como historial permanente de lo que pasó con ese material.

---

## Dos arreglos más

- **"Cambiar categoría" ya no se queda colgado**: si alguien que no es admin
  elige "Administrador" por error, ahora sale un mensaje claro explicando que
  tiene que pedírselo a un admin, en vez de quedarse en "Guardando…" para
  siempre.
- **Los botones rápidos +/-1 de Materiales ahora también respetan los
  lotes**: antes cambiaban el stock total sin tocar ningún lote concreto, así
  que el total y la suma de los lotes se podían descuadrar. Ahora usan la
  misma lógica que "Movimiento" — la salida rápida descuenta automáticamente
  del lote que caduca antes (FEFO), igual que si lo eligieras a mano.

---

## Ahora sí se puede editar (Mantenimiento y Calidad)

Antes, una vez creada una orden de mantenimiento o una incidencia de calidad,
no había forma de corregir un dato ni añadir la acción correctiva después —
solo se podía cambiar el estado. Ahora ambas tienen un botón **"Editar"**
dentro de su pantalla de detalle (junto a "Compartir"), que abre el mismo
formulario de creación pero precargado, y guarda los cambios en vez de crear
una nueva. Las fotos que ya tenía se conservan y se pueden añadir más.

(Producción y Materiales ya podían editarse tocando la tarjeta — no tenían
este problema.)

---

## Dos arreglos más encontrados

- **El nombre del registro ahora se usa de verdad**: al crear la cuenta se
  pedía el nombre pero nunca se mostraba en ningún sitio (solo el correo).
  Ahora aparece en la cabecera, en "Cuenta pendiente" y en Aprobaciones. Las
  cuentas creadas antes de este cambio seguirán mostrando solo el correo
  hasta que usen "Cambiar categoría" una vez (eso guarda el nombre).
- **La pestaña activa ya no queda "huérfana"** si un admin te cambia de
  categoría mientras estás usando la app — se ajusta sola a una pestaña que
  sí tengas permitida.

---

## Un riesgo más evitado

En Aprobaciones, el desplegable para cambiar la categoría de alguien ahora
está bloqueado en tu propia fila (igual que ya lo estaba el botón de
aprobar/revocar) — para que un admin no se cambie sin querer su propio rol
y se quede fuera de Aprobaciones. Si de verdad quieres cambiar tu categoría,
usa el botón "Cambiar categoría" de la cabecera.

---

## Icono real de la app (ya no el genérico de Capacitor)

Hasta ahora, aunque la app ya tenía el logo de Mixpak System por dentro, el
**icono en la pantalla de inicio del móvil** seguía siendo el robot verde
genérico de Capacitor, y el nombre debajo del icono decía "Mantenimiento
Industrial". Ya está arreglado:

- `capacitor.config.json` → nombre de la app cambiado a "Mixpak System".
- Carpeta nueva `resources/` con el icono (fondo naranja + el símbolo de la
  mano de vuestro logo) y una imagen de carga a juego.
- El workflow de GitHub Actions ahora genera automáticamente todos los
  tamaños de icono para Android en cada compilación (`@capacitor/assets`) —
  no tienes que hacer nada manual, solo subir estos archivos y compilar.

Al instalar el próximo APK, verás el icono nuevo. Puede que tengas que
**desinstalar la app vieja primero** para que Android no se quede con el
icono en caché.

---

## Arreglo: el Resumen ya no se cuelga en silencio

Si alguna de las colecciones que usa el Resumen falla al cargar (típicamente
porque falta publicar el `firestore.rules` más reciente), antes se quedaba
en "Cargando resumen…" para siempre sin explicar nada. Ahora, si tarda más
de 10 segundos o hay un error real, muestra un mensaje claro diciendo qué
falló.

**Si te sale ese aviso ahora mismo**: ve a Firestore Database → Reglas →
confirma que tienes publicado el `firestore.rules` de este mismo zip (incluye
las colecciones `material_lots`, `material_movements` y `activity_log`).

---

## El mismo arreglo aplicado a toda la app

Después de encontrar el problema del Resumen colgado en silencio, revisé
todos los demás módulos y tenían el mismo fallo de fondo: si Firestore
rechaza una carga (normalmente por reglas sin publicar), la pantalla se
quedaba en "Cargando…" para siempre sin decir por qué. Ahora **todas** las
pantallas (Mantenimiento, Materiales —incluyendo Movimiento/Kardex/Lotes—,
Producción, Calidad, Historial y Aprobaciones) muestran el motivo exacto del
fallo en vez de quedarse calladas.

---

## Aviso al abrir la app (no es push de verdad)

Cada vez que alguien abre la app, se revisa automáticamente:

- Mantenimiento: órdenes críticas activas y vencidas (solo si ve esa pestaña)
- Calidad: incidencias críticas abiertas (solo si ve esa pestaña)
- Materiales: bajo mínimo y caducando pronto (solo si ve esa pestaña)

Si hay algo, sale una **notificación nativa de Android** con el resumen. La
primera vez pedirá permiso para mostrar notificaciones — hay que aceptarlo.

**Importante — esto NO es un push de verdad**: solo avisa en el momento de
**abrir** la app, no llega si la tienes cerrada y algo se vuelve crítico
mientras tanto. Un push real (que llegue con la app cerrada) necesita
Firebase Cloud Functions, que exige el plan de pago Blaze (con tarjeta),
igual que pasaba con Storage — por eso no lo hicimos así.

---

## Arreglo: el material nuevo ya nace con su lote conectado

Antes, si creabas un material con stock inicial y lote, ese lote solo
quedaba en un campo suelto — al abrir "Lotes" o "Kardex" aparecían vacíos,
como si no tuviera nada, aunque la tarjeta mostrara stock y lote. Ahora, al
crear un material con stock inicial, se genera automáticamente su primer
lote y un movimiento de "Alta inicial", para que todo cuadre desde el primer
momento.

---

## Arreglo: compartir ya avisa si copia en vez de abrir el selector

Si el botón "Compartir" no podía abrir el selector nativo de Android (caso
raro) y caía en copiar el texto al portapapeles, antes no pasaba nada visible
— parecía que el botón no hacía nada. Ahora avisa con un mensaje si copió al
portapapeles, o si no pudo hacer ninguna de las dos cosas.

---

## Arreglo: fotos que sí se subieron ya no se pierden si otra falla

Si subías varias fotos a la vez y una a mitad fallaba (mala conexión, etc.),
las que sí se habían subido correctamente antes se perdían — no quedaban
guardadas en la orden/incidencia/material, aunque ya estuvieran en
Cloudinary. Ahora, si eso pasa, se guardan igualmente las que sí llegaron a
subirse, y el aviso te dice que faltan por reintentar las demás editando de
nuevo.

---

## Arreglo: borrar algo que falla ya no se queda callado

Si al confirmar "Eliminar" (tarea, material, orden, incidencia o cuenta en
Aprobaciones) fallaba por algún motivo (conexión, permisos), el diálogo se
quedaba abierto sin decir nada. Ahora avisa con un mensaje claro si no se
pudo borrar, en los 5 sitios donde se puede eliminar algo.

---

## Mismo arreglo en los cambios de estado y en Aprobaciones

Cambiar el estado de una orden/incidencia, o aprobar/revocar/cambiar la
categoría de alguien en Aprobaciones, ahora también avisa con un mensaje
claro si falla, en vez de simplemente volver al valor anterior sin explicar
nada.

---

## Aviso sobre el límite de Historial

El Historial siempre carga las últimas 200 acciones. Si usas el filtro de
fechas y no aparece nada de un día antiguo, puede que ese día ya haya
quedado fuera de esas 200 (no significa que no pasara nada) — ahora te lo
avisa cuando usas el filtro de fechas.

---

## Exportar a PDF

Cada módulo (Mantenimiento, Materiales, Producción, Calidad) tiene ahora un
botón **PDF** junto al de **CSV**. Genera un informe con:

- Cabecera con "Mixpak System" y una franja naranja de seguridad.
- Título del informe, cuántos registros tiene, fecha/hora de generación y
  quién lo generó.
- Una tabla con los datos filtrados en ese momento (respeta la búsqueda y
  los filtros activos, igual que el CSV).
- Numeración de páginas si el informe ocupa más de una.

No hace falta configurar nada — usa la librería `jspdf`, que se instala sola
al compilar.

---

## Arreglo: el botón PDF que no hacía nada

La causa era que jsPDF se cargaba de una forma (importación dinámica) que
podía fallar en silencio dentro del WebView de Android, sin mostrar ningún
error — por eso parecía que el botón no hacía nada. Se cambió a la forma
estándar de cargar la librería, y si aun así falla por algo, ahora sale un
aviso claro en vez de quedarse callado.

---

## Arreglo real de CSV y PDF: ahora guardan/comparten, no "descargan"

La causa de que ninguno de los dos funcionara: intentaban "descargar" el
archivo con el truco típico de una página web (un enlace invisible con
`download`), y **eso no funciona dentro del WebView de una app Android
empaquetada** — ahí no hay gestor de descargas escuchando.

Ahora, tanto CSV como PDF generan el archivo y abren el **selector nativo de
compartir** (lo mismo que usa el botón "Compartir"), para que elijas guardarlo
en el dispositivo, enviarlo por WhatsApp, Gmail, etc. Usa el plugin
`@capacitor/filesystem` (se instala solo, no hay que configurar nada).

---

## Firma digital

Al abrir el detalle de una **orden de mantenimiento** o una **incidencia de
calidad** que todavía no esté firmada, aparece un botón:

- **"Firmar y completar"** (Mantenimiento) — abre un recuadro para firmar con
  el dedo. Al guardar, la orden pasa automáticamente a "Completada" y queda
  la firma (imagen), quién firmó y cuándo.
- **"Firmar y cerrar"** (Calidad) — igual, pero pasa la incidencia a
  "Cerrada".

Una vez firmada, se ve la firma junto con el nombre y la fecha en el
detalle, y ya no se puede volver a firmar desde ahí (para cambiar el estado
después, se hace desde el desplegable normal como siempre).

La firma se guarda como imagen en Cloudinary, igual que las fotos — no hace
falta configurar nada más.

---

## Código QR por máquina y material

**Materiales**: cada tarjeta tiene un botón **"Ver código QR"** que genera un
QR único de ese material (puedes compartirlo/imprimirlo y pegarlo en el
estante o el propio repuesto). Arriba, el botón **"Escanear"** abre la
cámara — al escanear el QR de un material, abre directamente su ficha para
editar/ver.

**Mantenimiento**: el botón **"QR máquina"** te deja escribir el nombre de
una máquina y genera su QR (pégalo en la máquina física). El botón
**"Escanear"** lee ese QR y filtra automáticamente la lista de órdenes por
esa máquina, para ver su historial al instante.

**Aviso importante:** la parte de *generar* el QR (`qrcode`) es sencilla y
no debería dar problemas. La parte de *escanear* usa un plugin de cámara de
Capacitor (`@capacitor/barcode-scanning`) que no he podido compilar ni
probar yo mismo. Es muy posible que la primera vez que compiles falle o el
escaneo no funcione a la primera — si pasa eso, mándame el error exacto de
GitHub Actions (o de la app) y lo arreglamos con esa información, como
hicimos antes con el PDF y el CSV.

---

## Arreglo del escaneo: paquete correcto

El paquete que puse antes (`@capacitor/barcode-scanning`) no existe — por
eso falló "Instalar dependencias" en GitHub Actions. El correcto es
**`@capacitor-mlkit/barcode-scanning`**, que además usa el escáner ya
integrado de Google (no hace falta tocar el manifiesto de Android a mano,
cosa que sí pedía el plugin oficial que había probado primero).

Si al compilar con este cambio sigue fallando "Instalar dependencias" con
un error parecido (paquete/versión no encontrada), mándame el error exacto
y ajusto la versión — puede que la versión "^6.1.0" que puse no sea
exactamente la que existe publicada.
