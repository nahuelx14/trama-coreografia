# Configuración de Supabase

La aplicación usa Supabase Auth y una fila JSON por coreografía. La clave incluida en el frontend es la clave pública del proyecto; nunca debe agregarse una clave `sb_secret_...` ni `service_role`.

## 1. Crear la tabla y sus permisos

En el panel del proyecto, abrir **SQL Editor**, crear una consulta nueva, pegar el contenido de [`supabase/schema.sql`](supabase/schema.sql) y ejecutarla una vez.

El script crea la tabla `public.choreographies`, habilita Row Level Security y limita todas las operaciones a las filas cuyo `user_id` coincide con la persona autenticada.

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
- Una rutina local se puede subir con “Guardar la actual en la nube”.
- Los MP3 siguen siendo locales y no se suben a Supabase.
