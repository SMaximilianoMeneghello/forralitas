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

/* ==========================================
   RESERVA DE MAÍZ
   Por cada bolsa de maíz vendida se aparta un
   monto fijo (según el peso de la bolsa) para
   reponer mercadería. El resto de esa venta
   es ganancia.
========================================== */

const RESERVA_MAIZ_40KG = 11000;
const RESERVA_MAIZ_OTRO_PESO = 12000; // bolsas de 45kg, 50kg, etc.

function quitarAcentos(texto){

    return (texto || "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

}

function calcularReservaMaiz(ventasFiltradas){

    let total = 0;

    ventasFiltradas.forEach(v =>{

        (v.productos || []).forEach(item =>{

            if(!quitarAcentos(item.nombre).includes("maiz")) return;

            const bolsas = Number(item.bolsas || 0);

            if(bolsas <= 0) return;

            const producto = productos.find(p => p.id === item.id);

            const peso = producto ? Number(producto.pesoBolsa || 0) : 0;

            const reservaPorBolsa = peso === 40 ? RESERVA_MAIZ_40KG : RESERVA_MAIZ_OTRO_PESO;

            total += bolsas * reservaPorBolsa;

        });

    });

    return total;

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

        return true;

    });

    const totalVentas = ventas.reduce((acc, v) => acc + Number(v.total || 0), 0);

    const totalGastos = gastosPeriodo.reduce((acc, g) => acc + Number(g.monto || 0), 0);

    // Se suma lo que realmente entró en efectivo/transferencia de CADA venta
    // (incluyendo la parte que corresponde de las ventas con pago mixto,
    // en vez de solo las ventas 100% efectivo o 100% transferencia).
    const ventasEfectivo = ventas
        .reduce((acc, v) => acc + Number((v.pago && v.pago.efectivo) || 0), 0);

    const ventasTransferencia = ventas
        .reduce((acc, v) => acc + Number((v.pago && v.pago.transferencia) || 0), 0);

    const ventasMixtasLista = ventas.filter(v => v.metodoPago === "mixto");

    const ventasMixtas = ventasMixtasLista.length;

    const totalVentasMixtas = ventasMixtasLista.reduce((acc, v) => acc + Number(v.total || 0), 0);

    // "Maíz": no es lo que se vendió de maíz, sino lo que hay que apartar
    // por cada bolsa vendida para reponer mercadería (11.000 por bolsa de
    // 40kg, 12.000 por bolsa de 45kg/50kg). El resto de la venta es ganancia.
    const totalReservaMaiz = calcularReservaMaiz(ventas);

    const ventasDebe = ventas.filter(v =>{

        const c = clientes.find(cl => cl.id === (v.cliente && v.cliente.id));

        return c && Number(c.saldo || 0) > 0;

    }).length;

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

    const cont = document.getElementById("contenidoReporte");

    if(!cont) return;

    cont.innerHTML = `

        <div class="reportesGrid">

            <div class="cardMetrica">
                <small>💰 Venta Total</small>
                <h2>${dinero(totalVentas)}</h2>
                <span class="subMetrica">${ventas.length} ventas</span>
            </div>

            <div class="cardMetrica">
                <small>💸 Gastos</small>
                <h2>${dinero(totalGastos)}</h2>
                <span class="subMetrica">${gastosPeriodo.length} gastos</span>
            </div>

            <div class="cardMetrica">
                <small>💵 Efectivo</small>
                <h2>${dinero(ventasEfectivo)}</h2>
                
            </div>

            <div class="cardMetrica">
                <small>🏦 Transferencia</small>
                <h2>${dinero(ventasTransferencia)}</h2>
                
            </div>

            <div class="cardMetrica">
                <small>🌽 Maíz</small>
                <h2>${dinero(totalReservaMaiz)}</h2>
                
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
                    <span>${dinero(totalVentasMixtas)}</span>
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
