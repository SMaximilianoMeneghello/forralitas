/* Prueba la versión compilada dentro de Electron de verdad (cargada
   desde archivo, como en el instalador), contra el emulador.
   Uso (Linux): npm run build && xvfb-run -a node tests/e2e/electron.mjs */
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { crearPrimerAdmin, crearProducto, vender, visible, estado, afirmar, esperar } from "./util.mjs";

const { _electron } = createRequire(import.meta.url)("playwright");

const principal = process.argv[2] || new URL("./electron-main.mjs", import.meta.url).pathname;
const datosUsuario = fs.mkdtempSync(path.join(os.tmpdir(), "electron-datos-"));

await fetch("http://127.0.0.1:8080/emulator/v1/projects/demo-prueba/databases/(default)/documents", { method: "DELETE" });

async function abrir(){
    const app = await _electron.launch({
        executablePath: path.resolve("node_modules/electron/dist/electron"),
        args: [principal, "--no-sandbox", "--user-data-dir=" + datosUsuario]
    });
    const p = await app.firstWindow();
    const errores = [];
    p.on("pageerror", e => errores.push(e.message));
    await p.waitForLoadState("domcontentloaded");
    return { app, p, errores };
}

try{

let { app, p, errores } = await abrir();
afirmar((await estado(p, "location.protocol")) === "file:", "la app se carga desde archivo, como en el instalador");
afirmar(await estado(p, "!!window.FirebaseDB && typeof window.FirebaseDB.adaptadorClasico === 'function'"), "Firebase viene empaquetado (no se baja de internet)");
await visible(p, "#pantallaConexion");
afirmar(true, "instalación nueva: pide vincular la PC");

// A partir de acá, contra el emulador.
await p.evaluate("localStorage.setItem('__emulador', '1')");
await p.reload();
afirmar(await estado(p, "window.FirebaseDB.modoEmulador === true"), "modo emulador activo");
await visible(p, "#pantallaConexion");
await p.click("#enlaceSinCuenta");
await crearPrimerAdmin(p, { negocio: "Prueba Electron" });
await crearProducto(p, { nombre: "MAIZ X 40KG", peso: 40, precioBolsa: 20000, precioKg: 600, stock: 10 });
await vender(p, [{ buscar: "maiz", cantidad: 2 }]);
await esperar(p, "gestorSync.estado().pendientes === 0 && gestorSync.estado().confirmadas === gestorSync.estado().total", "venta sincronizada desde Electron", 30000);
afirmar(await estado(p, "document.getElementById('estadoSync').textContent.includes('Sincronizado')"), "el indicador dice Sincronizado");
afirmar(await estado(p, "document.title === 'Prueba Electron'"), "el título de la ventana es el nombre del negocio");
await p.waitForTimeout(800);
await app.close();

// Cerrar y volver a abrir el programa.
({ app, p, errores } = await abrir());
await visible(p, "#appPrincipal", 20000);
afirmar(await estado(p, "usuarioActual.usuario === 'ana' && historialVentas.length === 1 && productos[0].stock === 8"), "al reabrir el programa siguen la sesión y los datos");
await esperar(p, "gestorSync.estado().confirmadas === gestorSync.estado().total", "y vuelve a conectar con la nube", 30000);
afirmar(errores.length === 0, "sin errores en la ventana " + JSON.stringify(errores));
await app.close();

console.log("\nTODO OK (Electron)");

}catch(e){ console.error("\n" + e.message); process.exitCode = 1; }
process.exit(process.exitCode || 0);
