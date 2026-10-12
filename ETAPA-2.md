# Etapa 2 — Trayectorias

La versión pública estable quedó congelada en el tag `backup-1`, correspondiente al commit `10c19f2`.

El trabajo experimental vive en la rama `etapa-2-trayectorias`. No debe publicarse en GitHub Pages hasta que la prueba sea aprobada.

## Prototipo actual

- Cada transición entre dos formaciones puede tener un recorrido curvo por bailarín.
- “Editar recorrido” muestra el camino y un punto rojo de control.
- El punto rojo se arrastra para crear la curva.
- “Recta” elimina la curva del bailarín seleccionado.
- “Probar” reproduce únicamente la transición activa y vuelve a la formación de origen.
- Las trayectorias se guardan en el navegador, Supabase y los archivos `.trama.json` junto con la coreografía.
- Las coreografías anteriores siguen funcionando con recorridos rectos.

## Estado de la prueba

La comprobación automática valida creación, guardado, reapertura, vista previa, restauración a línea recta y formato móvil de 390 px.

