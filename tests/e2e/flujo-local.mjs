/* Recorrido completo de la app sin nube: ventas, fiado, pagos,
   edición y eliminación por el administrador, restauración,
   gastos, caja, proveedores, mezclas, usuarios y permisos. */
import {
    abrirNavegador, nuevaPC, crearPrimerAdmin, crearProducto, crearCliente, vender,
    aceptarConfirmacion, visible, estado, afirmar, esperar, ingresar
} from "./util.mjs";

const nav = await abrirNavegador();
const { pagina: p, errores } = await nuevaPC(nav, { modo: "local" });

const prod = (nombre) => estado(p, `productos.find(x => x.nombre === ${JSON.stringify(nombre)})`);
const cli = (nombre) => estado(p, `clientes.find(x => x.nombre === ${JSON.stringify(nombre)})`);
const ventas = () => estado(p, "historialVentas");

try{

console.log("— Alta inicial");
await crearPrimerAdmin(p, { negocio: "Forrajería <Prueba> & Cía", nombre: "Ana", usuario: "ana", clave: "secreta1" });
afirmar(await estado(p, "document.querySelector('.sidebar .logo').textContent") === "Forrajería <Prueba> & Cía", "el nombre del negocio aparece en el menú");
afirmar(await estado(p, "!usuarios[0].password && usuarios[0].hash.length === 64"), "la contraseña del admin se guarda cifrada");

await crearProducto(p, { nombre: "MAIZ X 40KG", categoria: "Granos", peso: 40, precioBolsa: 20000, precioKg: 600, stock: 50, minimo: 5, separar: 11000, grupo: "Maíz", costo: 15000 });
await crearProducto(p, { nombre: "Alimento <b>Perro</b> \"Top\" 'x'", categoria: "Mascotas", peso: 20, precioBolsa: 30000, precioKg: 1800, stock: 10 });
await crearProducto(p, { nombre: "AVENA", categoria: "Granos", peso: 25, precioBolsa: 10000, precioKg: 500, stock: 30 });
afirmar((await estado(p, "productos.length")) === 3, "se crean 3 productos");
afirmar(await estado(p, "document.querySelector('#tablaProductosBody').innerHTML.includes('&lt;b&gt;Perro')"), "un nombre con símbolos raros se muestra como texto");
afirmar(await estado(p, "!document.querySelector('#tablaProductosBody b')"), "…y no rompe la tabla");

await crearCliente(p, { nombre: "Gerardo O'Brien", telefono: "381-555" });
await crearCliente(p, { nombre: "Marta", telefono: "", saldo: 5000 });

console.log("— Ventas");
await vender(p, [{ buscar: "maiz", cantidad: 2 }, { buscar: "avena", cantidad: 10, modo: "kg" }]);
let v = await ventas();
afirmar(v.length === 1 && v[0].total === 45000 && v[0].numero === 1, "venta en efectivo: total 45.000 y N.º 1");
afirmar(v[0].pago.efectivo === 45000 && v[0].productos[0].separar === 11000, "queda el pago en efectivo y el monto a separar");
afirmar((await prod("MAIZ X 40KG")).stock === 48, "stock de maíz 50 → 48");
afirmar((await prod("AVENA")).stock === 29.6, "10 kg de avena descuentan 0,4 bolsas");

await vender(p, [{ buscar: "maiz", cantidad: 3 }], { cliente: "gerardo", debe: true });
v = await ventas();
afirmar(v[0].metodoPago === "debe" && v[0].saldoPendiente === 60000 && v[0].pago.efectivo === 0, "venta fiada: queda DEBE 60.000 sin plata cobrada");
afirmar((await cli("Gerardo O'Brien")).saldo === 60000, "saldo del cliente 60.000");

await vender(p, [{ buscar: "perro", cantidad: 1 }], { pago: "mixto", efectivo: 10000, transferencia: 20000 });
v = await ventas();
afirmar(v[0].metodoPago === "mixto" && v[0].pago.transferencia === 20000, "venta mixta");

await vender(p, [{ buscar: "avena", cantidad: 5000, modo: "dinero" }], { pago: "transferencia" });
v = await ventas();
afirmar(v[0].total === 5000 && v[0].productos[0].kg === 10, "venta por monto: $5.000 = 10 kg");

// Venta que no cierra: pago mixto mal sumado.
await vender(p, [{ buscar: "avena", cantidad: 1 }], { pago: "mixto", efectivo: 1, transferencia: 1 });
afirmar((await ventas()).length === 4, "pago mixto que no suma el total no registra la venta");
await p.click("#btnEfectivo");
await p.click("#btnRegistrarVenta");
afirmar((await ventas()).length === 5, "corregido el pago, se registra");

// Sin stock suficiente.
await p.click("#modoBolsa");
await p.fill("#buscarVenta", "perro");
await p.click("#listaProductosVenta .itemBusquedaProducto");
await p.fill("#inputCantidad", "500");
await p.click("#modalCantidad .btnGuardar");
afirmar(await estado(p, "!document.getElementById('modalCantidad').classList.contains('oculto') && carrito.length === 0"), "no deja vender más que el stock");
await p.keyboard.press("Escape");

console.log("— Pagos del cliente");
const idGerardo = (await cli("Gerardo O'Brien")).id;
await p.click("#Clientes");
await p.click(`button[onclick="verDetalleCliente('${idGerardo}')"]`);
await p.click("#btnPagarCliente");
await p.waitForTimeout(180);
await p.fill("#montoPagoCliente", "25000");
await p.click("#guardarPagoCliente");
let g = await cli("Gerardo O'Brien");
afirmar(g.saldo === 35000 && g.pagos.length === 1 && g.pagos[0].id, "pago de 25.000: saldo 35.000");
afirmar((await ventas()).find(x => x.metodoPago === "debe").saldoPendiente === 35000, "la venta queda debiendo 35.000");

// Admin edita el pago a 30.000 por transferencia.
await p.click("#contenidoClienteDetalle .filaPagoCliente .btnEditar");
await visible(p, "#modalEditarPago");
await p.fill("#montoEditarPago", "30000");
await p.selectOption("#metodoEditarPago", "transferencia");
await p.click("#guardarPagoEditado");
g = await cli("Gerardo O'Brien");
afirmar(g.saldo === 30000 && g.pagos[0].monto === 30000 && g.pagos[0].pago.transferencia === 30000, "editar pago: saldo 30.000 y pasa a transferencia");

// No deja pagar de más.
await p.click("#contenidoClienteDetalle .filaPagoCliente .btnEditar");
await p.fill("#montoEditarPago", "999999");
await p.click("#guardarPagoEditado");
afirmar((await cli("Gerardo O'Brien")).pagos[0].monto === 30000, "no deja editar un pago por más de lo que se debía");
await p.keyboard.press("Escape");

// Eliminar el pago.
await p.click("#contenidoClienteDetalle .filaPagoCliente .btnBorrar");
await aceptarConfirmacion(p);
g = await cli("Gerardo O'Brien");
afirmar(g.saldo === 60000 && g.pagos.length === 0, "eliminar pago: vuelve a deber 60.000");

// Pago total.
await p.click("#btnPagarCliente");
await p.waitForTimeout(180);
await p.fill("#montoPagoCliente", "60000");
await p.click("#guardarPagoCliente");
afirmar((await cli("Gerardo O'Brien")).saldo === 0 && (await ventas()).find(x => x.metodoPago === "debe").pagada === true, "pago total: venta saldada");
await p.click("#btnVolverClientes");

// Cliente con deuda anterior cargada a mano (sin venta).
const idMarta = (await cli("Marta")).id;
await p.click(`button[onclick="verDetalleCliente('${idMarta}')"]`);
await p.click("#btnPagarCliente");
await p.waitForTimeout(180);
await p.fill("#montoPagoCliente", "2000");
await p.click("#guardarPagoCliente");
afirmar((await cli("Marta")).saldo === 3000, "se puede cobrar una deuda anterior sin venta asociada");
await p.click("#btnVolverClientes");

console.log("— Administrador edita y elimina ventas");
await p.click("#Historial");
const idVentaEfectivo = (await ventas()).find(x => x.numero === 1).id;
await p.click(`button[onclick="editarVenta('${idVentaEfectivo}')"]`);
await visible(p, "#modalEditarVenta");
// maíz de 2 a 5 bolsas, y precio a 21000.
const filaMaiz = p.locator("#itemsEditarVenta tr").nth(0);
await filaMaiz.locator("input").nth(0).fill("5");
await filaMaiz.locator("input").nth(0).dispatchEvent("change");
await p.locator("#itemsEditarVenta tr").nth(0).locator("input").nth(1).fill("21000");
await p.locator("#itemsEditarVenta tr").nth(0).locator("input").nth(1).dispatchEvent("change");
// quitar la avena y agregar 1 bolsa de alimento.
await p.locator("#itemsEditarVenta tr").nth(1).locator(".btnBorrar").click();
await p.selectOption("#productoAgregarEditarVenta", { label: "Alimento <b>Perro</b> \"Top\" 'x'" });
await p.fill("#cantidadAgregarEditarVenta", "1");
await p.click("#btnAgregarItemEditarVenta");
await p.selectOption("#metodoEditarVenta", "transferencia");
await p.click("#guardarVentaEditada");
let ve = (await ventas()).find(x => x.id === idVentaEfectivo);
afirmar(ve.total === 135000 && ve.pago.transferencia === 135000 && ve.pago.efectivo === 0 && ve.editada, "venta editada: total 135.000 por transferencia");
afirmar((await prod("MAIZ X 40KG")).stock === 42, "stock de maíz ajustado (50 − 5 − 3)");
afirmar((await prod("AVENA")).stock === 28.6, "la avena quitada vuelve al stock");
afirmar((await prod("Alimento <b>Perro</b> \"Top\" 'x'")).stock === 8, "el producto agregado descuenta stock");

// Pasarla a fiado de Marta.
await p.click(`button[onclick="editarVenta('${idVentaEfectivo}')"]`);
await p.selectOption("#clienteEditarVenta", { label: "Marta" });
await p.selectOption("#metodoEditarVenta", "debe");
await p.click("#guardarVentaEditada");
afirmar((await cli("Marta")).saldo === 138000, "venta pasada a fiado: suma al saldo del cliente");

// Eliminar esa venta: devuelve stock y saldo.
await p.click(`button[onclick="eliminarVentaHistorial('${idVentaEfectivo}')"]`);
await aceptarConfirmacion(p);
afirmar((await ventas()).length === 4, "venta eliminada");
afirmar((await prod("MAIZ X 40KG")).stock === 47 && (await prod("Alimento <b>Perro</b> \"Top\" 'x'")).stock === 9, "al eliminar se devuelve el stock");
afirmar((await cli("Marta")).saldo === 3000, "al eliminar se descuenta la deuda del cliente");

// Eliminar la venta fiada ya pagada de Gerardo: se van sus pagos.
const idFiada = (await ventas()).find(x => x.metodoPago === "debe").id;
await p.click(`button[onclick="eliminarVentaHistorial('${idFiada}')"]`);
await aceptarConfirmacion(p);
afirmar((await cli("Gerardo O'Brien")).pagos.length === 0 && (await prod("MAIZ X 40KG")).stock === 50, "eliminar venta fiada: quita sus pagos y devuelve stock");

console.log("— Panel de eliminaciones: restaurar");
await p.click("#Eliminaciones");
afirmar((await estado(p, "eliminaciones.length")) === 3, "quedan 3 registros (pago y 2 ventas)");
const idElim = await estado(p, `eliminaciones.find(e => e.tipo === "Venta" && e.datos.id === ${JSON.stringify(idFiada)}).id`);
await p.click(`button[onclick="restaurarEliminacion('${idElim}')"]`);
await aceptarConfirmacion(p);
g = await cli("Gerardo O'Brien");
afirmar((await ventas()).some(x => x.id === idFiada) && g.pagos.length === 1 && g.saldo === 0, "venta restaurada con su pago");
afirmar((await prod("MAIZ X 40KG")).stock === 47, "al restaurar vuelve a descontar el stock");

console.log("— Productos y clientes: eliminar y restaurar");
await p.click("#Productos");
const idAvena = (await prod("AVENA")).id;
await p.click(`button[onclick="eliminarProducto('${idAvena}')"]`);
await aceptarConfirmacion(p);
afirmar(!(await prod("AVENA")), "producto eliminado");
await p.click("#Eliminaciones");
await p.click(`button[onclick^="restaurarEliminacion"] >> nth=0`);
await aceptarConfirmacion(p);
afirmar(!!(await prod("AVENA")), "producto restaurado");

console.log("— Gastos y Caja");
await p.click("#Gastos");
await p.click("#btnAgregarGasto");
await p.waitForTimeout(180);
await p.fill("#descripcionGasto", "Flete");
await p.fill("#montoGasto", "7000");
await p.click("#guardarGasto");
const idGasto = await estado(p, "gastos[0].id");
await p.click(`button[onclick="editarGasto('${idGasto}')"]`);
await p.fill("#montoGasto", "8000");
await p.click("#btnTransferenciaGasto");
await p.click("#guardarGasto");
afirmar(await estado(p, "gastos[0].monto === 8000 && gastos[0].pago.transferencia === 8000"), "gasto editado");

await p.click("#Reportes");
const caja = await estado(p, "(() => { const f = filtrosReporteActuales(); const c = calcularCaja(f.desde, f.hasta, f.empleado); return { tv: c.totalVentas, ef: c.dineroEfectivo, tr: c.dineroTransferencia, cob: c.totalCobrado, fiado: c.totalFiado, sep: c.separar, gan: c.ganancia }; })()");
// Ventas cobradas: mixta 30.000 + monto 5.000 (transf) + avena 10.000 (efectivo) = 45.000
afirmar(caja.tv === 45000, "Caja: ventas cobradas 45.000 (" + caja.tv + ")");
afirmar(caja.fiado === 60000 && caja.cob === 62000, "Caja: fiado 60.000 y cobros de deuda 62.000");
afirmar(caja.ef === 10000 + 10000 + 62000, "Caja: efectivo = ventas + cobros (" + caja.ef + ")");
afirmar(caja.tr === 20000 + 5000 - 8000, "Caja: transferencia = ventas − gasto (" + caja.tr + ")");
afirmar(caja.sep.length === 1 && caja.sep[0][0] === "Maíz" && caja.sep[0][1].monto === 33000, "Caja: Separar Maíz = 3 bolsas × 11.000");
afirmar(caja.gan === 15000, "Caja: ganancia estimada 3 × (20.000 − 15.000)");
afirmar(await estado(p, "document.getElementById('contenidoReporte').textContent.includes('Separar Maíz')"), "la tarjeta Separar Maíz se ve en pantalla");

await p.click("#Gastos");
await p.click(`button[onclick="eliminarGasto('${idGasto}')"]`);
await aceptarConfirmacion(p);
afirmar((await estado(p, "gastos.length")) === 0, "gasto eliminado");

console.log("— Proveedores");
await p.click("#Proveedores");
await p.click("#btnAgregarProveedor");
await p.waitForTimeout(180);
await p.fill("#nombreProveedor", "Molino Sur");
await p.selectOption("#diasPagoProveedor", "15");
await p.click("#guardarProveedor");
const idProv = await estado(p, "proveedores[0].id");
await p.click(`button[onclick="verDetalleProveedor('${idProv}')"]`);
await p.click("#btnComprarProveedor");
await p.waitForTimeout(180);
await p.fill("#descripcionCompraProveedor", "Maíz 100 bolsas");
await p.fill("#montoCompraProveedor", "1000000");
await p.click("#guardarCompraProveedor");
await p.click("#btnPagarProveedor");
await p.waitForTimeout(180);
await p.fill("#montoPagoProveedor", "400000");
await p.click("#guardarPagoProveedor");
afirmar(await estado(p, "proveedores[0].compras[0].saldoPendiente === 600000 && !!proveedores[0].compras[0].fechaVencimiento"), "compra con vencimiento y pago parcial");
await p.click("#historialComprasProveedor .btnEditar");
await p.fill("#montoCompraProveedor", "900000");
await p.click("#guardarCompraProveedor");
afirmar(await estado(p, "proveedores[0].compras[0].saldoPendiente === 500000"), "editar compra recalcula lo que se debe");
await p.click("#contenidoProveedorDetalle .filaPagoCliente .btnEditar");
await p.fill("#montoEditarPago", "450000");
await p.click("#guardarPagoEditado");
afirmar(await estado(p, "proveedores[0].compras[0].saldoPendiente === 450000"), "editar pago a proveedor");
await p.click("#contenidoProveedorDetalle .filaPagoCliente .btnBorrar");
await aceptarConfirmacion(p);
afirmar(await estado(p, "proveedores[0].compras[0].saldoPendiente === 900000 && proveedores[0].pagos.length === 0"), "eliminar pago a proveedor");
await p.click("#historialComprasProveedor .btnBorrar");
await aceptarConfirmacion(p);
afirmar(await estado(p, "proveedores[0].compras.length === 0"), "eliminar compra");
await p.click("#btnVolverProveedores");

console.log("— Mezclas");
await crearProducto(p, { nombre: "MEZCLA CABALLO", categoria: "Mezclas", peso: 30, precioBolsa: 25000, precioKg: 900, stock: 0 });
await p.click("#Mezclas");
await p.click("#btnAgregarMezcla");
await p.waitForTimeout(180);
await p.fill("#nombreMezcla", "Mezcla de Caballo");
await p.fill("#buscadorSalidaMezcla .inputBuscarProductoMezcla", "MEZCLA");
await p.locator("#buscadorSalidaMezcla .sugerenciaProductoMezcla").first().dispatchEvent("mousedown");
await p.fill("#bolsasPorLoteMezcla", "10");
await p.fill("#listaIngredientesMezcla .inputBuscarProductoMezcla", "MAIZ");
await p.locator("#listaIngredientesMezcla .sugerenciaProductoMezcla").first().dispatchEvent("mousedown");
await p.fill("#listaIngredientesMezcla .inputCantidadIngrediente", "4");
await p.click("#guardarMezcla");
const idMezcla = await estado(p, "mezclas[0].id");
await p.click(`button[onclick="verDetalleMezcla('${idMezcla}')"]`);
await p.click("#btnProducirMezcla");
await p.fill("#cantidadProduccionMezcla", "5");
await p.click("#guardarProduccionMezcla");
afirmar((await prod("MAIZ X 40KG")).stock === 45 && (await prod("MEZCLA CABALLO")).stock === 5, "producción: descuenta 2 de maíz y suma 5 de mezcla");
await p.click("#contenidoMezclaDetalle .accionesVenta .btnBorrar");
await aceptarConfirmacion(p);
afirmar((await prod("MAIZ X 40KG")).stock === 47 && (await prod("MEZCLA CABALLO")).stock === 0, "anular producción devuelve el stock");
await p.click("#btnVolverMezclas");

console.log("— Usuarios y permisos");
await p.click("#Configuracion");
await p.click("#btnNuevoUsuarioAdmin");
await p.waitForTimeout(180);
await p.fill("#nombreUsuarioNuevo", "Pedro");
await p.fill("#loginUsuarioNuevo", "Pedro");
await p.fill("#passwordUsuarioNuevo", "clave123");
await p.click("#guardarUsuarioAdmin");
afirmar(await estado(p, "usuarios.some(u => u.usuario === 'pedro' && u.hash && !u.password)"), "usuario creado en minúsculas y con contraseña cifrada");
// Sacarle a los empleados el permiso de eliminar ventas.
await p.uncheck('.chkPermiso[data-permiso="eliminarVentas"]');
await p.click("#guardarPermisos");
await p.click("#btnCerrarSesion");
await ingresar(p, "PEDRO", "mala");
afirmar((await estado(p, "document.getElementById('loginError').textContent")).includes("incorrectos"), "contraseña incorrecta rechazada");
await ingresar(p, "PEDRO", "clave123");
await visible(p, "#appPrincipal");
afirmar(await estado(p, "getComputedStyle(document.getElementById('Eliminaciones')).display === 'none'"), "el empleado no ve Eliminaciones");
await p.click("#Historial");
afirmar(await estado(p, "!document.querySelector('#listaHistorialVentas .btnEditar') && !document.querySelector('#listaHistorialVentas .btnBorrar')"), "el empleado no puede editar ni eliminar ventas");
afirmar(await estado(p, "!!document.querySelector('#listaHistorialVentas .btnVer')"), "…pero sí imprimir el comprobante");
await p.click("#Configuracion");
afirmar(await estado(p, "!document.getElementById('btnExportarDatos') && !document.getElementById('guardarNegocio')"), "el empleado no ve las opciones del administrador");
await p.click("#Reportes");
afirmar(await estado(p, "!document.getElementById('empleadoReporte')"), "el empleado ve solo su propia caja");
await vender(p, [{ buscar: "maiz", cantidad: 1 }]);
afirmar(await estado(p, "historialVentas[0].vendedor.nombre === 'Pedro' && historialVentas[0].numero === 6"), "la venta queda a nombre del empleado, N.º 6");
// Intento directo de usar funciones de administrador.
await p.evaluate("editarVenta(historialVentas[0].id); eliminarVentaHistorial(historialVentas[0].id); restaurarEliminacion((eliminaciones[0]||{}).id)");
afirmar(await estado(p, "document.getElementById('modalEditarVenta').classList.contains('oculto') && document.getElementById('modalConfirmacion').classList.contains('oculto')"), "las funciones de administrador están bloqueadas para el empleado");

console.log("— Recarga: todo sigue ahí");
await p.reload();
await visible(p, "#appPrincipal");
afirmar(await estado(p, "usuarioActual.usuario === 'pedro' && historialVentas.length === 5 && productos.length === 4"), "después de recargar siguen la sesión y los datos");
afirmar(await estado(p, "document.querySelector('.sidebar .logo').textContent === 'Forrajería <Prueba> & Cía'"), "el nombre del negocio sigue");

await p.screenshot({ path: process.argv[2] || "/tmp/flujo.png" });

if(errores.length){ console.log("ERRORES DE CONSOLA:", errores); process.exitCode = 1; }
else console.log("\nTODO OK (flujo local)");

}catch(e){
    console.error("\n" + e.message);
    console.log("errores de consola:", errores);
    console.log("estado:", await p.evaluate("JSON.stringify({ productos: productos.map(x => [x.nombre, x.stock]), ventas: historialVentas.length, carrito, usuario: usuarioActual && usuarioActual.usuario, visible: ['pantallaInicio','pantallaLogin','pantallaPrimerAdmin'].map(i => document.getElementById(i).style.display) })").catch(e => "sin estado: " + e.message));
    await p.screenshot({ path: "/tmp/claude-0/-home-user/21bf5f1a-2f08-53d6-be1a-dbc154331d08/scratchpad/fallo.png" }).catch(() => {});
    process.exitCode = 1;
}
await nav.close();
