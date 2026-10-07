# Trama — Estudio Coreográfico

Primera versión funcional de una herramienta web para diseñar, ordenar y ensayar formaciones coreográficas.

## Funciones

- Escenario con cuadrícula editable y frente configurable arriba, abajo, a la izquierda o a la derecha.
- Bailarines identificados por nombre y color, movibles con mouse, tacto o teclado.
- Alta, edición y eliminación de bailarines.
- Creación, duplicado, renombrado, reordenamiento y eliminación de formaciones.
- Reproducción animada de la secuencia con tres velocidades.
- Reproducción de un MP3 local y sincronización de formaciones mediante marcas de tiempo editables.
- Diseño adaptable a computadora y celular.
- Guardado automático en `localStorage` del navegador.

## Ejecutar localmente

No requiere instalación ni proceso de compilación. Serví la carpeta `dist` con cualquier servidor estático. Por ejemplo, si tenés Python instalado:

```bash
python -m http.server 4173 --directory dist
```

Luego abrí `http://localhost:4173`.

## Estructura

```text
dist/
  index.html    Interfaz y estructura de la aplicación
  styles.css    Diseño responsive
  app.js        Estado, interacción, animación y persistencia
.openai/
  hosting.json  Configuración de publicación en Sites
```

## Datos y privacidad

Las rutinas y sus marcas de tiempo se guardan solo en el navegador de la persona usuaria. El archivo MP3 nunca se sube ni se guarda en `localStorage`: debe seleccionarse nuevamente al reabrir la página. No se incluyen datos personales, credenciales ni contenido del navegador en el repositorio. Al borrar los datos del sitio en el navegador, se borra también la rutina guardada.
