import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import electronUpdater from "electron-updater";
import * as mpConfig from "./mpConfig.js";
import * as mpPoint from "./mpPoint.js";
import * as impresion from "./impresion.js";

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

    preload: path.join(__dirname, "preload.cjs"),
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

    autoUpdater.on("checking-for-update", () => {

        console.log("[Actualizaciones] Buscando actualizaciones...");

    });

    autoUpdater.on("update-available", (info) => {

        console.log("[Actualizaciones] Hay una nueva versión:", info.version);

    });

    autoUpdater.on("update-not-available", () => {

        console.log("[Actualizaciones] Ya tenés la última versión instalada.");

    });

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

        dialog.showMessageBox(ventanaPrincipal, {

            type: "error",
            title: "Error buscando actualizaciones",
            message: "No se pudo revisar si hay una actualización nueva.\n\n" + String(error)

        });

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

/* ==========================================
   MERCADO PAGO POINT + IMPRESIÓN DE TICKETS
   ------------------------------------------
   El renderer solo pide estas acciones por IPC
   (ver electron/preload.cjs); el token y las
   llamadas a la API de Mercado Pago quedan
   siempre en este proceso.
========================================== */

function registrarHandlersNativos() {

    ipcMain.handle("mp:obtener-config", () => mpConfig.obtenerConfigSegura());

    ipcMain.handle("mp:guardar-credenciales", (evento, datos) => mpConfig.guardarCredenciales(datos || {}));

    ipcMain.handle("mp:listar-dispositivos", () => mpPoint.listarDispositivos());

    ipcMain.handle("mp:crear-cobro", (evento, datos) => mpPoint.crearCobro(datos || {}));

    ipcMain.handle("mp:consultar-cobro", (evento, orderId) => mpPoint.consultarCobro(orderId));

    ipcMain.handle("mp:cancelar-cobro", (evento, orderId) => mpPoint.cancelarCobro(orderId));

    ipcMain.handle("mp:imprimir-ticket", (evento, datos) => mpPoint.imprimirEnTerminal(datos || {}));

    ipcMain.handle("mp:configurar-modo-pdv", () => mpPoint.configurarModoPDV());

    ipcMain.handle("mp:buscar-pagos-recientes", (evento, datos) => mpPoint.buscarPagosRecientes(datos || {}));

    ipcMain.handle("impresora:listar", () => impresion.listarImpresoras());

    ipcMain.handle("impresora:imprimir-ticket", (evento, html) => {

        const printerName = mpConfig.obtenerConfigSegura().printerName;

        return impresion.imprimirTicket(html, printerName);

    });

    ipcMain.handle("impresora:guardar-seleccionada", (evento, nombre) => mpConfig.guardarImpresoraSeleccionada(nombre));

}

app.whenReady().then(() => {

    registrarHandlersNativos();
    createWindow();
    iniciarActualizacionesAutomaticas();

});

app.on("window-all-closed", () => {

    if (process.platform !== "darwin")
        app.quit();

});