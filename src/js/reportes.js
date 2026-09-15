/* ==========================================
   REPORTES
========================================== */

function renderReportes(){

    const filtroEmpleadoHtml = esAdmin()
        ? `
            <div class="grupoInput">
                <label>Empleado</label>
                <select id="empleadoReporte">
                    <option value="">Todos los empleados</option>
                    ${obtenerListaEmpleadosParaFiltro()
                        .map(nombre => `<option value="${nombre}">${nombre}</option>`)
                        .join("")}
                </select>
            </div>
        `
        : "";

    contenido().innerHTML = `

        <div class="reportesContenedor">

            <div class="reportesFiltros">

                <div class="grupoInput">
                    <label>Desde</label>
                    <input type="date" id="fechaDesdeReporte">
                </div>

                <div class="grupoInput">
                    <label>Hasta</label>
                    <input type="date" id="fechaHastaReporte">
                </div>

                ${filtroEmpleadoHtml}

                <button class="btnBuscar" id="btnGenerarReporte">Buscar</button>

                <button class="btnHoy" id="btnHoyReporte">Hoy</button>

            </div>

            ${
                !esAdmin()
                ? `<p class="notaEliminaciones" style="margin-bottom:16px">
                        Este reporte muestra únicamente tus propias ventas
                        (${usuarioActual ? usuarioActual.nombre : ""}), para que
                        no se mezcle con lo registrado por otras personas.
                   </p>`
                : ""
            }

            <div id="contenidoReporte"></div>

        </div>

    `;

    document.getElementById("btnGenerarReporte").onclick = generarReporte;

    document.getElementById("btnHoyReporte").onclick = filtrarHoyReporte;

    const hoy = fechaLocalISO(new Date());

    document.getElementById("fechaDesdeReporte").value = hoy;

    document.getElementById("fechaHastaReporte").value = hoy;

    generarReporte();

}

function filtrarHoyReporte(){

    const hoy = fechaLocalISO(new Date());

    document.getElementById("fechaDesdeReporte").value = hoy;

    document.getElementById("fechaHastaReporte").value = hoy;

    generarReporte();

}

function generarReporte(){

    const desde = document.getElementById("fechaDesdeReporte").value;

    const hasta = document.getElementById("fechaHastaReporte").value;

    // Un empleado (no admin) siempre ve nada más que sus propias ventas,
    // para que la caja no se mezcle con lo que vendió otra persona.
    // El admin puede ver todo, o elegir un empleado puntual.
    const empleadoSeleccionado = esAdmin()
        ? (document.getElementById("empleadoReporte")?.value || "")
        : (usuarioActual ? usuarioActual.nombre : "");

    const ventas = historialVentas.filter(v =>{

        const f = fechaLocalISO(v.fecha);

        if(desde && f < desde) return false;

        if(hasta && f > hasta) return false;

        if(empleadoSeleccionado && (v.vendedor && v.vendedor.nombre) !== empleadoSeleccionado) return false;

        return true;

    });

    const gastosPeriodo = gastos.filter(g =>{

        const f = g.fecha || "";

        if(desde && f < desde) return false;

        if(hasta && f > hasta) return false;

        // Mismo criterio que las ventas: si hay un empleado puntual
        // seleccionado (o el que inició sesión no es admin), la caja
        // de gastos también queda separada por empleado. Los gastos
        // viejos sin usuario asignado solo se ven en la vista "Todos".
        if(empleadoSeleccionado && (g.vendedor && g.vendedor.nombre) !== empleadoSeleccionado) return false;

        return true;

    });

    // Cobros de deudas de clientes (pagos de ventas "fiado"): esta plata
    // entra a la caja el día que se COBRA, no el día de la venta original.
    const cobrosPeriodo = clientes.flatMap(c => (c.pagos || []).map(p => ({ ...p, cliente: c.nombre })))
        .filter(p =>{

            const f = fechaLocalISO(p.fecha);

            if(desde && f < desde) return false;

            if(hasta && f > hasta) return false;

            if(empleadoSeleccionado && (p.vendedor && p.vendedor.nombre) !== empleadoSeleccionado) return false;

            return true;

        });

    const totalCobrado = cobrosPeriodo.reduce((acc, p) => acc + Number(p.monto || 0), 0);

    const cobrosEfectivo = cobrosPeriodo
        .reduce((acc, p) => acc + (p.pago ? Number(p.pago.efectivo || 0) : Number(p.monto || 0)), 0);

    const cobrosTransferencia = cobrosPeriodo
        .reduce((acc, p) => acc + (p.pago ? Number(p.pago.transferencia || 0) : 0), 0);

    // Las ventas marcadas "DEBE" todavía no se cobraron: no cuentan
    // como plata real en Total Ventas / métodos de pago. (Los pagos que
    // se van cobrando después de una venta fiada se ven en el historial
    // de pagos de cada cliente, todavía no se suman acá al período).
    const ventasCobradas = ventas.filter(v => v.metodoPago !== "debe");

    const totalVentas = ventasCobradas.reduce((acc, v) => acc + Number(v.total || 0), 0);

    const totalGastos = gastosPeriodo.reduce((acc, g) => acc + Number(g.monto || 0), 0);

    // Se suma lo que realmente entró en efectivo/transferencia de CADA
    // venta (incluida la parte que corresponde de las ventas con pago
    // mixto), y se le resta lo que salió en gastos con ese mismo método.
    const ventasEfectivo = ventasCobradas
        .reduce((acc, v) => acc + Number((v.pago && v.pago.efectivo) || 0), 0);

    const ventasTransferencia = ventasCobradas
        .reduce((acc, v) => acc + Number((v.pago && v.pago.transferencia) || 0), 0);

    const gastosEfectivo = gastosPeriodo
        .reduce((acc, g) => acc + (g.pago ? Number(g.pago.efectivo || 0) : Number(g.monto || 0)), 0);

    const gastosTransferencia = gastosPeriodo
        .reduce((acc, g) => acc + (g.pago ? Number(g.pago.transferencia || 0) : 0), 0);

    const dineroEfectivo = ventasEfectivo + cobrosEfectivo - gastosEfectivo;

    const dineroTransferencia = ventasTransferencia + cobrosTransferencia - gastosTransferencia;

    const ventasMixtas = ventasCobradas.filter(v => v.metodoPago === "mixto").length;

    const ventasPorCliente = {};

    ventas.forEach(v =>{

        const nombre = (v.cliente && v.cliente.nombre) || "Consumidor Final";

        ventasPorCliente[nombre] = (ventasPorCliente[nombre] || 0) + Number(v.total || 0);

    });

    const topClientes = Object.entries(ventasPorCliente)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    const productoMasVendido = {};

    ventas.forEach(v =>{

        (v.productos || []).forEach(item =>{

            const nombre = item.nombre || "(sin nombre)";

            productoMasVendido[nombre] = (productoMasVendido[nombre] || 0)
                + Number(item.bolsas || 0);

        });

    });

    const topProductos = Object.entries(productoMasVendido)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    /* ==========================================
       GANANCIA POR MAÍZ (solo bolsas, no suelto)
       ------------------------------------------
       Solo estos 3 productos exactos cuentan
       (cualquier otro maíz —pisingallo, amarillo,
       blanco, etc.— queda afuera), y solo cuando
       se vendieron por bolsa entera, no sueltos
       por kilo ni por monto en dinero.
    ========================================== */

    const GANANCIA_MAIZ_POR_BOLSA = {

        "MAIZX40KG": 11000,
        "MAIZX45KG": 12000,
        "MAIZX50KG": 12000

    };

    function normalizarNombreProducto(nombre){

        return (nombre || "").toUpperCase().replace(/\s+/g, "");

    }

    let gananciaMaiz = 0;
    let bolsasMaizVendidas = 0;

    ventas.forEach(v =>{

        (v.productos || []).forEach(item =>{

            if(item.modo !== "bolsa") return;

            const clave = normalizarNombreProducto(item.nombre);

            const gananciaPorBolsa = GANANCIA_MAIZ_POR_BOLSA[clave];

            if(gananciaPorBolsa === undefined) return;

            const cantidadBolsas = Number(item.cantidad || item.bolsas || 0);

            gananciaMaiz += cantidadBolsas * gananciaPorBolsa;

            bolsasMaizVendidas += cantidadBolsas;

        });

    });

    /* ==========================================
       SEPARAR ALFA
       Se aparta $5.000 por cada bolsa de Alfa
       Verde vendida, para reponer mercadería.
    ========================================== */

    const RESERVA_ALFA_POR_BOLSA = {

        "ALFAVERDE": 5000

    };

    let reservaAlfa = 0;
    let bolsasAlfaVendidas = 0;

    ventas.forEach(v =>{

        (v.productos || []).forEach(item =>{

            if(item.modo !== "bolsa") return;

            const clave = normalizarNombreProducto(item.nombre);

            const reservaPorBolsa = RESERVA_ALFA_POR_BOLSA[clave];

            if(reservaPorBolsa === undefined) return;

            const cantidadBolsas = Number(item.cantidad || item.bolsas || 0);

            reservaAlfa += cantidadBolsas * reservaPorBolsa;

            bolsasAlfaVendidas += cantidadBolsas;

        });

    });

    const cont = document.getElementById("contenidoReporte");

    if(!cont) return;

    cont.innerHTML = `

        <div class="reportesGrid">

            <div class="cardMetrica">
                <small>💰 Venta Total</small>
                <h2>${dinero(totalVentas)}</h2>
                <span class="subMetrica">${ventasCobradas.length} ventas</span>
            </div>

            <div class="cardMetrica">
                <small>💸 Total de gastos</small>
                <h2>${dinero(totalGastos)}</h2>
                <span class="subMetrica">${gastosPeriodo.length} gastos</span>
            </div>

            <div class="cardMetrica">
                <small>💵 Dinero en efectivo</small>
                <h2>${dinero(dineroEfectivo)}</h2>
                <span class="subMetrica">ventas + cobros de deuda, menos gastos (todo en efectivo)</span>
            </div>

            <div class="cardMetrica">
                <small>🏦 Dinero en transferencia</small>
                <h2>${dinero(dineroTransferencia)}</h2>
                <span class="subMetrica">ventas + cobros de deuda, menos gastos (todo en transferencia)</span>
            </div>

            <div class="cardMetrica">
                <small>🌿 Separar Alfa</small>
                <h2>${dinero(reservaAlfa)}</h2>
                <span class="subMetrica">${formatearStock(bolsasAlfaVendidas)} bolsas · $5.000 c/u</span>
            </div>

            <div class="cardMetrica">
                <small>🌽 Separar Maíz</small>
                <h2>${dinero(gananciaMaiz)}</h2>
                <span class="subMetrica">${formatearStock(bolsasMaizVendidas)} bolsas (40/45/50kg)</span>
            </div>

        </div>

        <div class="dashboardResumen">

            <div class="card">

                <h2>💵 Métodos de pago</h2>

                <div class="ventaDashboard">
                    <div>
                        <strong>Efectivo</strong>
                        <small>${ventas.filter(v => v.metodoPago === "efectivo").length} ventas</small>
                    </div>
                    <span>${dinero(ventasEfectivo)}</span>
                </div>

                <div class="ventaDashboard">
                    <div>
                        <strong>Transferencia</strong>
                        <small>${ventas.filter(v => v.metodoPago === "transferencia").length} ventas</small>
                    </div>
                    <span>${dinero(ventasTransferencia)}</span>
                </div>

                <div class="ventaDashboard">
                    <div>
                        <strong>Mixto</strong>
                        <small>${ventasMixtas} ventas</small>
                    </div>
                    <span>${dinero(ventasCobradas.filter(v => v.metodoPago === "mixto").reduce((acc,v)=>acc+Number(v.total||0),0))}</span>
                </div>

                <div class="ventaDashboard" style="border-top:2px dashed #eee;margin-top:8px;padding-top:14px">
                    <div>
                        <strong>💳 Cobros de deuda</strong>
                        <small>${cobrosPeriodo.length} pagos de clientes (E: ${dinero(cobrosEfectivo)} · T: ${dinero(cobrosTransferencia)})</small>
                    </div>
                    <span>${dinero(totalCobrado)}</span>
                </div>

            </div>

            <div class="card">

                <h2>🏆 Top productos</h2>

                ${
                    topProductos.length
                    ? topProductos.map(([nombre, cant]) => `
                        <div class="ventaDashboard">
                            <div>
                                <strong>${nombre}</strong>
                                <small>${formatearStock(cant)} bolsas</small>
                            </div>
                        </div>
                    `).join("")
                    : "<p>No hay datos de productos vendidos.</p>"
                }

            </div>

        </div>

        <div class="card" style="margin-top:20px">

            <h2>👥 Clientes con más compras</h2>

            ${
                topClientes.length
                ? `<div class="tablaProveedores">
                    <table>
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Total comprado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topClientes.map(([nombre, total]) => `
                                <tr>
                                    <td><strong>${nombre}</strong></td>
                                    <td class="saldoOK">${dinero(total)}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>`
                : "<p>No hay datos de clientes en este período.</p>"
            }

        </div>

    `;

}
