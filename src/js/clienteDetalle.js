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
   MODAL REGISTRAR PAGO
========================================== */

let clientePagoActualId = null;

function abrirModalPagoCliente(id){

    const cliente = clientes.find(c => c.id === id);

    if(!cliente) return;

    clientePagoActualId = id;

    document.getElementById("saldoActualPago").value = dinero(cliente.saldo || 0);

    document.getElementById("montoPagoCliente").value = "";

    document.getElementById("tipoPagoCliente").value = "efectivo";

    abrir("modalPagoCliente");

    setTimeout(()=> document.getElementById("montoPagoCliente").focus(), 100);

}

function guardarPagoCliente(){

    if(!clientePagoActualId) return;

    const cliente = clientes.find(c => c.id === clientePagoActualId);

    if(!cliente) return;

    const monto = Number(document.getElementById("montoPagoCliente").value) || 0;

    const tipoPago = document.getElementById("tipoPagoCliente").value;

    if(monto <= 0){

        notificacion("Ingrese un monto válido.", "warning");

        return;

    }

    cliente.saldo = Number(cliente.saldo || 0) - monto;

    registrarEliminacion(

        "Pago de cliente",

        "Pago de " + cliente.nombre
        + " · " + dinero(monto)
        + " · " + tipoPago,

        { clienteId: cliente.id, monto, tipoPago }

    );

    guardarDatos();

    cerrarModalPagoCliente();

    renderClienteDetalle(cliente.id);

    clientePagoActualId = null;

    notificacion("Pago registrado correctamente.");

}
