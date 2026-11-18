import { BrowserWindow } from "electron";

/* ==========================================
   IMPRESIÓN DE TICKETS
   ------------------------------------------
   Usa una ventana oculta para cargar el HTML
   del ticket y mandarlo a imprimir con la
   impresora elegida en Configuración (sirve
   cualquier impresora instalada en Windows,
   térmica o no).
========================================== */

function crearVentanaOculta() {

    return new BrowserWindow({

        show: false,

        webPreferences: {
            offscreen: true
        }

    });

}

export async function listarImpresoras() {

    const ventana = crearVentanaOculta();

    try {

        const impresoras = await ventana.webContents.getPrintersAsync();

        return impresoras.map(p => ({ nombre: p.name, descripcion: p.displayName || p.name }));

    } finally {

        ventana.destroy();

    }

}

export async function imprimirTicket(html, printerName) {

    const ventana = crearVentanaOculta();

    try {

        await ventana.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));

        await new Promise((resolve, reject) => {

            ventana.webContents.print(

                {
                    silent: true,
                    printBackground: true,
                    deviceName: printerName || ""
                },

                (exito, motivoError) => {

                    if (exito) resolve();
                    else reject(new Error(motivoError || "No se pudo imprimir el ticket."));

                }

            );

        });

    } finally {

        ventana.destroy();

    }

}
