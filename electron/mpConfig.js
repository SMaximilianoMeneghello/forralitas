import { app } from "electron";
import fs from "fs";
import path from "path";

/* ==========================================
   CONFIGURACIÓN DE MERCADO PAGO POINT
   ------------------------------------------
   El Access Token y el device_id del Point
   Smart se guardan en un archivo local (no en
   localStorage del renderer, no se sincronizan
   a Firebase), para que el token nunca salga
   del proceso main de Electron.
========================================== */

function rutaArchivoConfig() {

    return path.join(app.getPath("userData"), "mp-config.json");

}

function leerConfig() {

    try {

        const contenido = fs.readFileSync(rutaArchivoConfig(), "utf-8");

        return JSON.parse(contenido);

    } catch {

        return { accessToken: "", deviceId: "", printerName: "" };

    }

}

function guardarConfig(config) {

    fs.writeFileSync(rutaArchivoConfig(), JSON.stringify(config, null, 2), "utf-8");

}

function enmascarar(token) {

    if (!token || token.length < 4) return "";

    return "••••" + token.slice(-4);

}

export function obtenerConfigSegura() {

    const config = leerConfig();

    return {

        tieneToken: Boolean(config.accessToken),
        tokenEnmascarado: enmascarar(config.accessToken),
        deviceId: config.deviceId || "",
        printerName: config.printerName || ""

    };

}

export function obtenerAccessToken() {

    return leerConfig().accessToken || "";

}

export function obtenerDeviceId() {

    return leerConfig().deviceId || "";

}

export function guardarCredenciales({ accessToken, deviceId }) {

    const config = leerConfig();

    // Si no se manda un token nuevo (campo vacío = "no tocar"), se
    // conserva el que ya estaba guardado.
    if (accessToken) config.accessToken = accessToken;

    if (deviceId !== undefined) config.deviceId = deviceId;

    guardarConfig(config);

    return obtenerConfigSegura();

}

export function guardarImpresoraSeleccionada(printerName) {

    const config = leerConfig();

    config.printerName = printerName || "";

    guardarConfig(config);

    return obtenerConfigSegura();

}
