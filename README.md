# Calculadora Promedial — PWA lista para GitHub Pages

Esta carpeta contiene una versión lista para publicar como Progressive Web App (PWA). Al subirla a GitHub Pages, la calculadora podrá abrirse desde un enlace HTTPS e instalarse en el celular como app.

## Archivos incluidos

- `index.html`: pantalla principal de la calculadora.
- `styles.css`: estilos visuales responsive.
- `app.js`: lógica de cálculo, gráfico, guardado local y copia de resultados.
- `manifest.webmanifest`: configuración de app instalable.
- `service-worker.js`: caché offline.
- `icon.svg`, `icon-192.png`, `icon-512.png`: íconos de la app.
- `.nojekyll`: evita que GitHub Pages procese archivos como sitio Jekyll.

## Cómo publicarla en GitHub Pages

1. Crea un repositorio nuevo en GitHub. Ejemplo: `calculadora-promedial`.
2. Sube todos los archivos de esta carpeta directamente en la raíz del repositorio. No los subas dentro de otra carpeta.
3. Entra en **Settings > Pages**.
4. En **Build and deployment**, selecciona:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/root**
5. Guarda. GitHub generará un enlace parecido a:
   `https://TU-USUARIO.github.io/calculadora-promedial/`
6. Abre ese enlace en el celular.

## Cómo instalarla en el celular

### Android / Chrome

1. Abre el enlace de GitHub Pages en Chrome.
2. Toca el menú de tres puntos.
3. Toca **Agregar a pantalla principal** o **Instalar app**.
4. Confirma.

### iPhone / Safari

1. Abre el enlace de GitHub Pages en Safari.
2. Toca el botón de compartir.
3. Toca **Agregar a pantalla de inicio**.
4. Confirma el nombre de la app.

## Nota importante

Esto crea una app instalable tipo PWA, no una app publicada en App Store o Google Play. Para publicarla en tiendas, primero publícala como PWA y luego puedes empaquetarla con herramientas como Capacitor o PWABuilder usando el enlace de GitHub Pages.
