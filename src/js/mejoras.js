/* ==========================================
   MEJORAS 1.1.3
   ------------------------------------------
   Funciones que se suman a la 1.0.20 sin
   cambiar su diseño ni dónde se guardan los
   datos (las ventas siguen en forralitasVentas).

   - Administrador: editar/eliminar pagos de
     clientes, compras y pagos a proveedores,
     anular producciones de mezclas, restaurar
     lo eliminado y limpiar el panel.
   - Eliminar una venta también descuenta lo
     que el cliente debía de esa venta.
   - Ficha del cliente: total comprado, estado
     de cuenta imprimible, editar datos y
     acciones sobre cada venta.
   - Filtros: historial por forma de pago (con
     totales), clientes que deben, productos con
     poco stock.
   - Exportar a Excel: ventas, gastos, productos
     y caja.
   - Copia de seguridad con todas las tablas.
   - Precios especiales: si un precio especial
     quedó en $0 se usa el de lista, y al elegir
     el cliente después de cargar productos se
     aplican sus precios.

   La editora de ventas está en editarVenta.js.
   Los estilos nuevos están en mejoras.css (no
   se cambió ningún estilo existente).
========================================== */

/* ==========================================
   UTILIDADES
========================================== */

function mjEsc(valor){

    return String(valor === null || valor === undefined ? "" : valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}

function mjNum(id){

    const el = document.getElementById(id);

    return el ? (Number(String(el.value).replace(",", ".")) || 0) : 0;

}

function mjRed(n, decimales = 2){

    const f = Math.pow(10, decimales);

    return Math.round((Number(n) || 0) * f) / f;

}

function mjFechaInput(fecha){

    const d = new Date(fecha);

    if(isNaN(d.getTime())) return "";

    return fechaLocalISO(d) + "T"
        + String(d.getHours()).padStart(2, "0") + ":"
        + String(d.getMinutes()).padStart(2, "0");

}

function mjFechaTextoISO(iso){

    const p = String(iso || "").slice(0, 10).split("-");

    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : "—";

}

function mjSoloAdmin(){

    if(esAdmin()) return true;

    notificacion("Solo el administrador puede hacer esto.", "warning");

    return false;

}

function mjPantallaVisible(id){

    const el = document.getElementById(id);

    return !!el && !el.classList.contains("oculto");

}

function mjDescargar(nombre, contenido, tipo){

    const blob = new Blob([contenido], { type: tipo || "text/plain;charset=utf-8" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = nombre;

    document.body.appendChild(a);

    a.click();

    a.remove();

    setTimeout(()=> URL.revokeObjectURL(url), 2000);

}

/* CSV que Excel abre directo (separador ; y acentos bien). */
function mjCSV(filas){

    const celda = (v) =>{

        let texto = v === null || v === undefined ? "" : String(v);

        if(typeof v === "number") texto = String(v).replace(".", ",");

        if(/[";\n\r]/.test(texto)) texto = '"' + texto.replace(/"/g, '""') + '"';

        return texto;

    };

    return "﻿" + filas.map(f => f.map(celda).join(";")).join("\r\n");

}

function mjExportarCSV(nombreBase, filas){

    mjDescargar(nombreBase + "_" + fechaLocalISO(new Date()) + ".csv", mjCSV(filas), "text/csv;charset=utf-8");

}

/* Imprime solo el contenido indicado (estado de cuenta, caja). */
function mjImprimir(html){

    let zona = document.getElementById("mjZonaImpresion");

    if(!zona){

        zona = document.createElement("div");

        zona.id = "mjZonaImpresion";

        document.body.appendChild(zona);

    }

    zona.innerHTML = html;

    document.body.classList.add("mjImprimiendo");

    const terminar = ()=>{

        document.body.classList.remove("mjImprimiendo");

        zona.innerHTML = "";

        window.removeEventListener("afterprint", terminar);

    };

    window.addEventListener("afterprint", terminar);

    setTimeout(()=> window.print(), 50);

}

/* Crea (una sola vez) una ventana con los estilos de la app. Va antes
   del cuadro de confirmación, para que ese aviso quede por encima. */
function mjModal(id, html){

    let div = document.getElementById(id);

    if(!div){

        div = document.createElement("div");

        div.id = id;
        div.className = "modal oculto";

        const confirmacion = document.getElementById("modalConfirmacion");

        if(confirmacion && confirmacion.parentNode === document.body) document.body.insertBefore(div, confirmacion);
        else document.body.appendChild(div);

    }

    div.innerHTML = `<div class="modalContenido modalPequeño">${html}</div>`;

    return div;

}

/* Los pagos guardados por versiones anteriores no tienen identificador:
   se les asigna uno (siempre el mismo para el mismo pago, en todas las
   PCs) para poder editarlos o eliminarlos. */
function mjAsegurarIdsPagos(lista, prefijo){

    let cambios = false;

    const usados = new Set((lista || []).filter(p => p.id).map(p => p.id));

    (lista || []).forEach(p =>{

        if(p.id) return;

        const base = prefijo + (Date.parse(p.fecha) || 0)
            + "_" + String(p.ventaId || p.compraId || "x")
            + "_" + Math.round(Number(p.monto) || 0);

        let id = base;
        let n = 1;

        while(usados.has(id)){ n++; id = base + "_" + n; }

        p.id = id;

        usados.add(id);

        cambios = true;

    });

    return cambios;

}

/* ==========================================
   VENTAS: PRECIOS ESPECIALES
========================================== */

/* Al elegir (o quitar) el cliente con productos ya cargados, cada
   producto pasa a tener el precio que le corresponde a ese cliente. */
function mjRecalcularCarritoConPrecios(){

    if(typeof carrito === "undefined" || !carrito.length) return;

    let cambio = false;

    carrito.forEach(item =>{

        const producto = productos.find(p => p.id === item.id);

        if(!producto) return;

        const linea = calcularLineaVenta(producto, Number(item.cantidad || 0), item.modo);

        // En modo $ el monto no cambia, pero sí los kilos: se ajusta el stock.
        const diferencia = mjRed(Number(linea.bolsas || 0) - Number(item.bolsas || 0), 4);

        if(diferencia !== 0) producto.stock = mjRed(Number(producto.stock || 0) - diferencia, 4);

        if(linea.precio !== item.precio || linea.subtotal !== item.subtotal || diferencia !== 0){

            item.precio = linea.precio;
            item.subtotal = linea.subtotal;
            item.bolsas = linea.bolsas;
            item.kg = linea.kg;

            cambio = true;

        }

    });

    if(cambio){

        guardarDatos("productos", "carrito");

        actualizarTablaVenta();

        notificacion("Se aplicaron los precios del cliente a los productos cargados.");

    }

}

/* ==========================================
   ELIMINAR UNA VENTA: DEUDA Y PAGOS DEL CLIENTE
   (lo llama eliminarVentaHistorial). Devuelve
   lo que hace falta para poder restaurarla.
========================================== */

function mjQuitarDeudaDeVenta(venta){

    const resultado = { saldoDescontado: 0, pagosEliminados: [] };

    const cliente = venta && venta.cliente ? clientes.find(c => c.id === venta.cliente.id) : null;

    if(!cliente) return resultado;

    if(venta.metodoPago === "debe"){

        const pendiente = pendienteVenta(venta);

        if(pendiente > 0.01){

            cliente.saldo = mjRed(Math.max(0, Number(cliente.saldo || 0) - pendiente));

            resultado.saldoDescontado = pendiente;

        }

    }

    const pagos = (cliente.pagos || []).filter(p => p.ventaId === venta.id);

    if(pagos.length){

        resultado.pagosEliminados = JSON.parse(JSON.stringify(pagos));

        cliente.pagos = cliente.pagos.filter(p => p.ventaId !== venta.id);

    }

    return resultado;

}

function mjRefrescarClienteYProductos(){

    if(mjPantallaVisible("pantallaClienteDetalle") && typeof clienteDetalleActualId !== "undefined" && clienteDetalleActualId){

        renderClienteDetalle(clienteDetalleActualId);

    }

    if(paginaActual === "Productos" && typeof actualizarTablaProductos === "function") actualizarTablaProductos();

    if(paginaActual === "Clientes" && typeof actualizarTablaClientes === "function") actualizarTablaClientes();

}

/* ==========================================
   FICHA DEL CLIENTE
========================================== */

function mjTotalComprado(clienteId){

    return historialVentas
        .filter(v => v.cliente && v.cliente.id === clienteId)
        .reduce((acc, v) => acc + Number(v.total || 0), 0);

}

/* Botones de cada venta en la ficha del cliente. */
function mjAccionesVentaCliente(venta){

    return `
        <span class="mjAccionesVenta">
            <button class="mjBtnIcono" title="Imprimir una copia del ticket"
                onclick="imprimirTicketClienteVentaPorId('${mjEsc(venta.id)}')">🎫</button>
            ${esAdmin() ? `
                <button class="btnEditarVenta" title="Editar venta"
                    onclick="editarVenta('${mjEsc(venta.id)}')">✏️</button>
                <button class="btnEliminarVenta" title="Eliminar venta"
                    onclick="eliminarVentaHistorial('${mjEsc(venta.id)}')">🗑️</button>
            ` : ""}
        </span>
    `;

}

/* Botones de cada pago en la ficha del cliente (solo administrador). */
function mjAccionesPagoCliente(cliente, pago){

    if(!esAdmin() || !pago.id) return "";

    return `
        <div class="mjAccionesPago">
            <button class="btnEditarVenta" title="Editar pago"
                onclick="mjEditarPagoCliente('${mjEsc(cliente.id)}', '${mjEsc(pago.id)}')">✏️</button>
            <button class="btnEliminarVenta" title="Eliminar pago"
                onclick="mjEliminarPagoCliente('${mjEsc(cliente.id)}', '${mjEsc(pago.id)}')">🗑️</button>
        </div>
    `;

}

function mjTextoFormaPagoCliente(pago){

    if(pago.tipoPago === "transferencia") return "Transferencia";

    if(pago.tipoPago === "mixto"){

        return "Mixto (E: " + dinero((pago.pago && pago.pago.efectivo) || 0)
            + " · T: " + dinero((pago.pago && pago.pago.transferencia) || 0) + ")";

    }

    return "Efectivo";

}

/* ---------- Editar un pago de cliente ---------- */

let mjPagoEditando = null;

function mjEditarPagoCliente(clienteId, pagoId){

    if(!mjSoloAdmin()) return;

    const cliente = clientes.find(c => c.id === clienteId);

    const pago = cliente ? (cliente.pagos || []).find(p => p.id === pagoId) : null;

    if(!pago) return;

    mjPagoEditando = { clienteId, pagoId };

    const metodo = ["efectivo", "transferencia", "mixto"].includes(pago.tipoPago) ? pago.tipoPago : "efectivo";

    mjModal("mjModalPagoCliente", `
        <h2>Editar pago</h2>
        <p class="mjNota">
            ${pago.ventaFechaTexto ? "Aplicado a la venta del " + mjEsc(pago.ventaFechaTexto) : "Pago a cuenta"}
        </p>
        <div class="grupoInput">
            <label>Monto</label>
            <input id="mjPcMonto" type="text" inputmode="decimal" autocomplete="off" oninput="limpiarNumero(this)" value="${mjEsc(pago.monto)}">
        </div>
        <div class="grupoInput">
            <label>Fecha y hora</label>
            <input id="mjPcFecha" type="datetime-local" value="${mjEsc(mjFechaInput(pago.fecha))}">
        </div>
        <div class="grupoInput">
            <label>Método de pago</label>
            <select id="mjPcMetodo">
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="mixto">Mixto</option>
            </select>
        </div>
        <div class="grupoInput oculto" id="mjPcMixto">
            <label>Efectivo / Transferencia</label>
            <div class="mjDosCampos">
                <input id="mjPcEfectivo" type="text" inputmode="decimal" autocomplete="off" placeholder="Efectivo" oninput="limpiarNumero(this)" value="${mjEsc((pago.pago && pago.pago.efectivo) || "")}">
                <input id="mjPcTransferencia" type="text" inputmode="decimal" autocomplete="off" placeholder="Transferencia" oninput="limpiarNumero(this)" value="${mjEsc((pago.pago && pago.pago.transferencia) || "")}">
            </div>
        </div>
        <div class="accionesModal">
            <button class="btnGuardar" onclick="mjGuardarPagoCliente()">Guardar</button>
            <button class="btnCancelar" onclick="cerrar('mjModalPagoCliente')">Cancelar</button>
        </div>
    `);

    const sel = document.getElementById("mjPcMetodo");

    sel.value = metodo;

    const alternar = () => document.getElementById("mjPcMixto").classList.toggle("oculto", sel.value !== "mixto");

    sel.onchange = alternar;

    alternar();

    abrir("mjModalPagoCliente");

}

function mjGuardarPagoCliente(){

    if(!mjSoloAdmin() || !mjPagoEditando) return;

    const cliente = clientes.find(c => c.id === mjPagoEditando.clienteId);

    const pago = cliente ? (cliente.pagos || []).find(p => p.id === mjPagoEditando.pagoId) : null;

    if(!pago) return;

    const monto = mjNum("mjPcMonto");

    if(monto <= 0){

        notificacion("Ingresá un monto válido.", "warning");

        return;

    }

    const fechaValor = document.getElementById("mjPcFecha").value;

    const fecha = fechaValor ? new Date(fechaValor) : null;

    if(fecha && isNaN(fecha.getTime())){

        notificacion("La fecha no es válida.", "warning");

        return;

    }

    const metodo = document.getElementById("mjPcMetodo").value;

    const desglose = { efectivo: 0, transferencia: 0 };

    if(metodo === "efectivo") desglose.efectivo = monto;

    if(metodo === "transferencia") desglose.transferencia = monto;

    if(metodo === "mixto"){

        desglose.efectivo = mjNum("mjPcEfectivo");
        desglose.transferencia = mjNum("mjPcTransferencia");

        if(Math.abs(desglose.efectivo + desglose.transferencia - monto) > 0.01){

            notificacion("Los montos del pago mixto deben sumar " + dinero(monto) + ".", "warning");

            return;

        }

    }

    const diferencia = mjRed(monto - Number(pago.monto || 0));

    const venta = pago.ventaId ? historialVentas.find(v => v.id === pago.ventaId) : null;

    if(venta && venta.metodoPago === "debe"){

        const pendiente = pendienteVenta(venta);

        if(diferencia > pendiente + 0.01){

            notificacion(
                "El pago no puede superar lo que se debía de esa venta: como máximo "
                + dinero(Number(pago.monto || 0) + pendiente) + ".",
                "warning"
            );

            return;

        }

        venta.saldoPendiente = mjRed(Math.max(0, pendiente - diferencia));
        venta.pagada = venta.saldoPendiente <= 0.01;

        pago.restanteVenta = venta.saldoPendiente;

    }

    cliente.saldo = mjRed(Math.max(0, Number(cliente.saldo || 0) - diferencia));

    pago.monto = monto;
    pago.tipoPago = metodo;
    pago.pago = desglose;

    if(fecha){

        pago.fecha = fecha.toISOString();
        pago.fechaTexto = fechaHoraTexto(fecha);

    }

    guardarDatos("clientes", "historialVentas");

    cerrar("mjModalPagoCliente");

    mjPagoEditando = null;

    renderClienteDetalle(cliente.id);

    notificacion("Pago actualizado.");

}

function mjEliminarPagoCliente(clienteId, pagoId){

    if(!mjSoloAdmin()) return;

    const cliente = clientes.find(c => c.id === clienteId);

    const pago = cliente ? (cliente.pagos || []).find(p => p.id === pagoId) : null;

    if(!pago) return;

    confirmar(
        "¿Eliminar el pago de " + dinero(pago.monto) + " del " + pago.fechaTexto
        + "? Esa plata vuelve a figurar como deuda del cliente.",
        ()=>{

            const venta = pago.ventaId ? historialVentas.find(v => v.id === pago.ventaId) : null;

            if(venta && venta.metodoPago === "debe"){

                venta.saldoPendiente = mjRed(Math.min(Number(venta.total || 0), pendienteVenta(venta) + Number(pago.monto || 0)));
                venta.pagada = venta.saldoPendiente <= 0.01;

            }

            cliente.saldo = mjRed(Number(cliente.saldo || 0) + Number(pago.monto || 0));

            cliente.pagos = cliente.pagos.filter(p => p.id !== pagoId);

            registrarEliminacion(
                "Pago de cliente",
                "Pago de " + cliente.nombre + " · " + dinero(pago.monto) + " · " + pago.fechaTexto,
                { clienteId: cliente.id, pago }
            );

            guardarDatos("clientes", "historialVentas");

            renderClienteDetalle(cliente.id);

            notificacion("Pago eliminado.", "error");

        }
    );

}

/* ---------- Estado de cuenta imprimible ---------- */

function mjEstadoCuentaCliente(clienteId){

    const cliente = clientes.find(c => c.id === clienteId);

    if(!cliente) return;

    const negocio = typeof datosNegocio === "function" ? (datosNegocio() || {}) : {};

    const nombreNeg = typeof nombreNegocio === "function" ? nombreNegocio() : (negocio.nombre || "");

    const pendientes = historialVentas
        .filter(v => v.cliente && v.cliente.id === clienteId && v.metodoPago === "debe" && pendienteVenta(v) > 0.01)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const porVentas = pendientes.reduce((acc, v) => acc + pendienteVenta(v), 0);

    const anterior = mjRed(Number(cliente.saldo || 0) - porVentas);

    const filasVentas = pendientes.map(v => `
        <tr>
            <td>${mjEsc(v.fechaTexto)}</td>
            <td>${(v.productos || []).map(i => mjEsc(formatearCantidadItem(i) + " " + unidadVenta(i.modo).toLowerCase() + " " + i.nombre)).join("<br>")}</td>
            <td class="mjDerecha">${dinero(v.total)}</td>
            <td class="mjDerecha"><strong>${dinero(pendienteVenta(v))}</strong></td>
        </tr>
    `).join("");

    const pagos = [...(cliente.pagos || [])]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 15);

    const filasPagos = pagos.map(p => `
        <tr>
            <td>${mjEsc(p.fechaTexto)}</td>
            <td>${mjEsc(mjTextoFormaPagoCliente(p))}</td>
            <td class="mjDerecha">${dinero(p.monto)}</td>
        </tr>
    `).join("");

    mjImprimir(`
        <div class="mjHoja">
            <h1>${mjEsc(nombreNeg)}</h1>
            <h2>Estado de cuenta — ${mjEsc(cliente.nombre)}</h2>
            <p>Fecha: ${mjEsc(fechaHoraTexto(new Date()))}</p>
            <h3>Ventas pendientes de pago</h3>
            ${pendientes.length ? `
                <table>
                    <thead><tr><th>Fecha</th><th>Detalle</th><th class="mjDerecha">Total</th><th class="mjDerecha">Debe</th></tr></thead>
                    <tbody>${filasVentas}</tbody>
                </table>
            ` : "<p>No tiene ventas pendientes.</p>"}
            ${anterior > 0.01 ? `<p>Saldo anterior (sin venta asociada): <strong>${dinero(anterior)}</strong></p>` : ""}
            <p class="mjTotalHoja">SALDO TOTAL: ${dinero(cliente.saldo || 0)}</p>
            ${pagos.length ? `
                <h3>Últimos pagos</h3>
                <table>
                    <thead><tr><th>Fecha</th><th>Forma de pago</th><th class="mjDerecha">Monto</th></tr></thead>
                    <tbody>${filasPagos}</tbody>
                </table>
            ` : ""}
        </div>
    `);

}

/* ==========================================
   PROVEEDORES: EDITAR / ELIMINAR COMPRAS Y PAGOS
========================================== */

function mjVencimientoCompra(fechaISO, diasPago){

    if(!diasPago) return { fechaVencimiento: null, fechaVencimientoTexto: null };

    const d = new Date(fechaISO + "T00:00:00");

    d.setDate(d.getDate() + Number(diasPago));

    const iso = fechaLocalISO(d);

    return { fechaVencimiento: iso, fechaVencimientoTexto: d.toLocaleDateString("es-AR") };

}

function mjAccionesCompra(proveedor, compra){

    if(!esAdmin()) return "";

    return `
        <span class="mjAccionesVenta">
            <button class="btnEditarVenta" title="Editar compra"
                onclick="mjEditarCompra('${mjEsc(proveedor.id)}', '${mjEsc(compra.id)}')">✏️</button>
            <button class="btnEliminarVenta" title="Eliminar compra"
                onclick="mjEliminarCompra('${mjEsc(proveedor.id)}', '${mjEsc(compra.id)}')">🗑️</button>
        </span>
    `;

}

function mjAccionesPagoProveedor(proveedor, pago){

    if(!esAdmin() || !pago.id) return "";

    return `
        <div class="mjAccionesPago">
            <button class="btnEditarVenta" title="Editar pago"
                onclick="mjEditarPagoProveedor('${mjEsc(proveedor.id)}', '${mjEsc(pago.id)}')">✏️</button>
            <button class="btnEliminarVenta" title="Eliminar pago"
                onclick="mjEliminarPagoProveedor('${mjEsc(proveedor.id)}', '${mjEsc(pago.id)}')">🗑️</button>
        </div>
    `;

}

let mjCompraEditando = null;

function mjEditarCompra(proveedorId, compraId){

    if(!mjSoloAdmin()) return;

    const proveedor = proveedores.find(p => p.id === proveedorId);

    const compra = proveedor ? (proveedor.compras || []).find(c => c.id === compraId) : null;

    if(!compra) return;

    mjCompraEditando = { proveedorId, compraId };

    mjModal("mjModalCompra", `
        <h2>Editar compra</h2>
        <div class="grupoInput">
            <label>Qué le compramos</label>
            <input id="mjCoDescripcion" type="text" value="${mjEsc(compra.descripcion)}">
        </div>
        <div class="grupoInput">
            <label>Monto</label>
            <input id="mjCoMonto" type="text" inputmode="decimal" autocomplete="off" oninput="limpiarNumero(this)" value="${mjEsc(compra.monto)}">
        </div>
        <div class="grupoInput">
            <label>Fecha de la compra</label>
            <input id="mjCoFecha" type="date" value="${mjEsc(String(compra.fecha || "").slice(0, 10))}">
        </div>
        <div class="accionesModal">
            <button class="btnGuardar" onclick="mjGuardarCompra()">Guardar</button>
            <button class="btnCancelar" onclick="cerrar('mjModalCompra')">Cancelar</button>
        </div>
    `);

    abrir("mjModalCompra");

}

function mjGuardarCompra(){

    if(!mjSoloAdmin() || !mjCompraEditando) return;

    const proveedor = proveedores.find(p => p.id === mjCompraEditando.proveedorId);

    const compra = proveedor ? (proveedor.compras || []).find(c => c.id === mjCompraEditando.compraId) : null;

    if(!compra) return;

    const descripcion = document.getElementById("mjCoDescripcion").value.trim();

    const monto = mjNum("mjCoMonto");

    const fecha = document.getElementById("mjCoFecha").value || String(compra.fecha || "").slice(0, 10);

    if(!descripcion){

        notificacion("Describí qué le compramos.", "warning");

        return;

    }

    if(monto <= 0){

        notificacion("Ingresá un monto válido.", "warning");

        return;

    }

    const pagado = mjRed(Number(compra.monto || 0) - Number(compra.saldoPendiente || 0));

    if(monto < pagado - 0.01){

        notificacion("De esa compra ya se pagaron " + dinero(pagado) + ": el monto no puede ser menor.", "warning");

        return;

    }

    compra.descripcion = descripcion;
    compra.monto = monto;
    compra.fecha = fecha;
    compra.fechaTexto = new Date(fecha + "T00:00:00").toLocaleDateString("es-AR");
    compra.saldoPendiente = mjRed(Math.max(0, monto - pagado));
    compra.pagada = compra.saldoPendiente <= 0.01;

    Object.assign(compra, mjVencimientoCompra(fecha, proveedor.diasPago));

    (proveedor.pagos || []).forEach(p =>{

        if(p.compraId === compra.id) p.compraDescripcion = descripcion;

    });

    guardarDatos("proveedores");

    cerrar("mjModalCompra");

    mjCompraEditando = null;

    renderProveedorDetalle(proveedor.id);

    notificacion("Compra actualizada.");

}

function mjEliminarCompra(proveedorId, compraId){

    if(!mjSoloAdmin()) return;

    const proveedor = proveedores.find(p => p.id === proveedorId);

    const compra = proveedor ? (proveedor.compras || []).find(c => c.id === compraId) : null;

    if(!compra) return;

    const pagos = (proveedor.pagos || []).filter(p => p.compraId === compraId);

    confirmar(
        "¿Eliminar la compra \"" + compra.descripcion + "\" por " + dinero(compra.monto) + "?"
        + (pagos.length ? " También se quitan los " + pagos.length + " pago(s) que tenía aplicados." : ""),
        ()=>{

            proveedor.compras = proveedor.compras.filter(c => c.id !== compraId);

            proveedor.pagos = (proveedor.pagos || []).filter(p => p.compraId !== compraId);

            registrarEliminacion(
                "Compra a proveedor",
                "Compra a " + proveedor.nombre + " · " + compra.descripcion + " · " + dinero(compra.monto),
                { proveedorId: proveedor.id, compra, pagos }
            );

            guardarDatos("proveedores");

            renderProveedorDetalle(proveedor.id);

            notificacion("Compra eliminada.", "error");

        }
    );

}

let mjPagoProveedorEditando = null;

function mjEditarPagoProveedor(proveedorId, pagoId){

    if(!mjSoloAdmin()) return;

    const proveedor = proveedores.find(p => p.id === proveedorId);

    const pago = proveedor ? (proveedor.pagos || []).find(p => p.id === pagoId) : null;

    if(!pago) return;

    mjPagoProveedorEditando = { proveedorId, pagoId };

    mjModal("mjModalPagoProveedor", `
        <h2>Editar pago</h2>
        <p class="mjNota">Aplicado a: ${mjEsc(pago.compraDescripcion || "—")}</p>
        <div class="grupoInput">
            <label>Monto</label>
            <input id="mjPpMonto" type="text" inputmode="decimal" autocomplete="off" oninput="limpiarNumero(this)" value="${mjEsc(pago.monto)}">
        </div>
        <div class="grupoInput">
            <label>Fecha y hora</label>
            <input id="mjPpFecha" type="datetime-local" value="${mjEsc(mjFechaInput(pago.fecha))}">
        </div>
        <div class="accionesModal">
            <button class="btnGuardar" onclick="mjGuardarPagoProveedor()">Guardar</button>
            <button class="btnCancelar" onclick="cerrar('mjModalPagoProveedor')">Cancelar</button>
        </div>
    `);

    abrir("mjModalPagoProveedor");

}

function mjGuardarPagoProveedor(){

    if(!mjSoloAdmin() || !mjPagoProveedorEditando) return;

    const proveedor = proveedores.find(p => p.id === mjPagoProveedorEditando.proveedorId);

    const pago = proveedor ? (proveedor.pagos || []).find(p => p.id === mjPagoProveedorEditando.pagoId) : null;

    if(!pago) return;

    const monto = mjNum("mjPpMonto");

    if(monto <= 0){

        notificacion("Ingresá un monto válido.", "warning");

        return;

    }

    const fechaValor = document.getElementById("mjPpFecha").value;

    const fecha = fechaValor ? new Date(fechaValor) : null;

    const compra = (proveedor.compras || []).find(c => c.id === pago.compraId);

    const diferencia = mjRed(monto - Number(pago.monto || 0));

    if(compra){

        const pendiente = Number(compra.saldoPendiente || 0);

        if(diferencia > pendiente + 0.01){

            notificacion(
                "El pago no puede superar lo que se debía de esa compra: como máximo "
                + dinero(Number(pago.monto || 0) + pendiente) + ".",
                "warning"
            );

            return;

        }

        compra.saldoPendiente = mjRed(Math.max(0, pendiente - diferencia));
        compra.pagada = compra.saldoPendiente <= 0.01;

        pago.restanteCompra = compra.saldoPendiente;

    }

    pago.monto = monto;

    if(fecha && !isNaN(fecha.getTime())){

        pago.fecha = fecha.toISOString();
        pago.fechaTexto = fechaHoraTexto(fecha);

    }

    guardarDatos("proveedores");

    cerrar("mjModalPagoProveedor");

    mjPagoProveedorEditando = null;

    renderProveedorDetalle(proveedor.id);

    notificacion("Pago actualizado.");

}

function mjEliminarPagoProveedor(proveedorId, pagoId){

    if(!mjSoloAdmin()) return;

    const proveedor = proveedores.find(p => p.id === proveedorId);

    const pago = proveedor ? (proveedor.pagos || []).find(p => p.id === pagoId) : null;

    if(!pago) return;

    confirmar(
        "¿Eliminar el pago de " + dinero(pago.monto) + " del " + pago.fechaTexto
        + "? Esa plata vuelve a figurar como deuda con el proveedor.",
        ()=>{

            const compra = (proveedor.compras || []).find(c => c.id === pago.compraId);

            if(compra){

                compra.saldoPendiente = mjRed(Math.min(Number(compra.monto || 0), Number(compra.saldoPendiente || 0) + Number(pago.monto || 0)));
                compra.pagada = compra.saldoPendiente <= 0.01;

            }

            proveedor.pagos = proveedor.pagos.filter(p => p.id !== pagoId);

            registrarEliminacion(
                "Pago a proveedor",
                "Pago a " + proveedor.nombre + " · " + dinero(pago.monto) + " · " + pago.fechaTexto,
                { proveedorId: proveedor.id, pago }
            );

            guardarDatos("proveedores");

            renderProveedorDetalle(proveedor.id);

            notificacion("Pago eliminado.", "error");

        }
    );

}

/* ==========================================
   MEZCLAS: ANULAR UNA PRODUCCIÓN
========================================== */

function mjAccionesProduccion(mezcla, produccion){

    if(!esAdmin() || !produccion.id) return "";

    return `
        <span class="mjAccionesVenta">
            <button class="btnEliminarVenta" title="Anular esta producción (devuelve el stock)"
                onclick="mjAnularProduccion('${mjEsc(mezcla.id)}', '${mjEsc(produccion.id)}')">🗑️</button>
        </span>
    `;

}

/* Bolsas que descuenta cada ingrediente para "cantidad" bolsas producidas. */
function mjConsumoMezcla(mezcla, cantidad){

    const multiplicador = Number(cantidad || 0) / Number(mezcla.bolsasPorLote || 10);

    return (mezcla.ingredientes || []).map(ing =>{

        const producto = productos.find(p => p.id === ing.idProducto);

        const necesaria = Number(ing.cantidad || 0) * multiplicador;

        const bolsas = ing.unidad === "kg"
            ? (producto && Number(producto.pesoBolsa) > 0 ? necesaria / Number(producto.pesoBolsa) : 0)
            : necesaria;

        return { idProducto: ing.idProducto, bolsas: mjRed(bolsas, 4) };

    });

}

function mjAnularProduccion(mezclaId, produccionId){

    if(!mjSoloAdmin()) return;

    const mezcla = mezclas.find(m => m.id === mezclaId);

    const produccion = mezcla ? (mezcla.producciones || []).find(p => p.id === produccionId) : null;

    if(!produccion) return;

    const consumo = Array.isArray(produccion.consumo)
        ? produccion.consumo
        : mjConsumoMezcla(mezcla, produccion.cantidad);

    const salidaId = produccion.salidaId || (mezcla.productoSalida && mezcla.productoSalida.id);

    confirmar(
        "¿Anular la producción del " + produccion.fechaTexto + " (" + formatearStock(produccion.cantidad) + " bolsas)? "
        + "Se devuelve el stock de los ingredientes y se descuentan las bolsas producidas"
        + (Array.isArray(produccion.consumo) ? "." : " (calculado con la receta actual)."),
        ()=>{

            consumo.forEach(c =>{

                const producto = productos.find(p => p.id === c.idProducto);

                if(producto) producto.stock = mjRed(Number(producto.stock || 0) + Number(c.bolsas || 0), 4);

            });

            const salida = productos.find(p => p.id === salidaId);

            if(salida) salida.stock = mjRed(Number(salida.stock || 0) - Number(produccion.cantidad || 0), 4);

            mezcla.producciones = mezcla.producciones.filter(p => p.id !== produccionId);

            registrarEliminacion(
                "Producción de mezcla",
                "Producción de " + (mezcla.nombre || "") + " · " + formatearStock(produccion.cantidad) + " bolsas · " + produccion.fechaTexto,
                { mezclaId: mezcla.id, produccion }
            );

            guardarDatos("mezclas", "productos");

            renderMezclaDetalle(mezcla.id);

            notificacion("Producción anulada. Se devolvió el stock.", "error");

        }
    );

}

/* ==========================================
   PANEL DE ELIMINACIONES: RESTAURAR Y LIMPIAR
========================================== */

const MJ_TIPOS_RESTAURABLES = ["Venta", "Producto", "Cliente", "Proveedor", "Gasto", "Mezcla", "Anotación"];

function mjAccionesEliminacion(e){

    const restaurable = e.datos && MJ_TIPOS_RESTAURABLES.includes(e.tipo);

    return `
        <span class="mjAccionesVenta">
            ${restaurable ? `<button class="btnEditarVenta" title="Restaurar lo eliminado"
                onclick="mjRestaurarEliminacion('${mjEsc(e.id)}')">♻️</button>` : ""}
            <button class="btnEliminarVenta" title="Borrar este registro del panel"
                onclick="mjBorrarRegistroEliminacion('${mjEsc(e.id)}')">🗑️</button>
        </span>
    `;

}

function mjBarraEliminaciones(){

    if(!eliminaciones.length) return "";

    return `
        <div class="mjBarra">
            <span class="mjNota">Con ♻️ se vuelve a poner lo eliminado tal como estaba.</span>
            <button class="btnCancelar" onclick="mjVaciarEliminaciones()">Vaciar panel</button>
        </div>
    `;

}

function mjBorrarRegistroEliminacion(id){

    if(!mjSoloAdmin()) return;

    confirmar("¿Borrar este registro del panel? (No restaura ni cambia nada más).", ()=>{

        eliminaciones = eliminaciones.filter(e => e.id !== id);

        guardarDatos("eliminaciones");

        renderEliminaciones();

    });

}

function mjVaciarEliminaciones(){

    if(!mjSoloAdmin()) return;

    confirmar("¿Vaciar todo el panel de eliminaciones? Ya no se va a poder restaurar nada de lo que figura acá.", ()=>{

        eliminaciones = [];

        guardarDatos("eliminaciones");

        renderEliminaciones();

        notificacion("Panel vaciado.");

    });

}

function mjRestaurarEliminacion(id){

    if(!mjSoloAdmin()) return;

    const reg = eliminaciones.find(e => e.id === id);

    if(!reg || !reg.datos || !MJ_TIPOS_RESTAURABLES.includes(reg.tipo)) return;

    const d = JSON.parse(JSON.stringify(reg.datos));

    const listas = {
        "Producto": () => productos,
        "Cliente": () => clientes,
        "Proveedor": () => proveedores,
        "Gasto": () => gastos,
        "Mezcla": () => mezclas,
        "Anotación": () => carpetasNotas,
        "Venta": () => historialVentas
    };

    const tablas = {
        "Producto": ["productos"],
        "Cliente": ["clientes"],
        "Proveedor": ["proveedores"],
        "Gasto": ["gastos"],
        "Mezcla": ["mezclas"],
        "Anotación": ["carpetasNotas"],
        "Venta": ["historialVentas", "productos", "clientes"]
    };

    const lista = listas[reg.tipo]();

    if(d.id && lista.some(x => x.id === d.id)){

        notificacion("Ese registro ya existe: no hace falta restaurarlo.", "warning");

        return;

    }

    let aviso = "";

    if(reg.tipo === "Venta" && !d.stockDevuelto){

        aviso = " (Fue eliminada con una versión anterior: el stock y el saldo del cliente no se tocan, revisalos si hace falta).";

    }

    confirmar("¿Restaurar " + reg.detalle + "?" + aviso, ()=>{

        if(reg.tipo === "Venta"){

            const pagos = d.pagosEliminados || [];
            const saldo = Number(d.saldoDescontado || 0);
            const stockDevuelto = !!d.stockDevuelto;

            delete d.pagosEliminados;
            delete d.saldoDescontado;
            delete d.stockDevuelto;

            if(stockDevuelto){

                (d.productos || []).forEach(item =>{

                    const producto = productos.find(p => p.id === item.id);

                    if(producto) producto.stock = mjRed(Number(producto.stock || 0) - Number(item.bolsas || 0), 4);

                });

            }

            const cliente = d.cliente ? clientes.find(c => c.id === d.cliente.id) : null;

            if(cliente){

                if(saldo > 0) cliente.saldo = mjRed(Number(cliente.saldo || 0) + saldo);

                if(pagos.length){

                    if(!cliente.pagos) cliente.pagos = [];

                    pagos.forEach(p =>{

                        if(!cliente.pagos.some(x => x.id && x.id === p.id)) cliente.pagos.push(p);

                    });

                }

            }

            historialVentas.unshift(d);

        }else{

            if(!d.id) d.id = "R" + Date.now();

            if(reg.tipo === "Cliente" && Array.isArray(d.preciosEspeciales)){

                const precios = d.preciosEspeciales;

                delete d.preciosEspeciales;

                const todos = obtenerTodosPreciosCliente();

                precios.forEach(p =>{ if(!todos.some(x => x.id === p.id)) todos.push(p); });

                guardarTodosPreciosCliente(todos);

            }

            if(reg.tipo === "Mezcla" || reg.tipo === "Anotación") lista.unshift(d);
            else lista.push(d);

            if(reg.tipo === "Producto" && typeof ordenarProductosPorNombre === "function"){

                productos = ordenarProductosPorNombre(productos);

            }

        }

        eliminaciones = eliminaciones.filter(e => e.id !== id);

        guardarDatos(...tablas[reg.tipo], "eliminaciones");

        renderEliminaciones();

        notificacion("Restaurado correctamente.");

    });

}

/* ==========================================
   HISTORIAL: FILTRO POR FORMA DE PAGO, TOTALES
   Y EXPORTAR
========================================== */

let mjVentasHistorialFiltradas = [];

function mjBarraHistorial(){

    return `
        <div class="mjBarra" id="mjBarraHistorial">
            <div class="grupoInput mjFiltroPago">
                <label>Forma de pago</label>
                <select id="mjPagoHistorial" onchange="buscarHistorial()">
                    <option value="">Todas</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="mixto">Mixto</option>
                    <option value="debe">Fiado sin saldar</option>
                    <option value="fiado">Fiado (todas)</option>
                </select>
            </div>
            <div class="mjResumen" id="mjResumenHistorial"></div>
            <button class="btnCancelar" onclick="mjExportarVentas()">⬇ Exportar a Excel</button>
        </div>
    `;

}

function mjPendienteReal(venta){

    if(!venta || venta.metodoPago !== "debe") return 0;

    const p = pendienteVenta(venta);

    return p > 0.01 && venta.pagada !== true ? p : 0;

}

/* Lo llama renderListaHistorial con la lista ya filtrada. */
function mjFiltrarYResumirHistorial(ventas){

    const valor = document.getElementById("mjPagoHistorial")?.value || "";

    let lista = ventas;

    if(valor === "debe") lista = lista.filter(v => mjPendienteReal(v) > 0);
    else if(valor === "fiado") lista = lista.filter(v => v.metodoPago === "debe");
    else if(valor) lista = lista.filter(v => v.metodoPago === valor);

    mjVentasHistorialFiltradas = lista;

    const resumen = document.getElementById("mjResumenHistorial");

    if(resumen){

        const total = lista.reduce((acc, v) => acc + Number(v.total || 0), 0);

        const sinCobrar = lista.reduce((acc, v) => acc + mjPendienteReal(v), 0);

        resumen.innerHTML = `
            <span><strong>${lista.length}</strong> ventas</span>
            <span>Total: <strong>${dinero(total)}</strong></span>
            ${sinCobrar > 0 ? `<span>Sin cobrar: <strong class="saldoDeuda">${dinero(sinCobrar)}</strong></span>` : ""}
        `;

    }

    return lista;

}

function mjExportarVentas(){

    const ventas = mjVentasHistorialFiltradas;

    if(!ventas.length){

        notificacion("No hay ventas para exportar con esos filtros.", "warning");

        return;

    }

    const filas = [[
        "Fecha", "Cliente", "Vendedor", "Producto", "Cantidad", "Unidad", "Precio unitario",
        "Subtotal", "Total venta", "Pago", "Efectivo", "Transferencia", "Tarjeta", "Saldo pendiente"
    ]];

    ventas.forEach(v =>{

        (v.productos || []).forEach((item, i) =>{

            filas.push([
                v.fechaTexto,
                (v.cliente && v.cliente.nombre) || "Consumidor Final",
                (v.vendedor && v.vendedor.nombre) || "",
                item.nombre,
                Number(formatearCantidadItem(item)),
                unidadVenta(item.modo),
                Number(item.precio || 0),
                Number(item.subtotal || 0),
                i === 0 ? Number(v.total || 0) : "",
                i === 0 ? (v.metodoPago === "debe" ? "Fiado" : v.metodoPago) : "",
                i === 0 ? Number((v.pago && v.pago.efectivo) || 0) : "",
                i === 0 ? Number((v.pago && v.pago.transferencia) || 0) : "",
                i === 0 ? Number((v.pago && v.pago.tarjeta) || 0) : "",
                i === 0 ? mjPendienteReal(v) : ""
            ]);

        });

    });

    mjExportarCSV("Ventas", filas);

    notificacion("Ventas exportadas (" + ventas.length + ").");

}

/* ==========================================
   CLIENTES: SOLO LOS QUE DEBEN
========================================== */

function mjBarraClientes(){

    return `
        <div class="mjBarra">
            <label class="mjCheck">
                <input type="checkbox" id="mjSoloDeudores" onchange="actualizarTablaClientes()">
                Solo los que deben
            </label>
            <span class="mjResumen" id="mjResumenClientes"></span>
        </div>
    `;

}

/* Lo llama actualizarTablaClientes con la lista ya filtrada. */
function mjFiltrarClientes(lista){

    const solo = !!document.getElementById("mjSoloDeudores")?.checked;

    const resultado = solo ? lista.filter(c => Number(c.saldo || 0) > 0.01) : lista;

    const resumen = document.getElementById("mjResumenClientes");

    if(resumen){

        const deudores = clientes.filter(c => Number(c.saldo || 0) > 0.01);

        const total = deudores.reduce((acc, c) => acc + Number(c.saldo || 0), 0);

        resumen.innerHTML = `Por cobrar: <strong class="saldoDeuda">${dinero(total)}</strong> · ${deudores.length} cliente(s) con deuda`;

    }

    return resultado;

}

/* ==========================================
   PRODUCTOS: POCO STOCK Y EXPORTAR
========================================== */

function mjBarraProductos(){

    return `
        <div class="mjBarra">
            <label class="mjCheck">
                <input type="checkbox" id="mjSoloStockBajo" onchange="actualizarTablaProductos()">
                Solo con poco stock
            </label>
            <button class="btnCancelar" onclick="mjExportarProductos()">⬇ Exportar a Excel</button>
        </div>
    `;

}

function mjStockBajo(p){

    return Number(p.stock || 0) <= Number(p.stockMinimo || 0);

}

/* Lo llama actualizarTablaProductos con la lista ya filtrada. */
function mjFiltrarProductos(lista){

    return document.getElementById("mjSoloStockBajo")?.checked ? lista.filter(mjStockBajo) : lista;

}

function mjExportarProductos(){

    const busqueda = (typeof filtroProductos !== "undefined" ? filtroProductos : "") || "";

    let lista = !busqueda
        ? productos
        : productos.filter(p =>
            (p.nombre || "").toLowerCase().includes(busqueda)
            || (p.categoria || "").toLowerCase().includes(busqueda)
        );

    lista = mjFiltrarProductos(lista);

    const filas = [["Nombre", "Categoría", "Peso por bolsa (kg)", "Precio bolsa", "Precio kg", "Stock (bolsas)", "Stock mínimo"]];

    lista.forEach(p =>{

        filas.push([
            p.nombre,
            p.categoria || "",
            Number(p.pesoBolsa || 0),
            Number(p.precioBolsa || 0),
            Number(p.precioKg || 0),
            Number(p.stock || 0),
            Number(p.stockMinimo || 0)
        ]);

    });

    mjExportarCSV("Productos", filas);

    notificacion("Lista de productos exportada.");

}

/* ==========================================
   GASTOS: EXPORTAR
========================================== */

function mjBarraGastos(){

    return `
        <div class="mjBarra">
            <span class="mjResumen" id="mjResumenGastos"></span>
            <button class="btnCancelar" onclick="mjExportarGastos()">⬇ Exportar a Excel</button>
        </div>
    `;

}

function mjGastosFiltrados(){

    const desde = document.getElementById("fechaDesdeGasto")?.value || "";
    const hasta = document.getElementById("fechaHastaGasto")?.value || "";
    const texto = (document.getElementById("buscarTextoGasto")?.value || "").trim().toLowerCase();

    return [...gastos]
        .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")))
        .filter(g =>{

            const f = g.fecha || "";

            if(desde && f < desde) return false;

            if(hasta && f > hasta) return false;

            if(texto
                && !(g.descripcion || "").toLowerCase().includes(texto)
                && !(g.categoria || "").toLowerCase().includes(texto)) return false;

            return true;

        });

}

/* Lo llama actualizarTablaGastos al terminar de dibujar. */
function mjResumirGastos(){

    const resumen = document.getElementById("mjResumenGastos");

    if(!resumen) return;

    const lista = mjGastosFiltrados();

    const total = lista.reduce((acc, g) => acc + Number(g.monto || 0), 0);

    resumen.innerHTML = `<strong>${lista.length}</strong> gastos · Total: <strong class="saldoDeuda">${dinero(total)}</strong>`;

}

function mjExportarGastos(){

    const lista = mjGastosFiltrados();

    if(!lista.length){

        notificacion("No hay gastos para exportar con esos filtros.", "warning");

        return;

    }

    const filas = [["Fecha", "Descripción", "Categoría", "Pago", "Efectivo", "Transferencia", "Cargado por", "Monto"]];

    lista.forEach(g =>{

        const pago = g.pago || { efectivo: g.monto || 0, transferencia: 0 };

        filas.push([
            g.fechaTexto || mjFechaTextoISO(g.fecha),
            g.descripcion || "",
            g.categoria || "general",
            g.metodoPago || "efectivo",
            Number(pago.efectivo || 0),
            Number(pago.transferencia || 0),
            (g.vendedor && g.vendedor.nombre) || "",
            Number(g.monto || 0)
        ]);

    });

    mjExportarCSV("Gastos", filas);

    notificacion("Gastos exportados (" + lista.length + ").");

}

/* ==========================================
   CAJA: IMPRIMIR Y EXPORTAR
   Toma los números tal como los muestra la
   pantalla de Caja, así siempre coinciden.
========================================== */

function mjBarraCaja(){

    return `
        <div class="mjBarra mjBarraCaja">
            <button class="btnCancelar" onclick="mjImprimirCaja()">🖨️ Imprimir</button>
            <button class="btnCancelar" onclick="mjExportarCaja()">⬇ Exportar a Excel</button>
        </div>
    `;

}

function mjFilasCaja(){

    const cont = document.getElementById("contenidoReporte");

    if(!cont) return [];

    const filas = [];

    cont.querySelectorAll(".cardMetrica").forEach(card =>{

        const titulo = (card.querySelector("small")?.textContent || "").trim();

        const valor = (card.querySelector("h2")?.textContent || "").trim();

        const detalle = (card.querySelector(".subMetrica")?.textContent || "").trim();

        if(titulo) filas.push([titulo.replace(/^[^\wÁÉÍÓÚÑáéíóúñ$]+/u, ""), valor, detalle]);

    });

    cont.querySelectorAll(".ventaDashboard").forEach(fila =>{

        const titulo = (fila.querySelector("strong")?.textContent || "").trim();

        const detalle = (fila.querySelector("small")?.textContent || "").trim();

        const valor = (fila.querySelector("span")?.textContent || "").trim();

        if(titulo) filas.push([titulo, valor, detalle]);

    });

    return filas;

}

function mjPeriodoCaja(){

    const desde = document.getElementById("fechaDesdeReporte")?.value || "";

    const hasta = document.getElementById("fechaHastaReporte")?.value || "";

    if(desde && desde === hasta) return "Día " + mjFechaTextoISO(desde);

    return "Desde " + (desde ? mjFechaTextoISO(desde) : "el inicio") + " hasta " + (hasta ? mjFechaTextoISO(hasta) : "hoy");

}

function mjExportarCaja(){

    const filas = mjFilasCaja();

    if(!filas.length){

        notificacion("No hay datos de caja para exportar.", "warning");

        return;

    }

    mjExportarCSV("Caja", [["Caja", mjPeriodoCaja()], [], ["Concepto", "Monto", "Detalle"]].concat(filas));

    notificacion("Caja exportada.");

}

function mjImprimirCaja(){

    const filas = mjFilasCaja();

    if(!filas.length){

        notificacion("No hay datos de caja para imprimir.", "warning");

        return;

    }

    const nombreNeg = typeof nombreNegocio === "function" ? nombreNegocio() : "";

    mjImprimir(`
        <div class="mjHoja">
            <h1>${mjEsc(nombreNeg)}</h1>
            <h2>Caja</h2>
            <p>${mjEsc(mjPeriodoCaja())} · Impreso el ${mjEsc(fechaHoraTexto(new Date()))}</p>
            <table>
                <thead><tr><th>Concepto</th><th class="mjDerecha">Monto</th><th>Detalle</th></tr></thead>
                <tbody>
                    ${filas.map(([t, v, d]) => `<tr><td>${mjEsc(t)}</td><td class="mjDerecha"><strong>${mjEsc(v)}</strong></td><td>${mjEsc(d)}</td></tr>`).join("")}
                </tbody>
            </table>
        </div>
    `);

}

/* ==========================================
   COPIA DE SEGURIDAD COMPLETA
========================================== */

function mjDatosRespaldo(){

    const datos = {
        formato: "respaldo-forralitas",
        version: 2,
        fecha: new Date().toISOString(),
        productos,
        historialVentas,
        clientes,
        gastos,
        proveedores,
        usuarios,
        configuracionSistema,
        mezclas,
        carpetasNotas,
        eliminaciones,
        preciosClientes: obtenerTodosPreciosCliente()
    };

    if(typeof historialIngresosProductos !== "undefined") datos.historialIngresosProductos = historialIngresosProductos;

    return datos;

}
