/* Utilidades para las pruebas de pantalla (Playwright).
   IMPORTANTE: ninguna prueba toca la base de datos real. O se trabaja
   sin nube, o contra el emulador local de Firebase; además se bloquea
   cualquier pedido que no vaya a esta misma computadora. */
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

export const URL_APP = process.env.URL_APP || "http://localhost:5173/";

export async function abrirNavegador(){
    return chromium.launch();
}

/* modo: "local" (sin nube) | "emulador" */
export async function nuevaPC(navegador, { modo = "local", previo = null, cuenta = false } = {}){

    const contexto = await navegador.newContext({ viewport: { width: 1400, height: 900 } });

    await contexto.route("**/*", ruta =>{
        const u = new URL(ruta.request().url());
        if(["localhost", "127.0.0.1"].includes(u.hostname)) return ruta.continue();
        return ruta.abort();
    });

    await contexto.addInitScript(({ modo, previo }) =>{
        if(modo === "local") localStorage.setItem("__sinNube", "1");
        if(modo === "emulador") localStorage.setItem("__emulador", "1");
        if(previo && !localStorage.getItem("__sembrado")){
            Object.keys(previo).forEach(k => localStorage.setItem(k, typeof previo[k] === "string" ? previo[k] : JSON.stringify(previo[k])));
            localStorage.setItem("__sembrado", "1");
        }
    }, { modo, previo });

    const pagina = await contexto.newPage();

    const errores = [];
    pagina.on("pageerror", e => errores.push("pageerror: " + e.message));
    pagina.on("console", m =>{
        if(m.type() === "error" && !/net::ERR_|Failed to load resource|WebChannel|\[Sync\]|Could not reach/.test(m.text())) errores.push("console: " + m.text());
    });
    pagina.on("dialog", d => d.dismiss().catch(() => {}));

    await pagina.goto(URL_APP);

    return { contexto, pagina, errores };

}

export async function visible(pagina, selector, ms = 8000){
    await pagina.waitForSelector(selector, { state: "visible", timeout: ms });
}

export async function crearPrimerAdmin(pagina, { negocio = "Negocio Prueba", nombre = "Ana", usuario = "ana", clave = "secreta1" } = {}){
    await visible(pagina, "#pantallaPrimerAdmin");
    await pagina.fill("#primerNegocio", negocio);
    await pagina.fill("#primerNombre", nombre);
    await pagina.fill("#primerUsuario", usuario);
    await pagina.fill("#primerClave", clave);
    await pagina.fill("#primerClaveRepetir", clave);
    await pagina.click("#formPrimerAdmin button[type=submit]");
    await visible(pagina, "#appPrincipal");
}

export async function ingresar(pagina, usuario, clave){
    await visible(pagina, "#pantallaLogin");
    await pagina.fill("#loginUsuario", usuario);
    await pagina.fill("#loginPassword", clave);
    await pagina.click("#formLogin button[type=submit]");
}

export async function aceptarConfirmacion(pagina){
    await visible(pagina, "#modalConfirmacion");
    await pagina.click("#btnAceptarConfirmacion");
}

export async function crearProducto(pagina, p){
    await pagina.click("#Productos");
    await pagina.click("#btnAgregarProducto");
    await pagina.fill("#nombreProducto", p.nombre);
    await pagina.fill("#categoriaProducto", p.categoria || "");
    await pagina.fill("#pesoBolsa", String(p.peso));
    await pagina.fill("#precioBolsaProducto", String(p.precioBolsa));
    await pagina.fill("#precioKgProducto", String(p.precioKg));
    await pagina.fill("#stockProducto", String(p.stock));
    if(p.minimo !== undefined) await pagina.fill("#stockMinimoProducto", String(p.minimo));
    if(p.separar !== undefined) await pagina.fill("#separarProducto", String(p.separar));
    if(p.grupo !== undefined) await pagina.fill("#grupoSepararProducto", p.grupo);
    if(p.costo !== undefined) await pagina.fill("#costoBolsaProducto", String(p.costo));
    await pagina.click("#guardarProducto");
}

export async function crearCliente(pagina, c){
    await pagina.click("#Clientes");
    await pagina.click("#btnAgregarCliente");
    await pagina.fill("#nombreCliente", c.nombre);
    await pagina.fill("#telefonoCliente", c.telefono || "");
    if(c.saldo !== undefined) await pagina.fill("#saldoCliente", String(c.saldo));
    await pagina.click("#guardarCliente");
}

/* items: [{ buscar, cantidad, modo }] */
export async function vender(pagina, items, { cliente = null, debe = false, pago = "efectivo", efectivo, transferencia } = {}){
    await pagina.click("#Ventas");
    if(cliente){
        await pagina.fill("#buscarClienteVenta", cliente);
        await pagina.click("#listaClientesVenta .itemBusquedaProducto");
        if(debe) await pagina.click("#btnDebe");
    }
    for(const it of items){
        const idModo = { bolsa: "#modoBolsa", kg: "#modoKg", dinero: "#modoDinero" }[it.modo || "bolsa"];
        await pagina.click(idModo);
        await pagina.fill("#buscarVenta", it.buscar);
        await pagina.click("#listaProductosVenta .itemBusquedaProducto");
        await visible(pagina, "#modalCantidad");
        await pagina.fill("#inputCantidad", String(it.cantidad));
        await pagina.click("#modalCantidad .btnGuardar");
    }
    if(!debe){
        if(pago === "transferencia") await pagina.click("#btnTransferencia");
        if(pago === "mixto"){
            await pagina.click("#btnMixto");
            await pagina.fill("#montoEfectivo", String(efectivo));
            await pagina.fill("#montoTransferencia", String(transferencia));
        }
    }
    await pagina.click("#btnRegistrarVenta");
}

export const estado = (pagina, expr) => pagina.evaluate(expr);

export function afirmar(cond, mensaje){
    if(!cond) throw new Error("FALLÓ: " + mensaje);
    console.log("  ✔ " + mensaje);
}

export async function esperar(pagina, expr, mensaje, ms = 10000){
    try{
        await pagina.waitForFunction(expr, null, { timeout: ms });
        console.log("  ✔ " + mensaje);
    }catch(e){
        throw new Error("FALLÓ (tiempo agotado): " + mensaje);
    }
}
