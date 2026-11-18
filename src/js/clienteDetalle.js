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
                        ${mjAccionesVentaCliente(venta)}
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

                    <div class="datoCliente">
                        <span class="labelDato">Total comprado</span>
                        <span class="valorDato">${dinero(mjTotalComprado(cliente.id))}</span>
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

                        <button
                            id="btnEstadoCuentaCliente"
                            class="btnPrecios">
                            🖨️ Estado de cuenta
                        </button>

                        <button
                            id="btnEditarDatosCliente"
                            class="btnPrecios">
                            ✏️ Editar datos
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

    const btnEstadoCuenta = document.getElementById("btnEstadoCuentaCliente");

    if(btnEstadoCuenta) btnEstadoCuenta.onclick = ()=> mjEstadoCuentaCliente(cliente.id);

    const btnEditarDatos = document.getElementById("btnEditarDatosCliente");

    if(btnEditarDatos) btnEditarDatos.onclick = ()=> editarCliente(cliente.id);

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
                    ${mjAccionesVentaCliente(venta)}
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

    // Los pagos viejos no tenían identificador: se les asigna uno para
    // poder editarlos o eliminarlos (ver mejoras.js).
    if(mjAsegurarIdsPagos(cliente.pagos, "PG")) guardarDatos("clientes");

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
                    <span>${mjTextoFormaPagoCliente(pago)}${pago.vendedor && pago.vendedor.nombre ? " · cobró " + pago.vendedor.nombre : ""}</span>
                </div>
                ${mjAccionesPagoCliente(cliente, pago)}
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

/* ==========================================
   DEUDAS (FIADOS) DEL CLIENTE
   Los pagos se aplican solos: primero a la
   deuda más antigua, después a la siguiente,
   hasta cubrir el monto. Cada deuda que se
   va cubriendo queda como un pago separado.
========================================== */

function pendienteVenta(venta){

    return venta.saldoPendiente !== undefined
        ? Number(venta.saldoPendiente)
        : Number(venta.total || 0);

}

function obtenerFiadosPendientes(clienteId){

    return historialVentas
        .filter(v =>{

            if(!v.cliente || v.cliente.id !== clienteId) return false;

            if(v.metodoPago !== "debe") return false;

            return pendienteVenta(v) > 0.01;

        })
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

}

// Reparte el monto entre las deudas, de la más antigua a la más nueva.
function distribuirPagoEntreFiados(fiados, monto){

    let restante = monto;

    const aplicaciones = [];

    fiados.forEach(venta =>{

        if(restante <= 0.01) return;

        const pendiente = pendienteVenta(venta);

        const aplicado = Math.min(restante, pendiente);

        aplicaciones.push({

            venta,
            aplicado,
            quedaVenta: Math.max(0, pendiente - aplicado)

        });

        restante -= aplicado;

    });

    return aplicaciones;

}

function renderListaFiadosPago(clienteId, monto){

    const fiados = obtenerFiadosPendientes(clienteId);

    if(fiados.length === 0){

        return `<p class="tablaVacia">Este cliente no tiene deudas pendientes.</p>`;

    }

    const aplicaciones = distribuirPagoEntreFiados(fiados, monto);

    return fiados.map(venta =>{

        const pendiente = pendienteVenta(venta);

        const aplicacion = aplicaciones.find(a => a.venta === venta);

        let estado = `debe <strong>${dinero(pendiente)}</strong>`;

        if(aplicacion && aplicacion.quedaVenta <= 0.01){

            estado = `<span class="saldoOK">se salda con ${dinero(aplicacion.aplicado)}</span>`;

        }else if(aplicacion){

            estado = `se pagan ${dinero(aplicacion.aplicado)}, <strong>quedan ${dinero(aplicacion.quedaVenta)}</strong>`;

        }

        return `
            <div class="filaVentaPendiente">
                <span>🗓️ ${venta.fechaTexto} — ${estado}</span>
            </div>
        `;

    }).join("");

}

function actualizarListaFiadosPago(){

    if(!clientePagoActualId) return;

    const monto = Number(document.getElementById("montoPagoCliente").value) || 0;

    document.getElementById("listaVentasPendientesPago").innerHTML =
        renderListaFiadosPago(clientePagoActualId, monto);

}

function abrirModalPagoCliente(id){

    const cliente = clientes.find(c => c.id === id);

    if(!cliente) return;

    clientePagoActualId = id;

    document.getElementById("saldoActualPago").value = dinero(cliente.saldo || 0);

    document.getElementById("montoPagoCliente").value = "";

    limpiar("montoEfectivoPagoCliente", "montoTransferenciaPagoCliente");

    cambiarMetodoPagoCliente("efectivo");

    // Al escribir el monto se muestra en qué queda cada deuda.
    document.getElementById("montoPagoCliente").oninput = function(){

        limpiarNumero(this);

        actualizarListaFiadosPago();

    };

    actualizarListaFiadosPago();

    abrir("modalPagoCliente");

    setTimeout(()=> document.getElementById("montoPagoCliente").focus(), 100);

}

function guardarPagoCliente(){

    if(!clientePagoActualId) return;

    const cliente = clientes.find(c => c.id === clientePagoActualId);

    if(!cliente) return;

    const monto = Number(document.getElementById("montoPagoCliente").value) || 0;

    if(monto <= 0){

        notificacion("Ingrese un monto válido.", "warning");

        return;

    }

    const fiados = obtenerFiadosPendientes(cliente.id);

    if(fiados.length === 0){

        notificacion("Este cliente no tiene deudas pendientes.", "warning");

        return;

    }

    const totalPendiente = fiados.reduce((acc, v) => acc + pendienteVenta(v), 0);

    if(monto > totalPendiente + 0.01){

        notificacion(
            "Ese pago (" + dinero(monto) + ") es mayor a la deuda total del cliente (" + dinero(totalPendiente) + ").",
            "warning"
        );

        return;

    }

    // Desglose efectivo/transferencia, igual que en ventas y gastos,
    // para que esta plata se sume después en la Caja (Reportes).
    let efectivoTotal = 0;

    if(metodoPagoCliente === "efectivo"){

        efectivoTotal = monto;

    }else if(metodoPagoCliente === "mixto"){

        efectivoTotal = Number(document.getElementById("montoEfectivoPagoCliente").value) || 0;

        const transferenciaTotal = Number(document.getElementById("montoTransferenciaPagoCliente").value) || 0;

        if(Math.abs(efectivoTotal + transferenciaTotal - monto) > 0.01){

            notificacion(
                "Los montos del pago mixto deben sumar " + dinero(monto) + ".",
                "warning"
            );

            return;

        }

    }

    const aplicaciones = distribuirPagoEntreFiados(fiados, monto);

    const ahora = new Date();

    const fechaTexto = fechaHoraTexto(ahora);

    const vendedor = usuarioActual
        ? { usuario: usuarioActual.usuario, nombre: usuarioActual.nombre }
        : null;

    if(!cliente.pagos) cliente.pagos = [];

    // El efectivo se reparte primero entre las deudas más antiguas,
    // así los totales en efectivo/transferencia quedan exactos.
    let efectivoRestante = efectivoTotal;

    aplicaciones.forEach(({ venta, aplicado, quedaVenta }) =>{

        const efectivo = Math.min(aplicado, efectivoRestante);

        efectivoRestante -= efectivo;

        venta.saldoPendiente = quedaVenta;
        venta.pagada = quedaVenta <= 0.01;

        cliente.pagos.push({

            fecha: ahora.toISOString(),
            fechaTexto,
            monto: aplicado,
            tipoPago: metodoPagoCliente,
            pago: {
                efectivo,
                transferencia: aplicado - efectivo
            },
            ventaId: venta.id,
            ventaFechaTexto: venta.fechaTexto,
            restanteVenta: quedaVenta,

            // Para que la Caja separe esta plata por empleado, igual que
            // ventas y gastos.
            vendedor

        });

    });

    cliente.saldo = Math.max(0, Number(cliente.saldo || 0) - monto);

    guardarDatos("clientes", "historialVentas");

    cerrarModalPagoCliente();

    renderClienteDetalle(cliente.id);

    clientePagoActualId = null;

    const saldadas = aplicaciones.filter(a => a.quedaVenta <= 0.01).length;

    const parcial = aplicaciones.find(a => a.quedaVenta > 0.01);

    let mensaje = "Pago registrado. Se saldaron " + saldadas + " deuda(s).";

    if(parcial){

        mensaje += " A la del " + parcial.venta.fechaTexto + " le quedan " + dinero(parcial.quedaVenta) + ".";

    }

    notificacion(mensaje);

}
