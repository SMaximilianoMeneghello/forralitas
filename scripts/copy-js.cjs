/* ==========================================
   Copia src/js y src/css -> dist/src/js y
   dist/src/css después del build de Vite.

   index.html carga estas carpetas como rutas
   relativas clásicas (<script src="./src/js/...">,
   <link href="./src/css/...">) para que las
   funciones queden globales (se usan con
   onclick="..." en el HTML generado a mano).
   Vite NO las procesa ni las copia solo por
   estar referenciadas así, así que hay que
   copiarlas a mano para que el instalador de
   Electron las incluya.
========================================== */

const fs = require("fs");
const path = require("path");

function copiarCarpeta(nombre){

    const origen = path.join(__dirname, "..", "src", nombre);
    const destino = path.join(__dirname, "..", "dist", "src", nombre);

    if (!fs.existsSync(origen)) {

        console.error(`No se encontró la carpeta src/${nombre}, no hay nada para copiar.`);
        process.exit(1);

    }

    fs.rmSync(destino, { recursive: true, force: true });

    fs.cpSync(origen, destino, { recursive: true });

    console.log(`✔ src/${nombre} copiado a dist/src/${nombre} correctamente.`);

}

copiarCarpeta("js");
copiarCarpeta("css");
