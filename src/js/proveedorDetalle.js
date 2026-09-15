/* ==========================================
   DETALLE DE PROVEEDOR
========================================== */

let proveedorDetalleActualId = null;
let proveedorPagoActualId = null;

function renderProveedorDetalle(id){

    const proveedor = proveedores.find(p => p.id === id);

    if(!proveedor){

        document.getElementById("contenidoProveedorDetalle").innerHTML = `
            <div class="card"><p>Proveedor no encontrado.</p></div>
        `;

        return;

    }

    if(!proveedor.compras) proveedor.compras = [];
    if(!proveedor.pagos) proveedor.pagos = [];

    document.getElementById("tituloProveedorDetalle").textContent = proveedor.nombre;

    const saldo = saldoPendienteProveedor(proveedor);

    const saldoClass = saldo > 0 ? "saldoDeuda" : "saldoOK";

    document.getElementById("contenidoProveedorDetalle").innerHTML = `

        <div class="detalleClienteGrid">

            <div class="columnaClienteIzquierda">

                <div class="card datosClienteCard">

                    <h2>Datos del proveedor</h2>

                    <div class="datoCliente">
                        <span class="labelDato">Nombre</span>
                        <span class="valorDato">${proveedor.nombre}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Teléfono</span>
                        <span class="valorDato">${proveedor.telefono || "—"}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Dirección</span>
                        <span class="valorDato">${proveedor.direccion || "—"}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Le pagamos</span>
                        <span class="valorDato">${proveedor.diasPago ? "Cada " + proveedor.diasPago + " días" : "Sin frecuencia fija"}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Le debemos</span>
                        <span class="valorDato ${saldoClass}">${dinero(saldo)}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Próximo vencimiento</span>
                        <span class="valorDato">${obtenerProximoVencimientoProveedor(proveedor)}</span>
                    </div>

                    ${proveedor.observaciones ? `
                        <div class="datoCliente">
                            <span class="labelDato">Observaciones</span>
                            <span class="valorDato">${proveedor.observaciones}</span>
                        </div>
                    ` : ""}

                    <div class="accionesDetalleCliente">

                        <button id="btnComprarProveedor" class="btnPrecios">
                            🧾 Registrar compra
                        </button>

                        <button id="btnPagarProveedor" class="btnRegistrarPago">
                            💵 Registrar pago
                        </button>

                    </div>

                </div>

                <div class="card historialPagosCard">

                    <h2>Historial de pagos</h2>

                    ${renderHistorialPagosProveedor(proveedor)}

                </div>

            </div>

            <div class="card historialClienteCard">

                <h2>Historial de compras</h2>

                <p class="notaHistorialCliente">
                    Compras registradas a nombre de ${proveedor.nombre}.
                </p>

                <div class="historialClienteLista" id="historialComprasProveedor">
                    ${renderHistorialComprasProveedor(proveedor)}
                </div>

            </div>

        </div>

    `;

    document.getElementById("btnComprarProveedor").onclick = ()=> abrirModalCompraProveedor(proveedor.id);

    document.getElementById("btnPagarProveedor").onclick = ()=> abrirModalPagoProveedor(proveedor.id);

}

function renderHistorialComprasProveedor(proveedor){

    const compras = proveedor.compras || [];

    if(compras.length === 0){

        return `<div class="cardVentaHistorial"><p class="tablaVacia">Todavía no hay compras registradas.</p></div>`;

    }

    return [...compras]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .map(compra =>{

            const pagada = compra.pagada === true || Number(compra.saldoPendiente || 0) <= 0.01;

            const estado = pagada
                ? `<span style="color:var(--verde);font-weight:800">✔ PAGADO</span>`
                : `<span style="color:var(--rojo);font-weight:800">DEBE ${dinero(compra.saldoPendiente)}</span>`;

            return `
                <div class="cardVentaHistorial">
                    <div class="cabeceraVentaHistorial">
                        <div>
                            <span class="fechaVenta">🗓️ ${compra.fechaTexto}</span>
                            ${compra.fechaVencimientoTexto ? `<span class="vendedorVenta">⏰ Vence ${compra.fechaVencimientoTexto}</span>` : ""}
                        </div>
                    </div>
                    <div class="datosVentaHistorial">
                        <span>${compra.descripcion}</span>
                        <span><strong>Estado:</strong> ${estado}</span>
                    </div>
                    <div class="totalVentaHistorial">
                        TOTAL: ${dinero(compra.monto)}
                    </div>
                </div>
            `;

        }).join("");

}

function renderHistorialPagosProveedor(proveedor){

    const pagos = proveedor.pagos || [];

    if(pagos.length === 0){

        return `<p class="tablaVacia">Todavía no se registraron pagos.</p>`;

    }

    return `<div class="listaPagosCliente">` + [...pagos]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .map(pago => `
            <div class="filaPagoCliente">
                <div>
                    <strong>${dinero(pago.monto)}</strong>
                    <small>🗓️ ${pago.fechaTexto}</small>
                </div>
                <div class="detallePagoCliente">
                    <span>Aplicado a: ${pago.compraDescripcion || "—"}</span>
                    <span>Quedan ${dinero(pago.restanteCompra || 0)} de esa compra</span>
                </div>
            </div>
        `).join("") + `</div>`;

}

/* ==========================================
   MODAL REGISTRAR COMPRA
========================================== */

let proveedorCompraActualId = null;

function abrirModalCompraProveedor(id){

    proveedorCompraActualId = id;

    limpiar("descripcionCompraProveedor", "montoCompraProveedor");

    document.getElementById("fechaCompraProveedor").value = fechaLocalISO(new Date());

    abrir("modalCompraProveedor");

    setTimeout(()=> document.getElementById("descripcionCompraProveedor").focus(), 100);

}

function guardarCompraProveedor(){

    const proveedor = proveedores.find(p => p.id === proveedorCompraActualId);

    if(!proveedor) return;

    const descripcion = document.getElementById("descripcionCompraProveedor").value.trim();

    const monto = Number(document.getElementById("montoCompraProveedor").value) || 0;

    const fecha = document.getElementById("fechaCompraProveedor").value || fechaLocalISO(new Date());

    if(!descripcion){

        notificacion("Describí qué le compramos.", "warning");

        return;

    }

    if(monto <= 0){

        notificacion("Ingresá un monto válido.", "warning");

        return;

    }

    let fechaVencimiento = null;
    let fechaVencimientoTexto = null;

    if(proveedor.diasPago){

        const vencimiento = new Date(fecha + "T00:00:00");

        vencimiento.setDate(vencimiento.getDate() + Number(proveedor.diasPago));

        fechaVencimiento = fechaLocalISO(vencimiento);

        fechaVencimientoTexto = vencimiento.toLocaleDateString("es-AR");

    }

    if(!proveedor.compras) proveedor.compras = [];

    proveedor.compras.push({

        id: "CP" + Date.now(),
        descripcion,
        monto,
        fecha,
        fechaTexto: new Date(fecha + "T00:00:00").toLocaleDateString("es-AR"),
        fechaVencimiento,
        fechaVencimientoTexto,
        saldoPendiente: monto,
        pagada: false

    });

    guardarDatos();

    cerrar("modalCompraProveedor");

    renderProveedorDetalle(proveedor.id);

    actualizarTablaProveedores();

    notificacion("Compra registrada.");

}

/* ==========================================
   MODAL REGISTRAR PAGO A PROVEEDOR
========================================== */

function abrirModalPagoProveedor(id){

    const proveedor = proveedores.find(p => p.id === id);

    if(!proveedor) return;

    proveedorPagoActualId = id;

    document.getElementById("saldoActualPagoProveedor").value = dinero(saldoPendienteProveedor(proveedor));

    document.getElementById("montoPagoProveedor").value = "";

    const comprasPendientes = (proveedor.compras || [])
        .filter(c => Number(c.saldoPendiente || 0) > 0.01)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const lista = document.getElementById("listaComprasPendientesPago");

    if(comprasPendientes.length === 0){

        lista.innerHTML = `<p class="tablaVacia">No hay compras pendientes de pago.</p>`;

    }else{

        lista.innerHTML = comprasPendientes.map((c, i) => `
            <label class="filaVentaPendiente">
                <input
                    type="radio"
                    name="compraPagoSeleccionada"
                    value="${c.id}"
                    ${i === 0 ? "checked" : ""}>
                <span>
                    🗓️ ${c.fechaTexto} — ${c.descripcion} — debe
                    <strong>${dinero(c.saldoPendiente)}</strong> de ${dinero(c.monto)}
                </span>
            </label>
        `).join("");

    }

    abrir("modalPagoProveedor");

    setTimeout(()=> document.getElementById("montoPagoProveedor").focus(), 100);

}

function guardarPagoProveedor(){

    const proveedor = proveedores.find(p => p.id === proveedorPagoActualId);

    if(!proveedor) return;

    const compraSeleccionada = document.querySelector('input[name="compraPagoSeleccionada"]:checked');

    if(!compraSeleccionada){

        notificacion("No hay ninguna compra pendiente para aplicar el pago.", "warning");

        return;

    }

    const compra = (proveedor.compras || []).find(c => c.id === compraSeleccionada.value);

    if(!compra) return;

    const monto = Number(document.getElementById("montoPagoProveedor").value) || 0;

    const pendiente = Number(compra.saldoPendiente || 0);

    if(monto <= 0){

        notificacion("Ingresá un monto válido.", "warning");

        return;

    }

    if(monto > pendiente + 0.01){

        notificacion(
            "Ese pago (" + dinero(monto) + ") es mayor a lo que debe esa compra (" + dinero(pendiente) + ").",
            "warning"
        );

        return;

    }

    const restante = Math.max(0, pendiente - monto);

    compra.saldoPendiente = restante;
    compra.pagada = restante <= 0.01;

    if(!proveedor.pagos) proveedor.pagos = [];

    proveedor.pagos.push({

        fecha: new Date().toISOString(),
        fechaTexto: fechaHoraTexto(new Date()),
        monto,
        compraId: compra.id,
        compraDescripcion: compra.descripcion,
        restanteCompra: restante

    });

    guardarDatos();

    cerrar("modalPagoProveedor");

    renderProveedorDetalle(proveedor.id);

    actualizarTablaProveedores();

    proveedorPagoActualId = null;

    notificacion(
        restante <= 0.01
            ? "¡Compra saldada!"
            : "Pago registrado. Quedan " + dinero(restante) + " de esa compra."
    );

}
