/* Prueba la 1.1.1 (= 1.0.20 + ingreso con contraseñas cifradas + editar
   venta) contra el emulador local. Uso:
     firebase emulators:start --project demo-prueba --only firestore
     npm run dev
     node pruebas/editar-venta.mjs */
import crypto from "node:crypto";
import {
    abrirNavegador, nuevaPC, vaciarEmulador, escribirDoc, leerDoc,
    visible, estado, afirmar, esperar
} from "./util.mjs";

const hoy = new Date();
const hace = (min) => new Date(hoy.getTime() - min * 60000);
const texto = (d) => d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + d.toTimeString().slice(0, 5);
const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");

await vaciarEmulador();

const doc = (datos) => ({ datos, actualizado: Date.now() });

await escribirDoc("forralitasDatos/usuarios", doc([
    { usuario: "maxiadmin", nombre: "Maxi (Administrador)", rol: "admin", sal: "salprueba", hash: sha("salprueba:forralitasadmin") },
    { usuario: "lorenaforralitas", nombre: "Lorena", rol: "empleado", password: "forrajeriaforralitas" },
    { usuario: "dernaforralitas", nombre: "Derna", rol: "empleado", sal: "otra", hash: sha("otra:forrajeriaforralitas") },
    { usuario: "maxiforralitas", nombre: "Maxi", rol: "empleado", password: "forrajeriaforralitas" }
]));
await escribirDoc("forralitasDatos/productos", doc([
    { id: "P1", nombre: "MAIZ X 40KG", categoria: "Granos", pesoBolsa: 40, precioBolsa: 20000, precioKg: 600, stock: 50, stockMinimo: 5 },
    { id: "P2", nombre: "ALFA VERDE", categoria: "Fardos", pesoBolsa: 20, precioBolsa: 15000, precioKg: 800, stock: 30, stockMinimo: 5 }
]));
const f1 = hace(120), f2 = hace(60);
await escribirDoc("forralitasDatos/clientes", doc([
    { id: "C1", nombre: "Gerardo", telefono: "381", direccion: "", saldo: 30000, observaciones: "",
      pagos: [{ fecha: hace(90).toISOString(), fechaTexto: texto(hace(90)), monto: 10000, tipoPago: "efectivo", pago: { efectivo: 10000, transferencia: 0 }, ventaId: "V1", ventaFechaTexto: texto(f1), restanteVenta: 30000, vendedor: { usuario: "maxiadmin", nombre: "Maxi (Administrador)" } }] },
    { id: "C2", nombre: "Marta", telefono: "", direccion: "", saldo: 0, observaciones: "", pagos: [] }
]));
await escribirDoc("forralitasDatos/historialVentas", doc([
    { id: "V2", fecha: f2.toISOString(), fechaTexto: texto(f2), cliente: null, vendedor: { usuario: "lorenaforralitas", nombre: "Lorena" },
      productos: [{ id: "P1", nombre: "MAIZ X 40KG", cantidad: 1, precio: 20000, modo: "bolsa", subtotal: 20000, bolsas: 1, kg: 40 }],
      total: 20000, metodoPago: "efectivo", pago: { efectivo: 20000, transferencia: 0, tarjeta: 0 }, saldoPendiente: 0, pagada: true },
    { id: "V1", fecha: f1.toISOString(), fechaTexto: texto(f1), cliente: { id: "C1", nombre: "Gerardo" }, vendedor: { usuario: "maxiadmin", nombre: "Maxi (Administrador)" },
      productos: [{ id: "P1", nombre: "MAIZ X 40KG", cantidad: 2, precio: 20000, modo: "bolsa", subtotal: 40000, bolsas: 2, kg: 80 }],
      total: 40000, metodoPago: "debe", pago: { efectivo: 0, transferencia: 0, tarjeta: 0 }, saldoPendiente: 30000, pagada: false }
]));

const nav = await abrirNavegador();
const pcs = [];
const pc = async () =>{ const x = await nuevaPC(nav); pcs.push(x); return x; };

async function ingresar(p, usuario, clave){
    await visible(p, "#pantallaLogin");
    await p.waitForFunction("!document.querySelector('#formLogin button[type=submit]').disabled && typeof usuarios !== 'undefined' && usuarios.length > 0", null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await p.fill("#loginUsuario", usuario);
    await p.fill("#loginPassword", clave);
    await p.click("#formLogin button[type=submit]");
}

/* Elige una opción haciendo clic en el menú desplegable (el de la 1.0.20). */
async function elegir(p, idSelect, valor){
    await p.click(`#${idSelect} + .selectBoton`);
    const indice = await p.evaluate(([id, v]) => Array.from(document.getElementById(id).options).findIndex(o => o.value === v), [idSelect, valor]);
    if(indice < 0) throw new Error("No existe la opción " + valor + " en " + idSelect);
    await p.click(`.selectPop.visible [data-indice="${indice}"]`);
}

const venta = (p, id) => estado(p, `JSON.parse(JSON.stringify(historialVentas.find(v => v.id === ${JSON.stringify(id)}) || null))`);
const cli = (p, id) => estado(p, `JSON.parse(JSON.stringify(clientes.find(c => c.id === ${JSON.stringify(id)})))`);
const stock = (p, id) => estado(p, `productos.find(x => x.id === ${JSON.stringify(id)}).stock`);

try{

const { pagina: A } = await pc();

console.log("— Ingreso con contraseñas cifradas por la 1.1.0");
await ingresar(A, "maxiadmin", "mala");
await esperar(A, "document.getElementById('loginError').textContent.includes('incorrect')", "contraseña incorrecta: rechazada");
await ingresar(A, "maxiadmin", "forralitasadmin");
await visible(A, "#appPrincipal");
afirmar(true, "el administrador entra con su contraseña de siempre");
await esperar(A, "(() => { const u = usuarios.find(x => x.usuario === 'maxiadmin'); return u.password === 'forralitasadmin' && !u.hash && !u.sal; })()", "su contraseña vuelve a quedar guardada como en la 1.0.20");
await new Promise(r => setTimeout(r, 1500));
const usuNube = (await leerDoc("forralitasDatos/usuarios")).datos;
afirmar(usuNube.find(u => u.usuario === "maxiadmin").password === "forralitasadmin" && !usuNube.find(u => u.usuario === "maxiadmin").hash, "…también en la base de datos (así entra desde cualquier PC con la 1.0.20)");

console.log("— Las ventas se ven como en la 1.0.20");
await A.click("#Historial");
await esperar(A, "document.querySelectorAll('#listaHistorialVentas .cardVentaHistorial').length === 2", "el historial muestra las 2 ventas");
afirmar(await estado(A, "document.querySelectorAll('#listaHistorialVentas .btnEditarVenta').length === 2"), "el administrador ve el botón ✏️ en cada venta");

console.log("— Editar la venta fiada de Gerardo (tenía un pago de $10.000)");
await A.click("button[onclick=\"editarVenta('V1')\"]");
await visible(A, "#modalEditarVenta");
await A.screenshot({ path: process.env.CAPTURA || "/tmp/editar.png" });
afirmar(await estado(A, "document.getElementById('evNota').textContent.includes('Ya pagó $10.000')"), "avisa que ya pagó $10.000");
const fila = A.locator("#evItems tr").nth(0);
await fila.locator("input").nth(0).fill("3");
await fila.locator("input").nth(0).dispatchEvent("change");
await esperar(A, "document.getElementById('evTotal').textContent === '$60.000'", "pasar de 2 a 3 bolsas: total $60.000");
await A.click("#evGuardar");
await esperar(A, "document.getElementById('modalEditarVenta').classList.contains('oculto')", "se guarda");
let v1 = await venta(A, "V1");
afirmar(v1.total === 60000 && v1.saldoPendiente === 50000 && v1.metodoPago === "debe" && v1.editada, "la venta queda en $60.000 debiendo $50.000 (respeta el pago de $10.000)");
afirmar((await cli(A, "C1")).saldo === 50000 && (await cli(A, "C1")).pagos.length === 1, "el saldo de Gerardo pasa a $50.000 y conserva su pago");
afirmar((await stock(A, "P1")) === 49, "se descuenta 1 bolsa más de maíz (50 → 49)");
await esperar(A, "document.querySelector('#listaHistorialVentas').textContent.includes('$60.000')", "el historial se actualiza en pantalla");

console.log("— Se guarda en la base y lo ve otra PC");
await new Promise(r => setTimeout(r, 2500));
const v1Nube = await leerDoc("forralitasVentas/V1");
afirmar(v1Nube && v1Nube.total === 60000 && v1Nube.saldoPendiente === 50000, "la venta corregida está en forralitasVentas (donde la guarda la 1.0.20)");
afirmar((await leerDoc("forralitasDatos/clientes")).datos.find(c => c.id === "C1").saldo === 50000, "el saldo del cliente está guardado");
const { pagina: B } = await pc();
await ingresar(B, "lorenaforralitas", "forrajeriaforralitas");
await visible(B, "#appPrincipal");
await esperar(B, "historialVentas.find(v => v.id === 'V1') && historialVentas.find(v => v.id === 'V1').total === 60000", "otra PC (empleada) ve la venta corregida");
await B.click("#Historial");
await esperar(B, "document.querySelectorAll('#listaHistorialVentas .cardVentaHistorial').length === 2", "y su historial");
afirmar(await estado(B, "document.querySelectorAll('#listaHistorialVentas .btnEditarVenta').length === 0"), "la empleada NO ve el botón ✏️");
await B.evaluate("editarVenta('V1')");
afirmar(await estado(B, "!document.getElementById('modalEditarVenta') || document.getElementById('modalEditarVenta').classList.contains('oculto')"), "y aunque lo intente, no puede editar");

console.log("— Pasar una venta de contado a fiado de otro cliente y volver");
await A.click("button[onclick=\"editarVenta('V2')\"]");
await elegir(A, "evCliente", "C2");
await elegir(A, "evMetodo", "debe");
await A.click("#evGuardar");
await esperar(A, "clientes.find(c => c.id === 'C2').saldo === 20000", "Marta pasa a deber $20.000");
await A.click("button[onclick=\"editarVenta('V2')\"]");
await elegir(A, "evMetodo", "transferencia");
await A.click("#evGuardar");
await esperar(A, "clientes.find(c => c.id === 'C2').saldo === 0 && historialVentas.find(v => v.id === 'V2').pago.transferencia === 20000", "vuelta a contado (transferencia): Marta queda en $0");

console.log("— Cambiar precio y fecha, agregar y quitar productos");
await A.click("button[onclick=\"editarVenta('V2')\"]");
await A.locator("#evItems tr").nth(0).locator("input").nth(1).fill("19000");
await A.locator("#evItems tr").nth(0).locator("input").nth(1).dispatchEvent("change");
await elegir(A, "evProducto", "P2");
await elegir(A, "evModo", "kg");
await A.fill("#evCantidad", "10");
await A.click("#evBtnAgregar");
await esperar(A, "document.getElementById('evTotal').textContent === '$27.000'", "maíz a $19.000 + 10 kg de alfa ($8.000) = $27.000");
const ayer = new Date(hoy.getTime() - 86400000);
const valorFecha = ayer.getFullYear() + "-" + String(ayer.getMonth() + 1).padStart(2, "0") + "-" + String(ayer.getDate()).padStart(2, "0") + "T10:30";
await A.fill("#evFecha", valorFecha);
await A.click("#evGuardar");
await esperar(A, "historialVentas.find(v => v.id === 'V2').total === 27000", "guardado");
afirmar((await stock(A, "P2")) === 29.5, "10 kg de alfa descuentan media bolsa (30 → 29,5)");
afirmar((await venta(A, "V2")).fechaTexto.endsWith("10:30"), "la fecha quedó cambiada");
await A.click("button[onclick=\"editarVenta('V2')\"]");
await A.locator("#evItems tr").nth(1).locator(".btnEliminarVenta").click();
await A.click("#evGuardar");
await esperar(A, "historialVentas.find(v => v.id === 'V2').total === 19000 && productos.find(p => p.id === 'P2').stock === 30", "quitar el alfa devuelve el stock");

console.log("— Pasar la venta fiada a contado (borra sus pagos, con aviso)");
await A.click("button[onclick=\"editarVenta('V1')\"]");
await elegir(A, "evMetodo", "efectivo");
afirmar(await estado(A, "document.getElementById('evNota').textContent.includes('se eliminan')"), "avisa que los pagos se eliminan");
await A.click("#evGuardar");
await visible(A, "#modalConfirmacion");
await A.click("#btnAceptarConfirmacion");
await esperar(A, "clientes.find(c => c.id === 'C1').saldo === 0 && clientes.find(c => c.id === 'C1').pagos.length === 0", "Gerardo queda sin deuda y sin pagos duplicados");

console.log("— Validaciones");
await A.click("button[onclick=\"editarVenta('V1')\"]");
await elegir(A, "evMetodo", "mixto");
await A.fill("#evEfectivo", "1");
await A.click("#evGuardar");
afirmar(await estado(A, "!document.getElementById('modalEditarVenta').classList.contains('oculto')"), "pago mixto que no suma el total: no guarda");
await elegir(A, "evCliente", "");
await elegir(A, "evMetodo", "debe");
await A.click("#evGuardar");
afirmar(await estado(A, "!document.getElementById('modalEditarVenta').classList.contains('oculto')"), "DEBE sin cliente: no guarda");
await A.click("#evCancelar");
afirmar((await venta(A, "V1")).metodoPago === "efectivo", "cancelar no cambia nada");

console.log("— Otros usuarios con contraseña cifrada");
await A.click("#btnCerrarSesion");
await ingresar(A, "dernaforralitas", "forrajeriaforralitas");
await visible(A, "#appPrincipal");
afirmar(true, "Derna (cifrada por la 1.1.0) entra con su contraseña de siempre");

const errores = pcs.flatMap(x => x.errores);
if(errores.length){ console.log("ERRORES EN LA PÁGINA:", errores); process.exitCode = 1; }
else console.log("\nTODO OK");

}catch(e){
    console.error("\n" + e.message);
    console.log("errores:", pcs.flatMap(x => x.errores));
    process.exitCode = 1;
}
await nav.close();
