# Etapa 2 — Trayectorias

La versión pública anterior quedó congelada en el tag `backup-1`, correspondiente al commit `10c19f2`.

El trabajo de esta etapa se desarrolló en la rama `etapa-2-trayectorias` y fue aprobado para incorporarse a la versión final publicada en GitHub Pages.

## Versión final

- Cada transición entre dos formaciones puede tener un recorrido curvo por bailarín.
- “Editar recorrido” muestra el camino y un punto rojo de control.
- El punto rojo se arrastra para crear la curva.
- “Recta” elimina la curva del bailarín seleccionado.
- “Probar” reproduce únicamente la transición activa y vuelve a la formación de origen.
- Las trayectorias se guardan en el navegador, Supabase y los archivos `.trama.json` junto con la coreografía.
- Las coreografías anteriores siguen funcionando con recorridos rectos.

## Historial local

- El botón de flecha curva al costado deshace el último cambio con un clic.
- El botón del reloj abre un panel con los últimos 40 puntos de edición y permite volver a cualquiera.
- **Rehacer** recupera un cambio deshecho mientras no se haya comenzado una edición nueva.
- El historial queda guardado en este navegador y sobrevive a una recarga de la página.
- En esta etapa el historial no se publica ni se comparte entre dispositivos; si una coreografía ya está vinculada a Supabase, solamente se sincroniza allí el estado que se restaure.

## Ajustes de interfaz local

- La pizarra tiene un ancho máximo y se reduce proporcionalmente con el zoom del navegador, en lugar de crecer para ocupar todo el espacio liberado.
- Las opciones de **Música** y **Archivo** comienzan plegadas y se despliegan al tocar su encabezado.

## Estado de la prueba

La comprobación automática valida creación, guardado, reapertura, deshacer, rehacer, panel de historial, paneles plegables, respuesta al zoom, vista previa, restauración a línea recta y formato móvil de 390 px.

