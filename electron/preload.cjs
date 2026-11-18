const { contextBridge, ipcRenderer } = require("electron");

/* ==========================================
   PUENTE SEGURO RENDERER <-> MAIN
   ------------------------------------------
   El renderer (la app web de FORRALITAS) nunca
   ve el Access Token de Mercado Pago ni habla
   directo con internet para el cobro: todo pasa
   por el proceso main a través de estas pocas
   funciones.
========================================== */

contextBridge.exposeInMainWorld("forralitasNative", {

    mp: {

        obtenerConfig: () => ipcRenderer.invoke("mp:obtener-config"),
        guardarCredenciales: (datos) => ipcRenderer.invoke("mp:guardar-credenciales", datos),
        listarDispositivos: () => ipcRenderer.invoke("mp:listar-dispositivos"),
        crearCobro: (datos) => ipcRenderer.invoke("mp:crear-cobro", datos),
        consultarCobro: (orderId) => ipcRenderer.invoke("mp:consultar-cobro", orderId),
        cancelarCobro: (orderId) => ipcRenderer.invoke("mp:cancelar-cobro", orderId),
        imprimirTicket: (datos) => ipcRenderer.invoke("mp:imprimir-ticket", datos),
        configurarModoPDV: () => ipcRenderer.invoke("mp:configurar-modo-pdv"),
        buscarPagosRecientes: (datos) => ipcRenderer.invoke("mp:buscar-pagos-recientes", datos)

    },

    impresora: {

        listar: () => ipcRenderer.invoke("impresora:listar"),
        imprimirTicket: (html) => ipcRenderer.invoke("impresora:imprimir-ticket", html),
        guardarSeleccionada: (nombre) => ipcRenderer.invoke("impresora:guardar-seleccionada", nombre)

    }

});
