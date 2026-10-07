# Trama — Estudio Coreográfico

Primera versión funcional de una herramienta web para diseñar, ordenar y ensayar formaciones coreográficas.

Aplicación pública: <https://nahuelx14.github.io/trama-coreografia/>

## Funciones

- Escenario con cuadrícula editable y frente configurable arriba, abajo, a la izquierda o a la derecha.
- Bailarines identificados por nombre y color, movibles con mouse, tacto o teclado.
- Alta, edición y eliminación de bailarines.
- Creación, duplicado, renombrado, reordenamiento y eliminación de formaciones.
- Reproducción animada de la secuencia con tres velocidades.
- Reproducción de un MP3 local y sincronización de formaciones mediante marcas de tiempo editables.
- Diseño adaptable a computadora y celular.
- Guardado automático en `localStorage` del navegador.
- Exportación e importación de un archivo de proyecto `.trama.json` con toda la edición.
- Exportación CSV de las posiciones y láminas HTML imprimibles de todas las formaciones.
- Biblioteca de múltiples coreografías sincronizadas con Supabase.
- Registro e inicio de sesión mediante correo y contraseña.
- Creación, apertura, renombrado, duplicado y eliminación de coreografías guardadas en la nube.
- Recuperación de contraseña por correo electrónico.
- Códigos para copiar una coreografía a otra cuenta.
- MP3 privados sincronizados entre dispositivos mediante Supabase Storage.

## Ejecutar localmente

No requiere instalación ni proceso de compilación. Serví la carpeta `dist` con cualquier servidor estático. Por ejemplo, si tenés Python instalado:

```bash
python -m http.server 4173 --directory dist
```

Luego abrí `http://localhost:4173`.

## Publicación

Cada cambio enviado a la rama `main` se publica automáticamente en GitHub Pages mediante el workflow `.github/workflows/pages.yml`. La aplicación pública se sirve directamente desde `dist` y no requiere proceso de compilación.

## Estructura

```text
dist/
  index.html    Interfaz y estructura de la aplicación
  styles.css    Diseño responsive
  app.js        Estado, interacción, animación y persistencia
.openai/
  hosting.json  Configuración de publicación en Sites
supabase/
  schema.sql    Tabla y políticas de seguridad de Supabase
```

## Datos y privacidad

La rutina y sus marcas de tiempo se guardan automáticamente en el navegador. Al iniciar sesión, las coreografías y sus MP3 se sincronizan con Supabase y quedan protegidos mediante políticas Row Level Security. Al copiar una coreografía mediante su código, se crea una edición independiente que conserva acceso al audio asociado. Los MP3 no se incluyen en los archivos `.trama.json` exportados. La configuración necesaria de Supabase está documentada en [`SUPABASE.md`](SUPABASE.md).
