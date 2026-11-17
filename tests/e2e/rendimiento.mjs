/* Mide que la app siga respondiendo rápido con un historial de
   varios años (20.000 ventas) y que esos datos se guarden bien en
   la PC aunque superen el límite de localStorage. */
import { abrirNavegador, nuevaPC, crearPrimerAdmin, crearProducto, vender, visible, estado, afirmar } from "./util.mjs";

const MODO = process.env.MODO || "local";

if(MODO === "emulador"){
    await fetch("http://127.0.0.1:8080/emulator/v1/projects/demo-prueba/databases/(default)/documents", { method: "DELETE" });
}

const nav = await abrirNavegador();
const { pagina: p, errores } = await nuevaPC(nav, { modo: MODO });

try{

if(MODO === "emulador"){
    await visible(p, "#pantallaConexion");
    await p.click("#enlaceSinCuenta");
}

await crearPrimerAdmin(p);
await crearProducto(p, { nombre: "MAIZ X 40KG", peso: 40, precioBolsa: 20000, precioKg: 600, stock: 100000, separar: 11000, grupo: "Maíz" });

const N = Number(process.env.VENTAS || 20000);

const t0 = await p.evaluate((N) =>{
    const prod = productos[0];
    const base = Date.now() - N * 60000 * 20;
    const lista = [];
    for(let i = 0; i < N; i++){
        const f = new Date(base + i * 60000 * 20);
        lista.unshift({
            id: "V" + (base + i) + "x" + i, numero: i + 1, fecha: f.toISOString(), fechaTexto: fechaHoraTexto(f),
            cliente: i % 5 === 0 ? { id: "C1", nombre: "Cliente " + (i % 40) } : null,
            vendedor: { usuario: "ana", nombre: "Ana" },
            productos: [
                { id: prod.id, nombre: prod.nombre, cantidad: 2, precio: 20000, modo: "bolsa", subtotal: 40000, bolsas: 2, kg: 80, separar: 11000, grupoSeparar: "Maíz" },
                { id: prod.id, nombre: prod.nombre, cantidad: 10, precio: 600, modo: "kg", subtotal: 6000, bolsas: 0.25, kg: 10 }
            ],
            total: 46000, metodoPago: i % 3 === 0 ? "transferencia" : "efectivo",
            pago: i % 3 === 0 ? { efectivo: 0, transferencia: 46000 } : { efectivo: 46000, transferencia: 0 },
            saldoPendiente: 0, pagada: true
        });
    }
    historialVentas = lista;
    const t = performance.now();
    guardarDatos("historialVentas");
    return { ms: performance.now() - t, mb: JSON.stringify(lista).length / 1e6 };
}, N);
console.log(`  ${N} ventas (${t0.mb.toFixed(1)} MB). Guardado inicial: ${t0.ms.toFixed(0)} ms`);

if(MODO === "emulador"){
    const t = Date.now();
    await p.waitForFunction("gestorSync.estado().pendientes === 0", null, { timeout: 180000, polling: 500 });
    console.log(`  Subida inicial completa a la nube en ${((Date.now() - t) / 1000).toFixed(1)} s`);
    const docs = await p.evaluate("adaptadorActual.leer('historialVentas').then(d => ({ partes: (d.orden || ['m']).length, principal: JSON.stringify(d.datos).length }))");
    afirmar(docs.partes > 10 && docs.principal < 700000, `el historial quedó repartido en ${docs.partes} documentos (principal: ${(docs.principal / 1000).toFixed(0)} KB)`);
}

const medir = async (nombre, codigo, limite) =>{
    const ms = await p.evaluate(`(() => { const t = performance.now(); ${codigo}; return performance.now() - t; })()`);
    afirmar(ms < limite, `${nombre}: ${ms.toFixed(0)} ms (límite ${limite})`);
};

await vender(p, [{ buscar: "maiz", cantidad: 1 }]);
await medir("guardar después de una venta (historial)", "historialVentas[0].total += 0; historialVentas.unshift({ ...historialVentas[0], id: nuevoId('V') }); guardarDatos('historialVentas')", 400);
await medir("guardar un cambio de stock (lo que pasa al cargar cada producto)", "productos[0].stock -= 1; guardarDatos('productos')", 30);
await medir("guardarDatos() completo sin cambios", "guardarDatos()", 400);
await medir("abrir Dashboard", "abrirDashboard()", 400);
await medir("abrir Historial", "abrirHistorial()", 800);
await medir("abrir Caja", "abrirReportes()", 400);
await medir("Caja de todo el historial", "document.getElementById('fechaDesdeReporte').value = ''; generarReporte()", 800);
await medir("abrir Ventas", "abrirVentas()", 100);

if(MODO === "emulador"){
    await p.waitForFunction("gestorSync.estado().pendientes === 0", null, { timeout: 60000, polling: 300 });
    afirmar(true, "todo sincronizado después de las pruebas");
}

await p.waitForTimeout(1500);
await p.reload();
await visible(p, "#appPrincipal", 30000);
afirmar(await estado(p, `historialVentas.length === ${N} + 2`), "después de cerrar y abrir siguen todas las ventas (guardadas fuera de localStorage)");
if(MODO === "emulador"){
    await p.waitForFunction("gestorSync.estado().confirmadas === gestorSync.estado().total", null, { timeout: 60000 });
    afirmar(await estado(p, `historialVentas.length === ${N} + 2 && gestorSync.estado().pendientes === 0`), "al reabrir, lo que baja de la nube coincide con lo local");
}
afirmar(await estado(p, "localStorage.getItem('historialVentas') === null || localStorage.getItem('historialVentas').length > 1000"), "localStorage no quedó con una copia cortada");

if(errores.length){ console.log("ERRORES:", errores); process.exitCode = 1; } else console.log("\nTODO OK (rendimiento)");

}catch(e){ console.error("\n" + e.message); console.log(errores); process.exitCode = 1; }
await nav.close();
