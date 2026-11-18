/* Más recorridos sin nube: opciones de configuración, impresión,
   exportar/importar la copia de seguridad, ventas fiadas con pagos
   al editarlas, precios especiales, anotaciones y permisos. */
import fs from "node:fs";
import {
    abrirNavegador, nuevaPC, crearPrimerAdmin, crearProducto, crearCliente, vender,
    aceptarConfirmacion, visible, estado, afirmar, esperar, ingresar
} from "./util.mjs";

const nav = await abrirNavegador();
const { pagina: p, errores, contexto } = await nuevaPC(nav, { modo: "local" });
const cli = (nombre) => estado(p, `clientes.find(x => x.nombre === ${JSON.stringify(nombre)})`);
const prod = (nombre) => estado(p, `productos.find(x => x.nombre === ${JSON.stringify(nombre)})`);

try{

await crearPrimerAdmin(p, { negocio: "Forrajería Sol" });
await crearProducto(p, { nombre: "MAIZ", peso: 40, precioBolsa: 20000, precioKg: 600, stock: 100 });
await crearProducto(p, { nombre: "AVENA", peso: 25, precioBolsa: 10000, precioKg: 500, stock: 100 });
await crearCliente(p, { nombre: "Rosa", telefono: "111" });

console.log("— Configuración");
await p.click("#Configuracion");
await p.fill("#negocioDireccion", "Av. Siempre Viva 123");
await p.fill("#negocioTelefono", "381-4000000");
await p.click("#guardarNegocio");
await p.uncheck("#sonidoVenta");
await p.check("#confirmarVenta");
await p.click("#guardarVentas");
afirmar(await estado(p, "configuracionSistema.negocio.direccion === 'Av. Siempre Viva 123' && configuracionSistema.ventas.confirmarVenta === true && configuracionSistema.ventas.sonidoVenta === false"), "se guardan los datos del negocio y las opciones de venta");

console.log("— Venta con confirmación y quitar producto del carrito");
await p.click("#Ventas");
await p.fill("#buscarVenta", "maiz");
await p.click("#listaProductosVenta .itemBusquedaProducto");
await p.fill("#inputCantidad", "4");
await p.click("#modalCantidad .btnGuardar");
afirmar((await prod("MAIZ")).stock === 96, "al cargar al carrito se descuenta el stock");
await p.click("#tablaVenta .btnEliminar");
await aceptarConfirmacion(p);
afirmar((await prod("MAIZ")).stock === 100 && (await estado(p, "carrito.length")) === 0, "al quitarlo (con confirmación) vuelve el stock");
await vender(p, [{ buscar: "maiz", cantidad: 1 }]);
await aceptarConfirmacion(p);
afirmar((await estado(p, "historialVentas.length")) === 1, "con 'confirmar venta' activado, la venta se registra recién al aceptar");
await p.click("#Configuracion");
await p.uncheck("#confirmarVenta");
await p.click("#guardarVentas");

console.log("— Precios especiales");
const idRosa = (await cli("Rosa")).id;
await p.click("#Clientes");
await p.click(`button[onclick="verDetalleCliente('${idRosa}')"]`);
await p.click("#btnPreciosCliente");
await p.fill("#buscarProductoPrecio", "avena");
await p.click("#listaProductosPrecio .itemBusquedaProducto");
await p.waitForTimeout(180);
await p.fill("#precioBolsaCliente", "9000");
await p.fill("#precioKgCliente", "");
await p.click("#guardarPrecioCliente");
afirmar(await estado(p, "preciosClientesCache.length === 1 && preciosClientesCache[0].precioBolsa === 9000"), "precio especial guardado");
await p.click("#btnVolverDetallePrecios");
await p.click("#btnVolverClientes");
// Primero los productos, después el cliente: debe aplicar el precio especial.
await p.click("#Ventas");
await p.fill("#buscarVenta", "avena");
await p.click("#listaProductosVenta .itemBusquedaProducto");
await p.fill("#inputCantidad", "2");
await p.click("#modalCantidad .btnGuardar");
afirmar(await estado(p, "carrito[0].subtotal === 20000"), "sin cliente: precio de lista");
await p.fill("#buscarClienteVenta", "rosa");
await p.click("#listaClientesVenta .itemBusquedaProducto");
afirmar(await estado(p, "carrito[0].subtotal === 18000 && carrito[0].precio === 9000"), "al elegir el cliente después, se aplica su precio especial");
await p.click("#btnDebe");
await p.click("#btnRegistrarVenta");
afirmar((await cli("Rosa")).saldo === 18000, "venta fiada con precio especial: saldo 18.000");

console.log("— Editar una venta fiada que ya tiene pagos");
await p.click("#Clientes");
await p.click(`button[onclick="verDetalleCliente('${idRosa}')"]`);
await p.click("#btnPagarCliente");
await p.waitForTimeout(180);
await p.fill("#montoPagoCliente", "8000");
await p.click("#guardarPagoCliente");
const idFiada = await estado(p, "historialVentas.find(v => v.metodoPago === 'debe').id");
await p.click(`#contenidoClienteDetalle button[onclick="editarVenta('${idFiada}')"]`);
await visible(p, "#modalEditarVenta");
// Bajar a 1 bolsa (9.000): total > pagado (8.000) → debe 1.000.
await p.locator("#itemsEditarVenta tr").nth(0).locator("input").nth(0).fill("1");
await p.locator("#itemsEditarVenta tr").nth(0).locator("input").nth(0).dispatchEvent("change");
await p.click("#guardarVentaEditada");
afirmar((await cli("Rosa")).saldo === 1000 && await estado(p, `historialVentas.find(v => v.id === '${idFiada}').saldoPendiente === 1000`), "editar venta fiada conserva lo pagado: debe 1.000");
afirmar((await prod("AVENA")).stock === 99, "y devuelve 1 bolsa al stock");
// Bajar el precio por debajo de lo pagado: no deja.
await p.click(`#contenidoClienteDetalle button[onclick="editarVenta('${idFiada}')"]`);
await p.locator("#itemsEditarVenta tr").nth(0).locator("input").nth(1).fill("5000");
await p.locator("#itemsEditarVenta tr").nth(0).locator("input").nth(1).dispatchEvent("change");
await p.click("#guardarVentaEditada");
afirmar(await estado(p, "!document.getElementById('modalEditarVenta').classList.contains('oculto')"), "no deja dejar el total por debajo de lo ya pagado");
// Pasarla a efectivo: avisa que se eliminan los pagos.
await p.locator("#itemsEditarVenta tr").nth(0).locator("input").nth(1).fill("9000");
await p.locator("#itemsEditarVenta tr").nth(0).locator("input").nth(1).dispatchEvent("change");
await p.selectOption("#metodoEditarVenta", "efectivo");
await p.click("#guardarVentaEditada");
await aceptarConfirmacion(p);
const rosa = await cli("Rosa");
afirmar(rosa.saldo === 0 && rosa.pagos.length === 0 && await estado(p, `historialVentas.find(v => v.id === '${idFiada}').pago.efectivo === 9000`), "pasada a efectivo: sin deuda y sin pagos duplicados en la caja");

console.log("— Comprobante y estado de cuenta");
await p.evaluate("window.print = () => { window.__imprimio = (window.__imprimio || 0) + 1; window.__html = document.getElementById('zonaImpresion').innerHTML; }");
await p.click(`#contenidoClienteDetalle button[onclick="imprimirComprobanteVenta('${idFiada}')"]`);
await esperar(p, "window.__imprimio === 1", "se manda a imprimir el comprobante");
const ticket = await estado(p, "window.__html");
afirmar(ticket.includes("Forrajería Sol") && ticket.includes("Av. Siempre Viva 123") && ticket.includes("AVENA") && ticket.includes("$9.000") && ticket.includes("Rosa"), "el comprobante trae negocio, cliente, productos y total");
afirmar(await estado(p, "getComputedStyle(document.getElementById('zonaImpresion')).display === 'none'"), "el comprobante no tapa la pantalla (solo sale por la impresora)");
await p.evaluate("window.dispatchEvent(new Event('afterprint'))");
afirmar(await estado(p, "!document.body.classList.contains('imprimiendo') && document.getElementById('zonaImpresion').innerHTML === ''"), "al terminar de imprimir se limpia");
await p.click("#btnEstadoCuentaCliente");
await esperar(p, "window.__imprimio === 2 && window.__html.includes('Estado de cuenta')", "estado de cuenta del cliente");
await p.evaluate("window.dispatchEvent(new Event('afterprint'))");
await p.click("#btnVolverClientes");

console.log("— Eliminar y restaurar un cliente con sus precios");
await p.click(`button[onclick="eliminarCliente('${idRosa}')"]`);
await aceptarConfirmacion(p);
afirmar(await estado(p, "clientes.length === 0 && preciosClientesCache.length === 0"), "cliente eliminado junto con sus precios");
await p.click("#Eliminaciones");
await p.click(`button[onclick^="restaurarEliminacion"] >> nth=0`);
await aceptarConfirmacion(p);
afirmar(await estado(p, "clientes.length === 1 && preciosClientesCache.length === 1 && clientes[0].preciosEspeciales === undefined"), "cliente restaurado con sus precios especiales");
await p.click("#btnVaciarEliminaciones").catch(() => {});

console.log("— Anotaciones");
await p.click("#Anotaciones");
await p.click("#btnAgregarCarpetaNota");
await p.waitForTimeout(180);
await p.fill("#tituloCarpetaNota", "Deudas <varias>");
await p.click("#modalCarpetaNota .btnGuardar");
const idNota = await estado(p, "carpetasNotas[0].id");
await p.click(`button[onclick="verCarpetaNota('${idNota}')"]`);
await p.fill("#textoAnotacion", "Línea 1\n</textarea><b>x</b>");
await p.click("#contenidoAnotacionDetalle .btnGuardar");
await p.click("#btnVolverAnotaciones");
await p.click(`button[onclick="verCarpetaNota('${idNota}')"]`);
afirmar((await p.inputValue("#textoAnotacion")) === "Línea 1\n</textarea><b>x</b>", "el bloc de notas guarda cualquier texto tal cual");
await p.click("#btnVolverAnotaciones");

console.log("— Exportar a Excel y copia de seguridad");
await p.click("#Historial");
let [descarga] = await Promise.all([p.waitForEvent("download"), p.click("#btnExportarHistorial")]);
let texto = fs.readFileSync(await descarga.path(), "utf8");
afirmar(texto.includes("AVENA") && texto.split("\r\n").length === 3 && texto.includes(";"), "exportar ventas a Excel (CSV)");
await p.click("#Configuracion");
[descarga] = await Promise.all([p.waitForEvent("download"), p.click("#btnExportarDatos")]);
const rutaCopia = await descarga.path();
const copia = JSON.parse(fs.readFileSync(rutaCopia, "utf8"));
afirmar(["productos", "clientes", "proveedores", "gastos", "historialVentas", "eliminaciones", "mezclas", "carpetasNotas", "usuarios", "preciosClientes", "configuracionSistema"].every(t => copia[t] !== undefined), "la copia de seguridad incluye todas las tablas");
afirmar(!JSON.stringify(copia.usuarios).includes("secreta1"), "la copia no contiene contraseñas en texto");
// Se rompe todo y se importa la copia.
await p.evaluate("productos = []; historialVentas = []; clientes = []; carpetasNotas = []; guardarDatos()");
const [selector] = await Promise.all([p.waitForEvent("filechooser"), p.click("#btnImportarDatos")]);
const copiaJson = "/tmp/copia-prueba-" + Date.now() + ".json";
fs.copyFileSync(rutaCopia, copiaJson);
await selector.setFiles(copiaJson);
await aceptarConfirmacion(p);
await esperar(p, "productos.length === 2 && historialVentas.length === 2 && clientes.length === 1 && carpetasNotas.length === 1", "importar la copia deja todo como estaba");
afirmar(await estado(p, "usuarioActual && usuarioActual.usuario === 'ana'"), "y la sesión sigue activa");

console.log("— Permisos de empleados");
await p.click("#btnNuevoUsuarioAdmin");
await p.waitForTimeout(180);
await p.fill("#nombreUsuarioNuevo", "Luis");
await p.fill("#loginUsuarioNuevo", "luis");
await p.fill("#passwordUsuarioNuevo", "luis1234");
await p.click("#guardarUsuarioAdmin");
for(const permiso of ["editarProductos", "editarClientes", "proveedores", "mezclas", "gastos"]) await p.uncheck(`.chkPermiso[data-permiso="${permiso}"]`);
await p.click("#guardarPermisos");
await p.click("#btnCerrarSesion");
await ingresar(p, "luis", "luis1234");
await visible(p, "#appPrincipal");
afirmar(await estado(p, "['Proveedores','Mezclas','Eliminaciones'].every(id => getComputedStyle(document.getElementById(id)).display === 'none')"), "sin permiso no aparecen Proveedores, Mezclas ni Eliminaciones");
await p.click("#Productos");
afirmar(await estado(p, "!document.getElementById('btnAgregarProducto') && !document.querySelector('#tablaProductosBody .btnEditar')"), "sin permiso no puede tocar productos");
await p.click("#Clientes");
afirmar(await estado(p, "!document.querySelector('#tablaClientesBody .btnEditar') && !!document.querySelector('#tablaClientesBody .btnVer')"), "sin permiso solo puede ver clientes");
await p.evaluate("eliminarProducto(productos[0].id); eliminarCliente(clientes[0].id); abrirModalNuevoProducto(); exportarDatos(); guardarPermisos(); eliminarUsuarioAdmin('ana')");
afirmar(await estado(p, "productos.length === 2 && clientes.length === 1 && usuarios.length === 2 && document.getElementById('modalProducto').classList.contains('oculto') && document.getElementById('modalConfirmacion').classList.contains('oculto')"), "y las funciones quedan bloqueadas aunque se intenten llamar a mano");
// Gasto propio de hoy: sí lo puede corregir.
await p.click("#Gastos");
await p.click("#btnAgregarGasto");
await p.waitForTimeout(180);
await p.fill("#descripcionGasto", "Bolsas");
await p.fill("#montoGasto", "500");
await p.click("#guardarGasto");
afirmar(await estado(p, "!!document.querySelector('#tablaGastosBody .btnEditar') && gastos[0].vendedor.nombre === 'Luis'"), "puede corregir un gasto que cargó él mismo hoy");
// Cambiar su propia contraseña.
await p.click("#Configuracion");
await p.fill("#passwordActual", "luis1234");
await p.fill("#passwordNueva", "nueva123");
await p.fill("#passwordRepetir", "nueva123");
await p.click("#btnCambiarPassword");
await p.click("#btnCerrarSesion");
await ingresar(p, "luis", "luis1234");
afirmar((await estado(p, "document.getElementById('loginError').textContent")).length > 0, "la contraseña anterior deja de servir");
await ingresar(p, "luis", "nueva123");
await visible(p, "#appPrincipal");
afirmar(true, "y la nueva funciona");

if(errores.length){ console.log("ERRORES DE CONSOLA:", errores); process.exitCode = 1; }
else console.log("\nTODO OK (extras)");

}catch(e){
    console.error("\n" + e.message);
    console.log("errores de consola:", errores);
    process.exitCode = 1;
}
await nav.close();
