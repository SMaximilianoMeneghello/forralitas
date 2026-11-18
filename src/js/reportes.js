/* ==========================================
   REPORTES
========================================== */

// Las reservas por producto ("Separar Maíz", "Separar Alfa") se
// configuran en Configuración > Negocio: ver src/js/negocio.js.

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

                <button class="btnHoy" id="btnSemanaReporte">Semanal</button>

                <button class="btnHoy" id="btnMesReporte">Mensual</button>

            </div>

            <div id="selectorPeriodoReporte" class="reportesFiltros oculto"></div>

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

    document.getElementById("btnGenerarReporte").onclick = ()=>{

        ocultarSelectorPeriodoReporte();
        generarReporte();

    };

    document.getElementById("btnHoyReporte").onclick = filtrarHoyReporte;

    document.getElementById("btnSemanaReporte").onclick = mostrarSelectorSemanaReporte;

    document.getElementById("btnMesReporte").onclick = mostrarSelectorMesReporte;

    const hoy = fechaLocalISO(new Date());

    document.getElementById("fechaDesdeReporte").value = hoy;

    document.getElementById("fechaHastaReporte").value = hoy;

    generarReporte();

}

function filtrarHoyReporte(){

    ocultarSelectorPeriodoReporte();

    const hoy = fechaLocalISO(new Date());

    document.getElementById("fechaDesdeReporte").value = hoy;

    document.getElementById("fechaHastaReporte").value = hoy;

    generarReporte();

}

/* ==========================================
   FILTROS RÁPIDOS: SEMANAL Y MENSUAL
   ------------------------------------------
   Las semanas son de lunes a sábado (el negocio
   no abre los domingos), semanas de calendario de
   verdad, no un reparto fijo de días del mes. La
   semana 1 de un mes es la semana (lunes a sábado)
   que contiene el día 1, aunque ese lunes sea del
   mes anterior; a partir de ahí se suman de a 7
   días hasta cubrir todo el mes. Por eso un mes
   puede tener 4, 5 o 6 "semanas" según cómo caiga.
   "Semanal" y "Mensual" arrancan mostrando el
   período que contiene la fecha de hoy, pero se
   puede elegir otro mes/semana con los selectores
   que aparecen.
========================================== */

// Lista de semanas (lunes a sábado) que tocan el mes dado, en orden.
function semanasDelMes(anio, mesIndice){

    const ultimoDiaMes = new Date(anio, mesIndice + 1, 0);

    const diaUno = new Date(anio, mesIndice, 1);

    // getDay(): 0 = domingo ... 6 = sábado. Retrocede hasta el lunes de
    // esa misma semana (si el día 1 ya es lunes, se queda ahí).
    const diasHastaLunes = (diaUno.getDay() + 6) % 7;

    const lunes = new Date(anio, mesIndice, 1 - diasHastaLunes);

    const semanas = [];

    while(lunes <= ultimoDiaMes){

        const sabado = new Date(lunes);
        sabado.setDate(sabado.getDate() + 5);

        semanas.push({ desde: new Date(lunes), hasta: sabado });

        lunes.setDate(lunes.getDate() + 7);

    }

    return semanas;

}

// Qué semana (índice 1 en adelante, de la lista de semanasDelMes) le
// corresponde a una fecha puntual, para resaltarla por defecto.
function indiceSemanaPorFecha(semanas, fecha){

    const indice = semanas.findIndex(s => fecha >= s.desde && fecha <= s.hasta);

    return indice === -1 ? 0 : indice;

}

function etiquetaRangoSemana(semana){

    const formato = f => f.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });

    return formato(semana.desde) + " al " + formato(semana.hasta);

}

function rangoSemanaDelMes(anio, mesIndice, semana){

    const semanas = semanasDelMes(anio, mesIndice);

    const elegida = semanas[semana - 1] || semanas[0];

    return {
        desde: fechaLocalISO(elegida.desde),
        hasta: fechaLocalISO(elegida.hasta)
    };

}

function rangoMesCompleto(anio, mesIndice){

    return {
        desde: fechaLocalISO(new Date(anio, mesIndice, 1)),
        hasta: fechaLocalISO(new Date(anio, mesIndice + 1, 0))
    };

}

function capitalizarTexto(texto){

    return texto.charAt(0).toUpperCase() + texto.slice(1);

}

// Últimos 12 meses (incluido el actual) para elegir en los selectores.
function opcionesMesesReporte(){

    const hoy = new Date();

    const opciones = [];

    for(let i = 0; i < 12; i++){

        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);

        opciones.push({
            valor: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"),
            anio: d.getFullYear(),
            mesIndice: d.getMonth(),
            etiqueta: capitalizarTexto(d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }))
        });

    }

    return opciones;

}

function ocultarSelectorPeriodoReporte(){

    const cont = document.getElementById("selectorPeriodoReporte");

    if(!cont) return;

    cont.classList.add("oculto");
    cont.innerHTML = "";

}

function mostrarSelectorSemanaReporte(){

    const cont = document.getElementById("selectorPeriodoReporte");

    if(!cont) return;

    const opciones = opcionesMesesReporte();
    const valorMesActual = opciones[0].valor;

    cont.classList.remove("oculto");

    cont.innerHTML = `
        <div class="grupoInput">
            <label>Mes</label>
            <select id="mesSemanaReporte">
                ${opciones.map(o => `<option value="${o.valor}">${o.etiqueta}</option>`).join("")}
            </select>
        </div>
        <div class="grupoInput">
            <label>Semana</label>
            <select id="semanaReporte"></select>
        </div>
    `;

    document.getElementById("mesSemanaReporte").value = valorMesActual;

    document.getElementById("mesSemanaReporte").onchange = repoblarSemanasReporte;
    document.getElementById("semanaReporte").onchange = aplicarSemanaSeleccionadaReporte;

    repoblarSemanasReporte();

}

// Recalcula las semanas (lunes a sábado) del mes elegido en el selector
// y las vuelve a listar: hace falta cada vez que cambia el mes porque la
// cantidad de semanas y sus fechas dependen de cómo cae el 1° del mes.
function repoblarSemanasReporte(){

    const [anio, mes] = document.getElementById("mesSemanaReporte").value.split("-").map(Number);
    const mesIndice = mes - 1;

    const semanas = semanasDelMes(anio, mesIndice);

    const hoy = new Date();
    const esMesActual = anio === hoy.getFullYear() && mesIndice === hoy.getMonth();

    const indiceDefault = esMesActual ? indiceSemanaPorFecha(semanas, hoy) : 0;

    const select = document.getElementById("semanaReporte");

    select.innerHTML = semanas

        .map((s, i) => `<option value="${i + 1}">Semana ${i + 1} (${etiquetaRangoSemana(s)})</option>`)

        .join("");

    select.value = String(indiceDefault + 1);

    aplicarSemanaSeleccionadaReporte();

}

function aplicarSemanaSeleccionadaReporte(){

    const [anio, mes] = document.getElementById("mesSemanaReporte").value.split("-").map(Number);
    const semana = Number(document.getElementById("semanaReporte").value);

    const { desde, hasta } = rangoSemanaDelMes(anio, mes - 1, semana);

    document.getElementById("fechaDesdeReporte").value = desde;
    document.getElementById("fechaHastaReporte").value = hasta;

    generarReporte();

}

function mostrarSelectorMesReporte(){

    const cont = document.getElementById("selectorPeriodoReporte");

    if(!cont) return;

    const opciones = opcionesMesesReporte();
    const valorMesActual = opciones[0].valor;

    cont.classList.remove("oculto");

    cont.innerHTML = `
        <div class="grupoInput">
            <label>Mes</label>
            <select id="mesCompletoReporte">
                ${opciones.map(o => `<option value="${o.valor}">${o.etiqueta}</option>`).join("")}
            </select>
        </div>
    `;

    document.getElementById("mesCompletoReporte").value = valorMesActual;
    document.getElementById("mesCompletoReporte").onchange = aplicarMesSeleccionadoReporte;

    aplicarMesSeleccionadoReporte();

}

function aplicarMesSeleccionadoReporte(){

    const [anio, mes] = document.getElementById("mesCompletoReporte").value.split("-").map(Number);

    const { desde, hasta } = rangoMesCompleto(anio, mes - 1);

    document.getElementById("fechaDesdeReporte").value = desde;
    document.getElementById("fechaHastaReporte").value = hasta;

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

    const cobrosTarjeta = cobrosPeriodo
        .reduce((acc, p) => acc + (p.pago ? Number(p.pago.tarjeta || 0) : 0), 0);

    // Las ventas marcadas "DEBE" todavía no se cobraron: no cuentan
    // como plata real en Total Ventas / métodos de pago. (Los pagos que
    // se van cobrando después de una venta fiada se ven en el historial
    // de pagos de cada cliente, todavía no se suman acá al período).
    const ventasCobradas = ventas.filter(v => v.metodoPago !== "debe");

    // El Total Ventas tiene que reflejar la plata real que entró en el
    // período: las ventas cobradas directo, MÁS los cobros de deuda
    // (fiados que se pagaron después), para que la caja cierre con el
    // monto real disponible.
    const totalVentas = ventasCobradas.reduce((acc, v) => acc + Number(v.total || 0), 0)
        + totalCobrado;

    const totalGastos = gastosPeriodo.reduce((acc, g) => acc + Number(g.monto || 0), 0);

    // Se suma lo que realmente entró en efectivo/transferencia de CADA
    // venta (incluida la parte que corresponde de las ventas con pago
    // mixto), y se le resta lo que salió en gastos con ese mismo método.
    const ventasEfectivo = ventasCobradas
        .reduce((acc, v) => acc + Number((v.pago && v.pago.efectivo) || 0), 0);

    const ventasTransferencia = ventasCobradas
        .reduce((acc, v) => acc + Number((v.pago && v.pago.transferencia) || 0), 0);

    const ventasTarjeta = ventasCobradas
        .reduce((acc, v) => acc + Number((v.pago && v.pago.tarjeta) || 0), 0);

    const gastosEfectivo = gastosPeriodo
        .reduce((acc, g) => acc + (g.pago ? Number(g.pago.efectivo || 0) : Number(g.monto || 0)), 0);

    const gastosTransferencia = gastosPeriodo
        .reduce((acc, g) => acc + (g.pago ? Number(g.pago.transferencia || 0) : 0), 0);

    const dineroEfectivo = ventasEfectivo + cobrosEfectivo - gastosEfectivo;

    const dineroTransferencia = ventasTransferencia + cobrosTransferencia - gastosTransferencia;

    // No hay gastos pagados con tarjeta todavía en la app, pero se deja
    // la resta preparada por si se agrega más adelante.
    const dineroTarjeta = ventasTarjeta + cobrosTarjeta;

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
       RESERVAS POR PRODUCTO (ver negocio.js)
       Solo se separa la plata que ya entró:
       - ventas cobradas (PAGA) al momento;
       - cobros de deudas (fiados), en proporción
         a lo que el cliente pagó de esa venta.
       Una venta DEBE no suma nada hasta que se cobra.
    ========================================== */

    const separar = {};

    ventasCobradas.forEach(v => sumarSeparaciones(separar, calcularSeparacionVenta(v), 1));

    cobrosPeriodo.forEach(p =>{

        const venta = historialVentas.find(v => v.id === p.ventaId);

        if(!venta || !(Number(venta.total) > 0)) return;

        const fraccion = Number(p.monto || 0) / Number(venta.total);

        sumarSeparaciones(separar, calcularSeparacionVenta(venta), fraccion);

    });

    const cont = document.getElementById("contenidoReporte");

    if(!cont) return;

    cont.innerHTML = `

        <div class="reportesGrid">

            <div class="cardMetrica">
                <small>💰 Venta Total</small>
                <h2>${dinero(totalVentas)}</h2>
                <span class="subMetrica">${ventasCobradas.length} ventas + ${cobrosPeriodo.length} cobros de deuda</span>
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
                <small>💳 Dinero en tarjeta</small>
                <h2>${dinero(dineroTarjeta)}</h2>
                <span class="subMetrica">ventas + cobros de deuda cobrados con tarjeta</span>
            </div>

            ${tarjetasReservasHTML(separar)}

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
                        <strong>Tarjeta</strong>
                        <small>${ventas.filter(v => v.metodoPago === "tarjeta").length} ventas</small>
                    </div>
                    <span>${dinero(ventasTarjeta)}</span>
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
                        <small>${cobrosPeriodo.length} pagos de clientes (E: ${dinero(cobrosEfectivo)} · T: ${dinero(cobrosTransferencia)} · Tar: ${dinero(cobrosTarjeta)})</small>
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
