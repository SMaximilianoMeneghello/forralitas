# Actualizaciones automáticas (casa → negocio, como la base de datos)

Ahora el programa ya tiene el motor de actualizaciones automáticas
integrado (`electron-updater`). Cada PC con FORRALITAS instalado va a
revisar solo, cada vez que se abre y después cada 2 horas, si hay una
versión nueva publicada. Si la hay, la descarga en segundo plano y
pregunta "¿Reiniciar ahora para instalarla?".

Para que esto funcione hace falta un lugar donde "publicar" cada
actualización nueva. Usamos **GitHub** (gratis) porque es lo que
mejor integra Electron para esto. Se hace **una sola vez** la
configuración inicial; después, publicar una actualización es un
solo comando.

## Parte 1 – Configuración inicial (se hace una sola vez)

1. Si no tenés cuenta, creá una gratis en https://github.com

2. Creá un repositorio nuevo (arriba a la derecha, ícono "+" →
   "New repository"). Podés llamarlo, por ejemplo, `forralitas-app`.
   - Puede quedar **público**, no hay problema: dentro del código no
     hay contraseñas de personas, ni datos de clientes — esos viven
     en Firebase, no en este repositorio.

3. En tu PC (la de casa, donde vas a hacer las correcciones), abrí
   la carpeta del proyecto y en el archivo `package.json`, buscá esta
   parte casi al final:

   ```json
   "publish": {
     "provider": "github",
     "owner": "PONER_TU_USUARIO_DE_GITHUB",
     "repo": "PONER_NOMBRE_DEL_REPOSITORIO"
   }
   ```

   Reemplazá `PONER_TU_USUARIO_DE_GITHUB` por tu usuario de GitHub, y
   `PONER_NOMBRE_DEL_REPOSITORIO` por el nombre que le pusiste al
   repositorio (por ejemplo `forralitas-app`).

4. Generá un "token" (una clave que le da permiso a tu PC de subir
   cosas a GitHub desde la terminal):
   - Entrá a https://github.com/settings/tokens
   - "Generate new token" → "Generate new token (classic)"
   - Marcá el permiso `repo` (el casillero completo)
   - Generar y **copiar el token** (empieza con `ghp_...`) — no lo
     vas a volver a ver, guardalo en un lugar seguro (por ejemplo
     un archivo de texto privado).

5. En tu PC de casa, cada vez que abras la terminal para publicar
   una actualización, antes de compilar corré esto (reemplazando por
   tu token real), para que la terminal "recuerde" el token en esa
   sesión:

   ```
   set GH_TOKEN=ghp_tu_token_aca
   ```

   (Ese comando es para CMD de Windows. Se hace una vez por cada
   ventana de terminal que abras para publicar.)

## Parte 2 – Conectar la carpeta a tu repositorio de GitHub

Todavía en tu PC de casa, en la carpeta del proyecto:

```
git init
git add .
git commit -m "Version inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/forralitas-app.git
git push -u origin main
```

(Si `git` no está instalado, bajalo de https://git-scm.com — es
gratis y es un instalador normal de Windows.)

## Parte 3 – Publicar una actualización nueva (de acá en adelante)

Cada vez que yo te pase una corrección de código:

1. Reemplazá los archivos en tu carpeta de proyecto de casa con los
   nuevos que te paso.

2. Abrí `package.json` y subí el número de versión, por ejemplo de
   `"version": "1.0.0"` a `"version": "1.0.1"`. **Esto es obligatorio**
   — si no cambiás el número, el sistema de actualizaciones no se
   entera de que hay algo nuevo.

3. En la terminal, parado en la carpeta del proyecto:

   ```
   set GH_TOKEN=ghp_tu_token_aca
   npm run publish:win
   ```

4. Vas a ver que al final sube los archivos a GitHub ("Uploading" o
   similar). Cuando termina, ¡ya está publicado!

5. La PC del negocio (que ya tiene el programa instalado y abierto,
   o la próxima vez que lo abran) va a detectar sola la actualización,
   bajarla en segundo plano, y preguntar si reiniciar para instalarla.
   No hay que hacer nada manual en esa PC — solo necesita tener
   internet.

## Importante

- La PC del negocio **ya tiene que estar en la versión que incluye
  este sistema de actualizaciones** para que funcione de acá en
  adelante. O sea: esta próxima instalación del `.exe` (con
  `npm run build:win`, sin publicar todavía) tenés que hacerla
  a mano una última vez ahí, como siempre. De ahí en más, ya no va
  a hacer falta tocarla nunca más — se va a actualizar sola.
- Con `npm run build:win` (sin "publish") solo generás el instalador
  para probarlo vos, sin subir nada a GitHub — usalo para probar
  antes de publicar de verdad.
- Con `npm run publish:win` sí se sube a GitHub y todas las PCs con
  el programa instalado se enteran.
