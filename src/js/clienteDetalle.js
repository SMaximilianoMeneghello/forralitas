/* ==========================================
   DETALLE DE CLIENTE
========================================== */

function renderClienteDetalle(id){

    const cliente = clientes.find(c => c.id === id);

    if(!cliente){

        document.getElementById("contenidoClienteDetalle").innerHTML = `

            <div class="card">
                <p>Cliente no encontrado.</p>
            </div>

        `;

        return;

    }

    document.getElementById("tituloClienteDetalle").textContent = cliente.nombre;

    const saldoClass = Number(cliente.saldo || 0) > 0
        ? "saldoDeuda"
        : "saldoOK";

    const ventasCliente = historialVentas.filter(v =>

        v.cliente && v.cliente.id === cliente.id

    );

    let filasHistorial = "";

    if(ventasCliente.length === 0){

        filasHistorial = `
            <tr>
                <td colspan="5" class="tablaVacia">
                    Este cliente todavía no tiene ventas registradas.
                </td>
            </tr>
        `;

    }else{

        filasHistorial = ventasCliente.map(venta =>{

            const filas = venta.productos.map(item => `
                <tr>
                    <td>${item.nombre}</td>
                    <td>${formatearCantidadItem(item)}</td>
                    <td>${unidadVenta(item.modo)}</td>
                    <td>${dinero(item.precio)}</td>
                    <td>${dinero(item.subtotal)}</td>
                </tr>
            `).join("");

            const vendedor = venta.vendedor ? venta.vendedor.nombre : "—";

            return `
                <div class="cardVentaHistorial">
                    <div class="cabeceraVentaHistorial">
                        <div>
                            <span class="fechaVenta">🗓️ ${venta.fechaTexto}</span>
                            <span class="vendedorVenta">👤 ${vendedor}</span>
                        </div>
                    </div>
                    <div class="datosVentaHistorial">
                        <span><strong>Pago:</strong> ${textoMetodoPago(venta)}</span>
                    </div>
                    <table class="tablaVentaHistorial">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Cantidad</th>
                                <th>Unidad</th>
                                <th>Precio Unit.</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>${filas}</tbody>
                    </table>
                    <div class="totalVentaHistorial">
                        TOTAL: ${dinero(venta.total)}
                    </div>
                </div>
            `;

        }).join("");

    }

    document.getElementById("contenidoClienteDetalle").innerHTML = `

        <div class="detalleClienteGrid">

            <div class="columnaClienteIzquierda">

                <div class="card datosClienteCard">

                    <h2>Datos del cliente</h2>

                    <div class="datoCliente">
                        <span class="labelDato">Nombre</span>
                        <span class="valorDato">${cliente.nombre}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Dirección</span>
                        <span class="valorDato">${cliente.direccion || "—"}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Teléfono</span>
                        <span class="valorDato">${cliente.telefono || "—"}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Saldo</span>
                        <span class="valorDato ${saldoClass}">${dinero(cliente.saldo || 0)}</span>
                    </div>

                    ${cliente.observaciones ? `
                        <div class="datoCliente">
                            <span class="labelDato">Observaciones</span>
                            <span class="valorDato">${cliente.observaciones}</span>
                        </div>
                    ` : ""}

                    <div class="accionesDetalleCliente">

                        <button
                            id="btnPreciosCliente"
                            class="btnPrecios">
                            💲 Precios
                        </button>

                        <button
                            id="btnPagarCliente"
                            class="btnRegistrarPago">
                            💵 Registrar pago
                        </button>

                    </div>

                </div>

                <div class="card historialPagosCard">

                    <h2>Historial de pagos</h2>

                    ${renderHistorialPagosCliente(cliente)}

                </div>

            </div>

            <div class="card historialClienteCard">

                <h2>Historial de ventas del cliente</h2>
                <div class="historialClienteBuscador">

                    <div class="grupoInput">
                        <label>Desde</label>
                        <input type="date" id="fechaDesdeCliente">
                    </div>

                    <div class="grupoInput">
                        <label>Hasta</label>
                        <input type="date" id="fechaHastaCliente">
                    </div>

                    <button class="btnBuscarHistorial" id="btnBuscarHistorialCliente">
                        Buscar
                    </button>

                    <button class="btnHoy" id="btnHoyHistorialCliente">
                        Hoy
                    </button>

                    <button class="btnTodas" id="btnTodasHistorialCliente">
                        Todas
                    </button>

                </div>

                <p class="notaHistorialCliente">
                    Ventas registradas a nombre de ${cliente.nombre}.
                </p>

                <div class="historialClienteLista" id="historialClienteLista">
                    ${filasHistorial}
                </div>

            </div>

        </div>

    `;

    const btnPrecios = document.getElementById("btnPreciosCliente");

    if(btnPrecios) btnPrecios.onclick = ()=> abrirPantallaPreciosClienteDetalle(cliente.id);

    const btnPagar = document.getElementById("btnPagarCliente");

    if(btnPagar) btnPagar.onclick = ()=> abrirModalPagoCliente(cliente.id);

    const btnBuscar = document.getElementById("btnBuscarHistorialCliente");

    if(btnBuscar) btnBuscar.onclick = ()=> filtrarHistorialCliente(cliente.id);

    const btnHoy = document.getElementById("btnHoyHistorialCliente");

    if(btnHoy) btnHoy.onclick = ()=>{

        const hoy = fechaLocalISO(new Date());

        document.getElementById("fechaDesdeCliente").value = hoy;

        document.getElementById("fechaHastaCliente").value = hoy;

        filtrarHistorialCliente(cliente.id);

    };

    const btnTodas = document.getElementById("btnTodasHistorialCliente");

    if(btnTodas) btnTodas.onclick = ()=>{

        document.getElementById("fechaDesdeCliente").value = "";

        document.getElementById("fechaHastaCliente").value = "";

        filtrarHistorialCliente(cliente.id);

    };

}

/* ==========================================
   FILTRAR HISTORIAL DEL CLIENTE
========================================== */

function filtrarHistorialCliente(clienteId){

    const desde = document.getElementById("fechaDesdeCliente")?.value || null;

    const hasta = document.getElementById("fechaHastaCliente")?.value || null;

    const cont = document.getElementById("historialClienteLista");

    if(!cont) return;

    let ventasCliente = historialVentas.filter(v =>

        v.cliente && v.cliente.id === clienteId

    );

    if(desde || hasta){

        ventasCliente = ventasCliente.filter(v =>{

            const f = fechaLocalISO(v.fecha);

            if(desde && f < desde) return false;

            if(hasta && f > hasta) return false;

            return true;

        });

    }

    if(ventasCliente.length === 0){

        cont.innerHTML = `
            <div class="cardVentaHistorial">
                <p class="tablaVacia">
                    No hay ventas en este período.
                </p>
            </div>
        `;

        return;

    }

    cont.innerHTML = ventasCliente.map(venta =>{

        const filas = venta.productos.map(item => `
            <tr>
                <td>${item.nombre}</td>
                <td>${formatearCantidadItem(item)}</td>
                <td>${unidadVenta(item.modo)}</td>
                <td>${dinero(item.precio)}</td>
                <td>${dinero(item.subtotal)}</td>
            </tr>
        `).join("");

        const vendedor = venta.vendedor ? venta.vendedor.nombre : "—";

        return `
            <div class="cardVentaHistorial">
                <div class="cabeceraVentaHistorial">
                    <div>
                        <span class="fechaVenta">🗓️ ${venta.fechaTexto}</span>
                        <span class="vendedorVenta">👤 ${vendedor}</span>
                    </div>
                </div>
                <div class="datosVentaHistorial">
                    <span><strong>Pago:</strong> ${textoMetodoPago(venta)}</span>
                </div>
                <table class="tablaVentaHistorial">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Unidad</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
                <div class="totalVentaHistorial">
                    TOTAL: ${dinero(venta.total)}
                </div>
            </div>
        `;

    }).join("");

}

/* ==========================================
   HISTORIAL DE PAGOS DEL CLIENTE
========================================== */

function renderHistorialPagosCliente(cliente){

    const pagos = cliente.pagos || [];

    if(pagos.length === 0){

        return `<p class="tablaVacia">Todavía no se registraron pagos.</p>`;

    }

    const filas = [...pagos]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .map(pago => `
            <div class="filaPagoCliente">
                <div>
                    <strong>${dinero(pago.monto)}</strong>
                    <small>🗓️ ${pago.fechaTexto}</small>
                </div>
                <div class="detallePagoCliente">
                    <span>Aplicado a la venta del ${pago.ventaFechaTexto || "—"}</span>
                    <span>Le quedan ${dinero(pago.restanteVenta || 0)} de esa venta</span>
                </div>
            </div>
        `).join("");

    return `<div class="listaPagosCliente">${filas}</div>`;

}

/* ==========================================
   MODAL REGISTRAR PAGO
========================================== */

let clientePagoActualId = null;
let metodoPagoCliente = "efectivo";

function cambiarMetodoPagoCliente(tipo){

    metodoPagoCliente = tipo;

    ["btnEfectivoPagoCliente", "btnTransferenciaPagoCliente", "btnMixtoPagoCliente"].forEach(id =>{

        document.getElementById(id)?.classList.remove("activo");

    });

    const mapaBotones = {
        efectivo: "btnEfectivoPagoCliente",
        transferencia: "btnTransferenciaPagoCliente",
        mixto: "btnMixtoPagoCliente"
    };

    document.getElementById(mapaBotones[tipo])?.classList.add("activo");

    const pagoMixto = document.getElementById("pagoMixtoPagoCliente");

    if(pagoMixto) pagoMixto.classList.toggle("activo", tipo === "mixto");

}

function abrirModalPagoCliente(id){

    const cliente = clientes.find(c => c.id === id);

    if(!cliente) return;

    clientePagoActualId = id;

    document.getElementById("saldoActualPago").value = dinero(cliente.saldo || 0);

    document.getElementById("montoPagoCliente").value = "";

    limpiar("montoEfectivoPagoCliente", "montoTransferenciaPagoCliente");

    cambiarMetodoPagoCliente("efectivo");

    const ventasPendientes = historialVentas.filter(v =>{

        if(!v.cliente || v.cliente.id !== id) return false;

        if(v.metodoPago !== "debe") return false;

        const pendiente = v.saldoPendiente !== undefined
            ? Number(v.saldoPendiente)
            : Number(v.total || 0);

        return pendiente > 0.01;

    }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const lista = document.getElementById("listaVentasPendientesPago");

    if(ventasPendientes.length === 0){

        lista.innerHTML = `<p class="tablaVacia">Este cliente no tiene ventas pendientes de pago.</p>`;

    }else{

        lista.innerHTML = ventasPendientes.map((v, i) =>{

            const pendiente = v.saldoPendiente !== undefined
                ? Number(v.saldoPendiente)
                : Number(v.total || 0);

            return `
                <label class="filaVentaPendiente">
                    <input
                        type="radio"
                        name="ventaPagoSeleccionada"
                        value="${v.id}"
                        ${i === 0 ? "checked" : ""}>
                    <span>
                        🗓️ ${v.fechaTexto} — debe <strong>${dinero(pendiente)}</strong>
                        de ${dinero(v.total)}
                    </span>
                </label>
            `;

        }).join("");

    }

    abrir("modalPagoCliente");

    setTimeout(()=> document.getElementById("montoPagoCliente").focus(), 100);

}

function guardarPagoCliente(){

    if(!clientePagoActualId) return;

    const cliente = clientes.find(c => c.id === clientePagoActualId);

    if(!cliente) return;

    const ventaSeleccionada = document.querySelector('input[name="ventaPagoSeleccionada"]:checked');

    if(!ventaSeleccionada){

        notificacion("Este cliente no tiene ventas pendientes para aplicar el pago.", "warning");

        return;

    }

    const venta = historialVentas.find(v => v.id === ventaSeleccionada.value);

    if(!venta){

        notificacion("No se encontró esa venta.", "warning");

        return;

    }

    const monto = Number(document.getElementById("montoPagoCliente").value) || 0;

    const pendiente = venta.saldoPendiente !== undefined
        ? Number(venta.saldoPendiente)
        : Number(venta.total || 0);

    if(monto <= 0){

        notificacion("Ingrese un monto válido.", "warning");

        return;

    }

    if(monto > pendiente + 0.01){

        notificacion(
            "Ese pago (" + dinero(monto) + ") es mayor a lo que debe esa venta (" + dinero(pendiente) + "). "
            + "Elegí otra venta o cargá un monto menor.",
            "warning"
        );

        return;

    }

    // Desglose efectivo/transferencia, igual que en ventas y gastos,
    // para que esta plata se sume después en la Caja (Reportes).
    let pago = { efectivo: 0, transferencia: 0 };

    if(metodoPagoCliente === "efectivo"){

        pago.efectivo = monto;

    }else if(metodoPagoCliente === "transferencia"){

        pago.transferencia = monto;

    }else{

        pago.efectivo = Number(document.getElementById("montoEfectivoPagoCliente").value) || 0;
        pago.transferencia = Number(document.getElementById("montoTransferenciaPagoCliente").value) || 0;

        const suma = pago.efectivo + pago.transferencia;

        if(Math.abs(suma - monto) > 0.01){

            notificacion(
                "Los montos del pago mixto deben sumar " + dinero(monto) + ".",
                "warning"
            );

            return;

        }

    }

    const restante = Math.max(0, pendiente - monto);

    venta.saldoPendiente = restante;
    venta.pagada = restante <= 0.01;

    cliente.saldo = Math.max(0, Number(cliente.saldo || 0) - monto);

    if(!cliente.pagos) cliente.pagos = [];

    cliente.pagos.push({

        fecha: new Date().toISOString(),
        fechaTexto: fechaHoraTexto(new Date()),
        monto,
        tipoPago: metodoPagoCliente,
        pago,
        ventaId: venta.id,
        ventaFechaTexto: venta.fechaTexto,
        restanteVenta: restante,

        // Para que la Caja separe esta plata por empleado, igual que
        // ventas y gastos.
        vendedor: usuarioActual
            ? { usuario: usuarioActual.usuario, nombre: usuarioActual.nombre }
            : null

    });

    guardarDatos();

    cerrarModalPagoCliente();

    renderClienteDetalle(cliente.id);

    clientePagoActualId = null;

    notificacion(
        restante <= 0.01
            ? "¡Venta saldada! Quedó marcada como pagada."
            : "Pago registrado. Quedan " + dinero(restante) + " de esa venta."
    );

}
