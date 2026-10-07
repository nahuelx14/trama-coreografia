# Configuración de Supabase

La aplicación usa Supabase Auth y una fila JSON por coreografía. La clave incluida en el frontend es la clave pública del proyecto; nunca debe agregarse una clave `sb_secret_...` ni `service_role`.

## 1. Crear la tabla y sus permisos

En el panel del proyecto, abrir **SQL Editor**, crear una consulta nueva, pegar el contenido de [`supabase/schema.sql`](supabase/schema.sql) y ejecutarla una vez.

El script crea o actualiza la tabla `public.choreographies`, genera los códigos para compartir, crea el bucket privado `choreography-audio` y aplica las políticas necesarias. Cada persona solo puede editar sus propias coreografías. Una cuenta que copia una coreografía mediante su código recibe una fila independiente y permiso de lectura sobre el MP3 asociado.

## 2. Configurar el enlace de acceso

En **Authentication → URL Configuration** configurar:

- Site URL: `https://nahuelx14.github.io/trama-coreografia/`
- Redirect URL permitida: `https://nahuelx14.github.io/trama-coreografia/`

Para pruebas locales también se puede agregar `http://127.0.0.1:4173/` como redirect permitido.

En **Authentication → Sign In / Providers**, mantener habilitado el proveedor Email. Cada persona puede crear una cuenta con su correo y una contraseña de al menos ocho caracteres. Si la confirmación de correo está habilitada, el enlace de confirmación vuelve a la aplicación mediante la Redirect URL configurada arriba.

## 3. Funcionamiento

- Una sesión iniciada recupera la coreografía abierta más recientemente en computadora o celular.
- Cada cambio se guarda primero en el navegador y luego en Supabase.
- “Mis coreos” permite crear, abrir, renombrar, duplicar y eliminar rutinas.
- El botón `#` copia el código de una coreografía y el campo “Copiar una coreo compartida” lo canjea desde otra cuenta.
- Una rutina local se puede subir con “Guardar la actual en la nube”.
- Un MP3 de hasta 50 MB se sube al bucket privado cuando la coreografía está guardada en la nube.
- Los enlaces de audio son temporales y se regeneran al abrir una coreografía.
- “Olvidé mi contraseña” envía un enlace al correo y permite elegir una contraseña nueva dentro de la aplicación.
