import { app, BrowserWindow, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let ventanaPrincipal = null;

function createWindow() {

    ventanaPrincipal = new BrowserWindow({

        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,

        autoHideMenuBar: true,

        title: "FORRALITAS",

        icon: path.join(__dirname, "../build/icon.ico"),

       webPreferences: {

    preload: path.join(__dirname, "preload.js"),
    nodeIntegration: false,
    contextIsolation: true

}

    });

    if (!app.isPackaged) {

        ventanaPrincipal.loadURL("http://localhost:5173");

    } else {

        ventanaPrincipal.loadFile(path.join(__dirname, "../dist/index.html"));

    }

}

/* ==========================================
   ACTUALIZACIONES AUTOMÁTICAS
   ------------------------------------------
   Cuando se publica una nueva versión (ver
   "npm run publish:win" en el README de
   actualizaciones), cada PC con el programa
   instalado la descarga sola en segundo plano
   y, cuando termina de bajarla, pregunta si
   reiniciar para instalarla.

   No hace nada mientras se está desarrollando
   con "npm run electron:dev" (app.isPackaged
   es false ahí), solo corre en el .exe instalado.
========================================== */

function iniciarActualizacionesAutomaticas() {

    if (!app.isPackaged) return;

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("update-downloaded", () => {

        dialog.showMessageBox(ventanaPrincipal, {

            type: "info",
            title: "Actualización lista",
            message:
                "Se descargó una actualización de FORRALITAS.\n" +
                "¿Reiniciar ahora para instalarla?",
            buttons: ["Reiniciar ahora", "Más tarde"],
            defaultId: 0,
            cancelId: 1

        }).then((resultado) => {

            if (resultado.response === 0) {

                autoUpdater.quitAndInstall();

            }

        });

    });

    autoUpdater.on("error", (error) => {

        console.error("[Actualizaciones] Error buscando actualización:", error);

    });

    // Busca al abrir el programa...
    autoUpdater.checkForUpdates().catch((error) => {

        console.error("[Actualizaciones] No se pudo chequear al inicio:", error);

    });

    // ...y después cada 2 horas mientras esté abierto.
    setInterval(() => {

        autoUpdater.checkForUpdates().catch(() => {});

    }, 2 * 60 * 60 * 1000);

}

app.whenReady().then(() => {

    createWindow();
    iniciarActualizacionesAutomaticas();

});

app.on("window-all-closed", () => {

    if (process.platform !== "darwin")
        app.quit();

});