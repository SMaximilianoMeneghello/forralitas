# Cómo generar el instalable (.exe) de FORRALITAS

Este proyecto ya viene preparado para convertirse en un programa de
escritorio para Windows usando Electron. Yo no puedo generar el
archivo .exe desde acá porque necesita descargar Electron de
internet y este entorno no tiene conexión a internet, pero el
proceso en tu PC es muy simple y son solo 2 pasos.

## Requisitos previos (una sola vez)

1. Instalar **Node.js** (versión 18 o superior) desde:
   https://nodejs.org (bajar la versión "LTS" y hacer Next, Next, Next).

## Pasos para generar el instalador

1. Descomprimí este ZIP en una carpeta, por ejemplo:
   `C:\FORRALITAS APP`

2. Abrí esa carpeta, hacé click derecho dentro de ella y elegí
   **"Abrir en Terminal"** (o "Abrir ventana de PowerShell aquí").

3. Escribí este comando y presioná Enter (solo la primera vez,
   descarga las dependencias — puede tardar unos minutos):

   ```
   npm install
   ```

4. Cuando termine, escribí este otro comando:

   ```
   npm run build:win
   ```

5. Vas a ver que se crea una carpeta llamada **`release`**. Adentro
   vas a encontrar el instalador, algo como:

   ```
   release\FORRALITAS Setup 1.0.0.exe
   ```

   Ese es el archivo que tenés que ejecutar (doble click) en la PC
   donde quieras instalar el programa. Se instala como cualquier
   programa de Windows, queda con su ícono en el escritorio y en el
   menú de inicio, y funciona sin necesidad de abrir el navegador ni
   tener internet.

## Para actualizar el programa más adelante

Cada vez que yo te pase una corrección nueva del código, repetís
solamente el paso 4 (`npm run build:win`) parado en la carpeta del
proyecto — no hace falta repetir el `npm install`, salvo que te
diga lo contrario.

## Notas

- Con una PC de 4GB de RAM, esta versión de escritorio (.exe) es la
  opción recomendada por sobre usar la web en el navegador, tal
  como hablamos.
- Si el comando `npm` no se reconoce en la terminal, es porque Node.js
  no quedó bien instalado o hay que reiniciar la PC después de
  instalarlo.
