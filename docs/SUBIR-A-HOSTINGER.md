# Publicar en Hostinger

1. Edita `.env.production` y agrega la URL y Publishable Key de Supabase.
2. Conserva `VITE_AUTH_USERNAME_DOMAIN=usuarios.greenchimp.mx`.
3. Ejecuta `npm install`.
4. Ejecuta `npm run build`.
5. Abre la carpeta `dist`.
6. Sube todo su contenido a la carpeta correspondiente de Hostinger, normalmente `public_html`.
7. Comprueba que `.htaccess` también se encuentre en el servidor.

El acceso publicado solicita únicamente usuario y contraseña.

Si la aplicación se publica dentro de una subcarpeta, por ejemplo `/crm/`, cambia `base` en `vite.config.js` de `./` a `/crm/`, vuelve a ejecutar `npm run build` y ajusta el `RewriteBase` del `.htaccess`.
