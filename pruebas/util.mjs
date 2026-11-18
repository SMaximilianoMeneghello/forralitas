/* Utilidades para probar el programa en un navegador automático, SIEMPRE
   contra el emulador local de Firebase (nunca contra la base real):
   - la librería de Firebase se sirve desde node_modules (no de internet);
   - firebase-init.js se sirve con el proyecto "demo-prueba" apuntando al
     emulador (el archivo del programa no se modifica);
   - cualquier pedido a otra dirección que no sea esta PC se bloquea. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = createRequire(import.meta.url)("playwright");

export const URL_APP = process.env.URL_APP || "http://localhost:5173/";
export const EMULADOR = "http://127.0.0.1:8080";

function firebaseInitDePrueba(){

    let s = fs.readFileSync(path.join(raiz, "src/js/firebase/firebase-init.js"), "utf8");

    // Misma versión que la copia local de Firebase (si no, se cargan dos copias).
    const version = JSON.parse(fs.readFileSync(path.join(raiz, "node_modules/firebase/package.json"), "utf8")).version;

    s = s.replace(/firebasejs\/[0-9.]+\//g, "firebasejs/" + version + "/");

    s = s.replace(/projectId:\s*"[^"]*"/, 'projectId: "demo-prueba"');

    s = s.replace(/(const db = initializeFirestore\([\s\S]*?\}\);)/, "$1\nconnectFirestoreEmulator(db, '127.0.0.1', 8080);");

    s = 'import { connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/' + version + '/firebase-firestore.js";\n' + s;

    if(!s.includes("connectFirestoreEmulator(db")) throw new Error("No se pudo preparar firebase-init.js para el emulador");

    return s;

}

export async function abrirNavegador(){ return chromium.launch(); }

export async function nuevaPC(nav){

    const contexto = await nav.newContext({ viewport: { width: 1400, height: 900 } });

    const inicio = firebaseInitDePrueba();

    await contexto.route("**/*", ruta =>{

        const u = new URL(ruta.request().url());

        if(u.hostname === "www.gstatic.com" && u.pathname.startsWith("/firebasejs/")){

            const archivo = path.join(raiz, "node_modules/firebase", path.basename(u.pathname));

            return ruta.fulfill({ status: 200, contentType: "application/javascript", body: fs.readFileSync(archivo, "utf8") });

        }

        if(u.pathname.endsWith("/src/js/firebase/firebase-init.js")){

            return ruta.fulfill({ status: 200, contentType: "application/javascript", body: inicio });

        }

        if(["localhost", "127.0.0.1"].includes(u.hostname)) return ruta.continue();

        return ruta.abort();

    });

    await contexto.addInitScript(() =>{ window.print = () =>{ window.__impresiones = (window.__impresiones || 0) + 1; }; });

    const pagina = await contexto.newPage();

    const errores = [];

    pagina.on("pageerror", e => errores.push(e.message));

    pagina.on("console", m =>{

        if(m.type() === "error" && !/net::ERR_|Failed to load resource|WebChannel|Could not reach|\[Firebase\]/.test(m.text())) errores.push(m.text());

    });

    pagina.on("dialog", d => d.dismiss().catch(() => {}));

    await pagina.goto(URL_APP);

    return { contexto, pagina, errores };

}

export async function vaciarEmulador(){

    await fetch(EMULADOR + "/emulator/v1/projects/demo-prueba/databases/(default)/documents", { method: "DELETE" });

}

/* Escribe un documento en el emulador (formato REST de Firestore). */
function aFirestore(v){

    if(v === null || v === undefined) return { nullValue: null };

    if(Array.isArray(v)) return { arrayValue: { values: v.map(aFirestore) } };

    if(typeof v === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, aFirestore(x)])) } };

    if(typeof v === "boolean") return { booleanValue: v };

    if(typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };

    return { stringValue: String(v) };

}

export async function escribirDoc(ruta, datos){

    const r = await fetch(EMULADOR + "/v1/projects/demo-prueba/databases/(default)/documents/" + ruta, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
        body: JSON.stringify({ fields: Object.fromEntries(Object.entries(datos).map(([k, x]) => [k, aFirestore(x)])) })
    });

    if(!r.ok) throw new Error("No se pudo escribir " + ruta + ": " + await r.text());

}

function deFirestore(v){

    if("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, deFirestore(x)]));

    if("arrayValue" in v) return (v.arrayValue.values || []).map(deFirestore);

    if("integerValue" in v) return Number(v.integerValue);

    if("doubleValue" in v) return v.doubleValue;

    if("booleanValue" in v) return v.booleanValue;

    if("nullValue" in v) return null;

    return v.stringValue;

}

export async function leerDoc(ruta){

    const r = await fetch(EMULADOR + "/v1/projects/demo-prueba/databases/(default)/documents/" + ruta, { headers: { Authorization: "Bearer owner" } });

    if(r.status === 404) return null;

    const d = await r.json();

    return Object.fromEntries(Object.entries(d.fields || {}).map(([k, x]) => [k, deFirestore(x)]));

}

export async function visible(p, sel, ms = 15000){ await p.waitForSelector(sel, { state: "visible", timeout: ms }); }

export const estado = (p, expr) => p.evaluate(expr);

export function afirmar(cond, msj){ if(!cond) throw new Error("FALLÓ: " + msj); console.log("  ✔ " + msj); }

export async function esperar(p, expr, msj, ms = 15000){
    try{ await p.waitForFunction(expr, null, { timeout: ms, polling: 200 }); console.log("  ✔ " + msj); }
    catch(e){ throw new Error("FALLÓ (tiempo agotado): " + msj); }
}
