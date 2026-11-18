/* Prueba las mejoras de la 1.1.3 (sobre la 1.0.20) contra el emulador
   local de Firebase. Uso: ver pruebas/editar-venta.mjs */
import fs from "node:fs";
import {
    abrirNavegador, nuevaPC, vaciarEmulador, escribirDoc, leerDoc,
    visible, estado, afirmar, esperar
} from "./util.mjs";

const hoy = new Date();
const hace = (min) => new Date(hoy.getTime() - min * 60000);
const texto = (d) => d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + d.toTimeString().slice(0, 5);
const doc = (datos) => ({ datos, actualizado: Date.now() });
const hoyISO = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-" + String(hoy.getDate()).padStart(2, "0");

await vaciarEmulador();

const f1 = hace(300), f2 = hace(200), f3 = hace(100);
await escribirDoc("forralitasDatos/usuarios", doc([
    { usuario: "maxiadmin", nombre: "Maxi (Administrador)", rol: "admin", password: "forralitasadmin" },
    { usuario: "lorenaforralitas", nombre: "Lorena", rol: "empleado", password: "forrajeriaforralitas" }
]));
await escribirDoc("forralitasDatos/productos", doc([
    { id: "P1", nombre: "MAIZ X 40KG", categoria: "Granos", pesoBolsa: 40, precioBolsa: 20000, precioKg: 600, stock: 50, stockMinimo: 5 },
    { id: "P2", nombre: "ALFA VERDE", categoria: "Fardos", pesoBolsa: 20, precioBolsa: 15000, precioKg: 800, stock: 3, stockMinimo: 5 },
    { id: "P3", nombre: "MEZCLA CABALLO", categoria: "Mezclas", pesoBolsa: 30, precioBolsa: 25000, precioKg: 900, stock: 10, stockMinimo: 0 }
]));
await escribirDoc("forralitasDatos/clientes", doc([
    { id: "C1", nombre: "Gerardo", telefono: "381", direccion: "", saldo: 30000, observaciones: "",
      pagos: [{ fecha: hace(250).toISOString(), fechaTexto: texto(hace(250)), monto: 10000, tipoPago: "efectivo", pago: { efectivo: 10000, transferencia: 0 }, ventaId: "V1", ventaFechaTexto: texto(f1), restanteVenta: 30000 }] },
    { id: "C2", nombre: "Marta", telefono: "", direccion: "", saldo: 0, observaciones: "", pagos: [] }
]));
await escribirDoc("forralitasDatos/preciosClientes", doc([
    { id: "PC1", clienteId: "C2", productoId: "P1", precioBolsa: 18000, precioKg: 0 }
]));
await escribirDoc("forralitasDatos/historialVentas", doc([
    { id: "V3", fecha: f3.toISOString(), fechaTexto: texto(f3), cliente: null, vendedor: { usuario: "lorenaforralitas", nombre: "Lorena" },
      productos: [{ id: "P2", nombre: "ALFA VERDE", cantidad: 1, precio: 15000, modo: "bolsa", subtotal: 15000, bolsas: 1, kg: 20 }],
      total: 15000, metodoPago: "transferencia", pago: { efectivo: 0, transferencia: 15000, tarjeta: 0 }, saldoPendiente: 0, pagada: true },
    { id: "V2", fecha: f2.toISOString(), fechaTexto: texto(f2), cliente: null, vendedor: { usuario: "lorenaforralitas", nombre: "Lorena" },
      productos: [{ id: "P1", nombre: "MAIZ X 40KG", cantidad: 1, precio: 20000, modo: "bolsa", subtotal: 20000, bolsas: 1, kg: 40 }],
      total: 20000, metodoPago: "efectivo", pago: { efectivo: 20000, transferencia: 0, tarjeta: 0 }, saldoPendiente: 0, pagada: true },
    { id: "V1", fecha: f1.toISOString(), fechaTexto: texto(f1), cliente: { id: "C1", nombre: "Gerardo" }, vendedor: { usuario: "maxiadmin", nombre: "Maxi (Administrador)" },
      productos: [{ id: "P1", nombre: "MAIZ X 40KG", cantidad: 2, precio: 20000, modo: "bolsa", subtotal: 40000, bolsas: 2, kg: 80 }],
      total: 40000, metodoPago: "debe", pago: { efectivo: 0, transferencia: 0, tarjeta: 0 }, saldoPendiente: 30000, pagada: false }
]));
await escribirDoc("forralitasDatos/gastos", doc([
    { id: "G1", descripcion: "Flete", monto: 7000, categoria: "general", fecha: hoyISO, fechaTexto: "hoy", metodoPago: "efectivo", pago: { efectivo: 7000, transferencia: 0 } }
]));
await escribirDoc("forralitasDatos/proveedores", doc([
    { id: "PR1", nombre: "Molino Sur", telefono: "", direccion: "", diasPago: 15, observaciones: "",
      compras: [{ id: "CP1", descripcion: "Maíz 100 bolsas", monto: 1000000, fecha: hoyISO, fechaTexto: "hoy", fechaVencimiento: null, fechaVencimientoTexto: null, saldoPendiente: 600000, pagada: false }],
      pagos: [{ fecha: hace(30).toISOString(), fechaTexto: texto(hace(30)), monto: 400000, compraId: "CP1", compraDescripcion: "Maíz 100 bolsas", restanteCompra: 600000 }] }
]));
await escribirDoc("forralitasDatos/mezclas", doc([
    { id: "M1", nombre: "Mezcla de Caballo", bolsasPorLote: 10, productoSalida: { id: "P3", nombre: "MEZCLA CABALLO" },
      ingredientes: [{ idProducto: "P1", nombre: "MAIZ X 40KG", cantidad: 4, unidad: "bolsa" }], notas: "",
      producciones: [{ id: "PM1", fecha: hace(400).toISOString(), fechaTexto: texto(hace(400)), cantidad: 10, ingredientesUsados: "4 bolsas de MAIZ X 40KG", usuario: "Maxi" }] }
]));

const nav = await abrirNavegador();
const pcs = [];
const nueva = async () =>{ const x = await nuevaPC(nav); pcs.push(x); return x; };

async function ingresar(p, usuario, clave){
    await visible(p, "#pantallaLogin");
    await p.waitForFunction("!document.querySelector('#formLogin button[type=submit]').disabled && typeof usuarios !== 'undefined' && usuarios.length > 0", null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await p.fill("#loginUsuario", usuario);
    await p.fill("#loginPassword", clave);
    await p.click("#formLogin button[type=submit]");
    await visible(p, "#appPrincipal");
}

async function elegir(p, idSelect, valor){
    await p.click(`#${idSelect} + .selectBoton`);
    const indice = await p.evaluate(([id, v]) => Array.from(document.getElementById(id).options).findIndex(o => o.value === v), [idSelect, valor]);
    if(indice < 0) throw new Error("No existe la opción " + valor + " en " + idSelect);
    await p.click(`.selectPop.visible [data-indice="${indice}"]`);
}

async function aceptar(p){
    await visible(p, "#modalConfirmacion");
    await p.click("#btnAceptarConfirmacion");
}

async function descargar(p, accion){
    const [d] = await Promise.all([p.waitForEvent("download"), accion()]);
    return fs.readFileSync(await d.path(), "utf8");
}

const cli = (p, id) => estado(p, `JSON.parse(JSON.stringify(clientes.find(c => c.id === ${JSON.stringify(id)}) || null))`);
const stock = (p, id) => estado(p, `productos.find(x => x.id === ${JSON.stringify(id)}).stock`);
const venta = (p, id) => estado(p, `JSON.parse(JSON.stringify(historialVentas.find(v => v.id === ${JSON.stringify(id)}) || null))`);

try{

const { pagina: A } = await nueva();
await ingresar(A, "maxiadmin", "forralitasadmin");

console.log("— Ficha del cliente");
await A.click("#Clientes");
await A.click("button[onclick=\"verDetalleCliente('C1')\"]");
await visible(A, "#pantallaClienteDetalle");
afirmar(await estado(A, "document.getElementById('contenidoClienteDetalle').textContent.includes('Total comprado') && document.getElementById('contenidoClienteDetalle').textContent.includes('$40.000')"), "muestra el total comprado");
afirmar(await estado(A, "!!document.getElementById('btnEstadoCuentaCliente') && !!document.getElementById('btnEditarDatosCliente')"), "botones Estado de cuenta y Editar datos");
afirmar(await estado(A, "document.querySelectorAll('#historialClienteLista .btnEditarVenta').length === 1 && document.querySelectorAll('#historialClienteLista .btnEliminarVenta').length === 1"), "cada venta tiene ✏️ y 🗑️");
await esperar(A, "clientes.find(c => c.id === 'C1').pagos[0].id", "al pago viejo se le asignó un identificador");

console.log("— Editar y eliminar pagos del cliente");
await A.click("#contenidoClienteDetalle .mjAccionesPago .btnEditarVenta");
await visible(A, "#mjModalPagoCliente");
await A.fill("#mjPcMonto", "15000");
await elegir(A, "mjPcMetodo", "transferencia");
await A.click("#mjModalPagoCliente .btnGuardar");
let g = await cli(A, "C1");
afirmar(g.saldo === 25000 && g.pagos[0].monto === 15000 && g.pagos[0].pago.transferencia === 15000, "pago editado a $15.000 por transferencia: saldo $25.000");
afirmar((await venta(A, "V1")).saldoPendiente === 25000, "la venta queda debiendo $25.000");
await A.click("#contenidoClienteDetalle .mjAccionesPago .btnEditarVenta");
await A.fill("#mjPcMonto", "999999");
await A.click("#mjModalPagoCliente .btnGuardar");
afirmar((await cli(A, "C1")).pagos[0].monto === 15000, "no deja pagar más de lo que se debía");
await A.click("#mjModalPagoCliente .btnCancelar");
await A.click("#contenidoClienteDetalle .mjAccionesPago .btnEliminarVenta");
await aceptar(A);
g = await cli(A, "C1");
afirmar(g.saldo === 40000 && g.pagos.length === 0 && (await venta(A, "V1")).saldoPendiente === 40000, "pago eliminado: vuelve a deber $40.000");

console.log("— Estado de cuenta");
await A.evaluate("window.__impresiones = 0");
await A.click("#btnEstadoCuentaCliente");
await esperar(A, "window.__impresiones === 1 && document.getElementById('mjZonaImpresion').textContent.includes('Estado de cuenta')", "se manda a imprimir el estado de cuenta");
afirmar(await estado(A, "getComputedStyle(document.getElementById('mjZonaImpresion')).display === 'none'"), "no tapa la pantalla (solo sale por la impresora)");
await A.evaluate("window.dispatchEvent(new Event('afterprint'))");

console.log("— Eliminar la venta fiada desde la ficha y restaurarla");
await A.click("#historialClienteLista .btnEliminarVenta");
await aceptar(A);
afirmar(!(await venta(A, "V1")), "venta eliminada");
afirmar((await cli(A, "C1")).saldo === 0, "se descontó del saldo lo que debía de esa venta");
afirmar((await stock(A, "P1")) === 52, "se devolvió el stock (50 → 52)");
await esperar(A, "document.querySelector('#contenidoClienteDetalle').textContent.includes('$0')", "la ficha se actualizó sola");
await A.click("#btnVolverClientes");
await A.click("#Eliminaciones");
await esperar(A, "document.querySelectorAll('.tablaEliminaciones button[title=\"Restaurar lo eliminado\"]').length >= 1", "el panel muestra ♻️");
await A.click(".tablaEliminaciones button[title=\"Restaurar lo eliminado\"]");
await aceptar(A);
afirmar(!!(await venta(A, "V1")) && (await cli(A, "C1")).saldo === 40000 && (await stock(A, "P1")) === 50, "restaurada: vuelve la venta, la deuda y el stock");

console.log("— Historial: forma de pago, totales y exportar");
await A.click("#Historial");
await esperar(A, "document.querySelectorAll('#listaHistorialVentas .cardVentaHistorial').length === 3", "3 ventas");
afirmar(await estado(A, "document.getElementById('mjResumenHistorial').textContent.includes('$75.000') && document.getElementById('mjResumenHistorial').textContent.includes('Sin cobrar')"), "totales: $75.000 y lo que falta cobrar");
await elegir(A, "mjPagoHistorial", "debe");
await esperar(A, "document.querySelectorAll('#listaHistorialVentas .cardVentaHistorial').length === 1", "filtro 'fiado sin saldar': 1 venta");
await elegir(A, "mjPagoHistorial", "transferencia");
await esperar(A, "document.querySelectorAll('#listaHistorialVentas .cardVentaHistorial').length === 1", "filtro transferencia: 1 venta");
await elegir(A, "mjPagoHistorial", "");
let csv = await descargar(A, () => A.click("#mjBarraHistorial .btnCancelar"));
afirmar(csv.includes("ALFA VERDE") && csv.includes("Gerardo") && csv.split("\r\n").length === 4, "exportar a Excel: 3 ventas");

console.log("— Clientes, productos, gastos y caja");
await A.click("#Clientes");
await A.check("#mjSoloDeudores");
await esperar(A, "document.querySelectorAll('#tablaClientesBody tr').length === 1 && document.getElementById('tablaClientesBody').textContent.includes('Gerardo')", "solo los que deben: Gerardo");
afirmar(await estado(A, "document.getElementById('mjResumenClientes').textContent.includes('$40.000')"), "muestra el total por cobrar");
await A.click("#Productos");
await A.check("#mjSoloStockBajo");
await esperar(A, "document.querySelectorAll('#tablaProductosBody tr').length === 1 && document.getElementById('tablaProductosBody').textContent.includes('ALFA')", "solo con poco stock: Alfa");
csv = await descargar(A, () => A.click(".mjBarra .btnCancelar"));
afirmar(csv.includes("ALFA VERDE") && csv.split("\r\n").length === 2, "exportar productos (con el filtro)");
await A.click("#Gastos");
await esperar(A, "document.getElementById('mjResumenGastos').textContent.includes('$7.000')", "gastos: total $7.000");
csv = await descargar(A, () => A.click(".mjBarra .btnCancelar"));
afirmar(csv.includes("Flete"), "exportar gastos");
await A.click("#Reportes");
await A.waitForTimeout(800);
csv = await descargar(A, () => A.click(".mjBarraCaja .btnCancelar >> nth=1"));
afirmar(csv.split("\r\n").length > 4, "exportar la caja");
await A.evaluate("window.__impresiones = 0");
await A.click(".mjBarraCaja .btnCancelar >> nth=0");
await esperar(A, "window.__impresiones === 1 && document.getElementById('mjZonaImpresion').textContent.includes('Caja')", "imprimir la caja");
await A.evaluate("window.dispatchEvent(new Event('afterprint'))");

console.log("— Proveedores");
await A.click("#Proveedores");
await A.click("button[onclick=\"verDetalleProveedor('PR1')\"]");
await visible(A, "#pantallaProveedorDetalle");
await A.click("#historialComprasProveedor .btnEditarVenta");
await A.fill("#mjCoMonto", "900000");
await A.click("#mjModalCompra .btnGuardar");
afirmar(await estado(A, "proveedores[0].compras[0].saldoPendiente === 500000 && !!proveedores[0].compras[0].fechaVencimiento"), "editar compra: debe $500.000 (y recalcula el vencimiento)");
await A.click("#contenidoProveedorDetalle .mjAccionesPago .btnEditarVenta");
await A.fill("#mjPpMonto", "450000");
await A.click("#mjModalPagoProveedor .btnGuardar");
afirmar(await estado(A, "proveedores[0].compras[0].saldoPendiente === 450000"), "editar pago a proveedor");
await A.click("#contenidoProveedorDetalle .mjAccionesPago .btnEliminarVenta");
await aceptar(A);
afirmar(await estado(A, "proveedores[0].compras[0].saldoPendiente === 900000 && proveedores[0].pagos.length === 0"), "eliminar pago a proveedor");
await A.click("#historialComprasProveedor .btnEliminarVenta");
await aceptar(A);
afirmar(await estado(A, "proveedores[0].compras.length === 0"), "eliminar compra");
await A.click("#btnVolverProveedores");

console.log("— Mezclas");
await A.click("#Mezclas");
await A.click("button[onclick=\"verDetalleMezcla('M1')\"]");
await visible(A, "#pantallaMezclaDetalle");
await A.click("#btnProducirMezcla");
await A.fill("#cantidadProduccionMezcla", "5");
await A.click("#guardarProduccionMezcla");
afirmar((await stock(A, "P1")) === 48 && (await stock(A, "P3")) === 15, "producción: 2 bolsas de maíz → 5 de mezcla");
afirmar(await estado(A, "Array.isArray(mezclas[0].producciones[0].consumo)"), "la producción guarda lo que movió de stock");
await A.click("#contenidoMezclaDetalle .btnEliminarVenta >> nth=0");
await aceptar(A);
afirmar((await stock(A, "P1")) === 50 && (await stock(A, "P3")) === 10, "anular producción: devuelve el stock");
await A.click("#contenidoMezclaDetalle .btnEliminarVenta >> nth=0");
await aceptar(A);
afirmar((await stock(A, "P1")) === 54 && (await stock(A, "P3")) === 0, "anular una producción vieja (calculado con la receta)");
await A.click("#btnVolverMezclas");

console.log("— Ventas: precios especiales");
await A.click("#Ventas");
await A.fill("#buscarVenta", "maiz");
await A.click("#listaProductosVenta .itemBusquedaProducto >> nth=0");
await visible(A, "#modalCantidad");
await A.fill("#inputCantidad", "1");
await A.click("#modalCantidad .btnGuardar");
afirmar(await estado(A, "carrito.length === 1 && carrito[0].subtotal === 20000"), "sin cliente: precio de lista $20.000");
await A.fill("#buscarClienteVenta", "marta");
await A.click("#listaClientesVenta .itemBusquedaProducto >> nth=0");
await esperar(A, "carrito[0].subtotal === 18000", "al elegir a Marta después, se aplica su precio especial ($18.000)");
afirmar(await estado(A, "obtenerPreciosProducto(productos.find(p => p.id === 'P1')).precioKg === 600"), "su precio por kg en $0 usa el de lista ($600), ya no vende gratis");
await A.click("#tablaVenta .btnEliminar");
await A.waitForTimeout(300);
if(await estado(A, "!document.getElementById('modalConfirmacion').classList.contains('oculto')")) await A.click("#btnAceptarConfirmacion");
await esperar(A, "carrito.length === 0 && productos.find(p => p.id === 'P1').stock === 54", "quitar del carrito devuelve el stock");

console.log("— Copia de seguridad");
await A.click("#Configuracion");
await A.waitForTimeout(500);
const backup = await descargar(A, () => A.evaluate("exportarDatos()"));
const datos = JSON.parse(backup);
afirmar(["productos","historialVentas","clientes","gastos","proveedores","usuarios","configuracionSistema","mezclas","carpetasNotas","eliminaciones","preciosClientes"].every(k => datos[k] !== undefined), "la copia incluye todas las tablas");

console.log("— Vaciar panel de eliminaciones");
await A.click("#Eliminaciones");
await A.click(".mjBarra .btnCancelar");
await aceptar(A);
await esperar(A, "eliminaciones.length === 0", "panel vacío");

console.log("— Lo guardado está en la base y lo ve otra PC");
await A.waitForTimeout(2500);
const ventaNube = await leerDoc("forralitasVentas/V1");
afirmar(ventaNube && !ventaNube._borrado && ventaNube.total === 40000, "la venta restaurada está en forralitasVentas");
const { pagina: B } = await nueva();
await ingresar(B, "lorenaforralitas", "forrajeriaforralitas");
await esperar(B, "historialVentas.length === 3 && clientes.find(c => c.id === 'C1').saldo === 40000 && productos.find(p => p.id === 'P1').stock === 54", "otra PC ve todo igual");
await B.click("#Clientes");
await B.click("button[onclick=\"verDetalleCliente('C1')\"]");
afirmar(await estado(B, "document.querySelectorAll('#historialClienteLista .btnEditarVenta, #historialClienteLista .btnEliminarVenta').length === 0"), "la empleada no ve ✏️ ni 🗑️ en la ficha");
await B.evaluate("mjEliminarPagoCliente('C1', 'x'); mjRestaurarEliminacion('x'); mjVaciarEliminaciones(); editarVenta('V1')");
afirmar(await estado(B, "document.getElementById('modalConfirmacion').classList.contains('oculto')"), "ni puede usar las funciones de administrador");

if(process.env.CAPTURAS){
    await A.click("#Clientes");
    await A.click("button[onclick=\"verDetalleCliente('C1')\"]");
    await A.waitForTimeout(800);
    await A.screenshot({ path: process.env.CAPTURAS + "/m-cliente.png" });
    await A.click("#btnVolverClientes");
    await A.click("#Historial"); await A.waitForTimeout(800);
    await A.screenshot({ path: process.env.CAPTURAS + "/m-historial.png" });
    await A.click("#Productos"); await A.waitForTimeout(600);
    await A.screenshot({ path: process.env.CAPTURAS + "/m-productos.png" });
}

const errores = pcs.flatMap(x => x.errores);
if(errores.length){ console.log("ERRORES EN LA PÁGINA:", errores); process.exitCode = 1; }
else console.log("\nTODO OK");

}catch(e){
    console.error("\n" + e.message);
    console.log("errores:", pcs.flatMap(x => x.errores));
    process.exitCode = 1;
}
await nav.close();
