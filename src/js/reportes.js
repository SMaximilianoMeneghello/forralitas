/* ==========================================
   CAJA (REPORTES)
========================================== */

function puedeVerCajaCompleta(){

    return puede("verCajaCompleta");

}

function renderReportes(){

    const filtroEmpleadoHtml = puedeVerCajaCompleta()
        ? `
            <div class="grupoInput">
                <label>Empleado</label>
                <select id="empleadoReporte">
                    <option value="">Todos los empleados</option>
                    ${obtenerListaEmpleadosParaFiltro()
                        .map(nombre => `<option value="${esc(nombre)}">${esc(nombre)}</option>`)
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

                <button class="btnTodas" id="btnMesReporte">Este mes</button>

                <button class="btnSecundario" id="btnImprimirReporte">🖨️ Imprimir</button>

                <button class="btnSecundario" id="btnExportarReporte">⬇ Excel</button>

            </div>

            ${
                !puedeVerCajaCompleta()
                ? `<p class="notaEliminaciones" style="margin-bottom:16px">
                        Esta caja muestra únicamente lo que cargaste vos
                        (${esc(usuarioActual ? usuarioActual.nombre : "")}), para que
                        no se mezcle con lo registrado por otras personas.
                   </p>`
                : ""
            }

            <div id="contenidoReporte"></div>

        </div>

    `;

    document.getElementById("btnGenerarReporte").onclick = generarReporte;

    document.getElementById("btnHoyReporte").onclick = filtrarHoyReporte;

    document.getElementById("btnMesReporte").onclick = ()=>{

        const hoy = new Date();

        document.getElementById("fechaDesdeReporte").value =
            fechaLocalISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));

        document.getElementById("fechaHastaReporte").value = fechaLocalISO(hoy);

        generarReporte();

    };

    document.getElementById("btnImprimirReporte").onclick = imprimirReporte;

    document.getElementById("btnExportarReporte").onclick = exportarReporteCSV;

    const selEmpleado = document.getElementById("empleadoReporte");

    if(selEmpleado) selEmpleado.onchange = generarReporte;

    filtrarHoyReporte();

}

function filtrarHoyReporte(){

    const hoy = fechaLocalISO(new Date());

    document.getElementById("fechaDesdeReporte").value = hoy;

    document.getElementById("fechaHastaReporte").value = hoy;

    generarReporte();

}

/* ==========================================
   CÁLCULO DE LA CAJA DE UN PERÍODO
========================================== */

// Reglas que antes estaban fijas en el programa. Solo se usan para
// ventas viejas de productos que ya no existen (ver migrarDatos).
const REGLAS_SEPARAR_ANTERIORES = {
    "MAIZX40KG": { monto: 11000, grupo: "Maíz" },
    "MAIZX45KG": { monto: 12000, grupo: "Maíz" },
    "MAIZX50KG": { monto: 12000, grupo: "Maíz" },
    "ALFAVERDE": { monto: 5000, grupo: "Alfa" }
};

/* Cuánto hay que "separar" (reservar para reponer mercadería) por
   cada bolsa vendida de este producto. */
function separarDeItem(item){

    if(item.modo !== "bolsa") return null;

    if(item.separar !== undefined){

        return Number(item.separar) > 0
            ? { monto: Number(item.separar), grupo: item.grupoSeparar || item.nombre }
            : null;

    }

    const producto = productos.find(p => p.id === item.id);

    if(producto){

        return Number(producto.separarPorBolsa) > 0
            ? { monto: Number(producto.separarPorBolsa), grupo: producto.grupoSeparar || producto.nombre }
            : null;

    }

    if(configuracionSistema.migraciones && configuracionSistema.migraciones.reglasSepararAnteriores){

        return REGLAS_SEPARAR_ANTERIORES[normalizarNombreProducto(item.nombre)] || null;

    }

    return null;

}

function costoDeItem(item){

    if(item.costo !== undefined) return Number(item.costo) || 0;

    const producto = productos.find(p => p.id === item.id);

    return producto ? (Number(producto.costoBolsa) || 0) : 0;

}

function calcularCaja(desde, hasta, empleado){

    const enPeriodo = (f) => !(desde && f < desde) && !(hasta && f > hasta);

    const deEmpleado = (reg) => !empleado || (reg.vendedor && reg.vendedor.nombre) === empleado;

    const ventas = historialVentas.filter(v => enPeriodo(fechaLocalISO(v.fecha)) && deEmpleado(v));

    // Los gastos viejos sin usuario asignado solo se ven en la vista "Todos".
    const gastosPeriodo = gastos.filter(g => enPeriodo(g.fecha || "") && deEmpleado(g));

    // Cobros de deudas de clientes: esta plata entra a la caja el día
    // que se COBRA, no el día de la venta original.
    const cobros = clientes
        .flatMap(c => (c.pagos || []).map(p => ({ ...p, cliente: c.nombre })))
        .filter(p => enPeriodo(fechaLocalISO(p.fecha)) && deEmpleado(p));

    const sumar = (lista, fn) => redondear(lista.reduce((acc, x) => acc + (Number(fn(x)) || 0), 0), 2);

    // Las ventas marcadas "DEBE" todavía no se cobraron: no cuentan
    // como plata real en Total Ventas / métodos de pago.
    const ventasCobradas = ventas.filter(v => v.metodoPago !== "debe");

    const ventasFiadas = ventas.filter(v => v.metodoPago === "debe");

    const ventasEfectivo = sumar(ventasCobradas, v => v.pago && v.pago.efectivo);

    const ventasTransferencia = sumar(ventasCobradas, v => v.pago && v.pago.transferencia);

    const cobrosEfectivo = sumar(cobros, p => p.pago ? p.pago.efectivo : p.monto);

    const cobrosTransferencia = sumar(cobros, p => p.pago ? p.pago.transferencia : 0);

    const gastosEfectivo = sumar(gastosPeriodo, g => g.pago ? g.pago.efectivo : g.monto);

    const gastosTransferencia = sumar(gastosPeriodo, g => g.pago ? g.pago.transferencia : 0);

    const porCliente = {};
    const porProducto = {};
    const separar = {};

    let ganancia = 0;
    let ventasConCosto = 0;

    ventas.forEach(v =>{

        const nombre = nombreClienteVenta(v);

        porCliente[nombre] = (porCliente[nombre] || 0) + Number(v.total || 0);

        let tieneCosto = false;

        (v.productos || []).forEach(item =>{

            const nombreProducto = item.nombre || "(sin nombre)";

            porProducto[nombreProducto] = (porProducto[nombreProducto] || 0) + Number(item.bolsas || 0);

            const regla = separarDeItem(item);

            if(regla){

                const bolsas = Number(item.cantidad || item.bolsas || 0);

                if(!separar[regla.grupo]) separar[regla.grupo] = { monto: 0, bolsas: 0 };

                separar[regla.grupo].monto += bolsas * regla.monto;
                separar[regla.grupo].bolsas += bolsas;

            }

            const costo = costoDeItem(item);

            if(costo > 0){

                ganancia += Number(item.subtotal || 0) - costo * Number(item.bolsas || 0);

                tieneCosto = true;

            }

        });

        if(tieneCosto) ventasConCosto++;

    });

    return {
        ventas,
        ventasCobradas,
        ventasFiadas,
        gastosPeriodo,
        cobros,
        totalVentas: sumar(ventasCobradas, v => v.total),
        totalFiado: sumar(ventasFiadas, v => v.total),
        totalGastos: sumar(gastosPeriodo, g => g.monto),
        totalCobrado: sumar(cobros, p => p.monto),
        ventasEfectivo,
        ventasTransferencia,
        cobrosEfectivo,
        cobrosTransferencia,
        gastosEfectivo,
        gastosTransferencia,
        dineroEfectivo: redondear(ventasEfectivo + cobrosEfectivo - gastosEfectivo, 2),
        dineroTransferencia: redondear(ventasTransferencia + cobrosTransferencia - gastosTransferencia, 2),
        totalMixto: sumar(ventasCobradas.filter(v => v.metodoPago === "mixto"), v => v.total),
        topClientes: Object.entries(porCliente).sort((a, b) => b[1] - a[1]).slice(0, 8),
        topProductos: Object.entries(porProducto).sort((a, b) => b[1] - a[1]).slice(0, 8),
        separar: Object.entries(separar).sort((a, b) => b[1].monto - a[1].monto),
        ganancia: redondear(ganancia, 2),
        ventasConCosto
    };

}

function filtrosReporteActuales(){

    const desde = document.getElementById("fechaDesdeReporte")?.value || "";

    const hasta = document.getElementById("fechaHastaReporte")?.value || "";

    // Un empleado sin permiso ve nada más que su propia caja.
    const empleado = puedeVerCajaCompleta()
        ? (document.getElementById("empleadoReporte")?.value || "")
        : (usuarioActual ? usuarioActual.nombre : "");

    return { desde, hasta, empleado };

}

function generarReporte(){

    const cont = document.getElementById("contenidoReporte");

    if(!cont) return;

    const { desde, hasta, empleado } = filtrosReporteActuales();

    const c = calcularCaja(desde, hasta, empleado);

    const contar = (metodo) => c.ventas.filter(v => v.metodoPago === metodo).length;

    cont.innerHTML = `

        <div class="reportesGrid">

            <div class="cardMetrica">
                <small>💰 Venta Total</small>
                <h2>${dinero(c.totalVentas)}</h2>
                <span class="subMetrica">${c.ventasCobradas.length} ventas cobradas</span>
            </div>

            <div class="cardMetrica">
                <small>💸 Total de gastos</small>
                <h2>${dinero(c.totalGastos)}</h2>
                <span class="subMetrica">${c.gastosPeriodo.length} gastos</span>
            </div>

            <div class="cardMetrica">
                <small>💵 Dinero en efectivo</small>
                <h2>${dinero(c.dineroEfectivo)}</h2>
                <span class="subMetrica">ventas + cobros de deuda, menos gastos (todo en efectivo)</span>
            </div>

            <div class="cardMetrica">
                <small>🏦 Dinero en transferencia</small>
                <h2>${dinero(c.dineroTransferencia)}</h2>
                <span class="subMetrica">ventas + cobros de deuda, menos gastos (todo en transferencia)</span>
            </div>

            ${c.totalFiado > 0 ? `
            <div class="cardMetrica">
                <small>📝 Vendido fiado</small>
                <h2>${dinero(c.totalFiado)}</h2>
                <span class="subMetrica">${c.ventasFiadas.length} ventas "DEBE" (no cuentan como plata cobrada)</span>
            </div>
            ` : ""}

            ${c.separar.map(([grupo, d]) => `
            <div class="cardMetrica">
                <small>🌾 Separar ${esc(grupo)}</small>
                <h2>${dinero(d.monto)}</h2>
                <span class="subMetrica">${formatearStock(d.bolsas)} bolsas vendidas</span>
            </div>
            `).join("")}

            ${esAdmin() && c.ventasConCosto > 0 ? `
            <div class="cardMetrica">
                <small>📈 Ganancia estimada</small>
                <h2>${dinero(c.ganancia)}</h2>
                <span class="subMetrica">sobre los productos que tienen costo cargado</span>
            </div>
            ` : ""}

        </div>

        <div class="dashboardResumen">

            <div class="card">

                <h2>💵 Métodos de pago</h2>

                <div class="ventaDashboard">
                    <div>
                        <strong>Efectivo</strong>
                        <small>${contar("efectivo")} ventas</small>
                    </div>
                    <span>${dinero(c.ventasEfectivo)}</span>
                </div>

                <div class="ventaDashboard">
                    <div>
                        <strong>Transferencia</strong>
                        <small>${contar("transferencia")} ventas</small>
                    </div>
                    <span>${dinero(c.ventasTransferencia)}</span>
                </div>

                <div class="ventaDashboard">
                    <div>
                        <strong>Mixto</strong>
                        <small>${contar("mixto")} ventas (ya repartido arriba entre efectivo y transferencia)</small>
                    </div>
                    <span>${dinero(c.totalMixto)}</span>
                </div>

                <div class="ventaDashboard" style="border-top:2px dashed #eee;margin-top:8px;padding-top:14px">
                    <div>
                        <strong>💳 Cobros de deuda</strong>
                        <small>${c.cobros.length} pagos de clientes (E: ${dinero(c.cobrosEfectivo)} · T: ${dinero(c.cobrosTransferencia)})</small>
                    </div>
                    <span>${dinero(c.totalCobrado)}</span>
                </div>

                <div class="ventaDashboard">
                    <div>
                        <strong>💸 Gastos</strong>
                        <small>E: ${dinero(c.gastosEfectivo)} · T: ${dinero(c.gastosTransferencia)}</small>
                    </div>
                    <span class="saldoDeuda">− ${dinero(c.totalGastos)}</span>
                </div>

            </div>

            <div class="card">

                <h2>🏆 Top productos</h2>

                ${
                    c.topProductos.length
                    ? c.topProductos.map(([nombre, cant]) => `
                        <div class="ventaDashboard">
                            <div>
                                <strong>${esc(nombre)}</strong>
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
                c.topClientes.length
                ? `<div class="tablaProveedores">
                    <table>
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Total comprado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${c.topClientes.map(([nombre, total]) => `
                                <tr>
                                    <td><strong>${esc(nombre)}</strong></td>
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

/* ==========================================
   IMPRIMIR / EXPORTAR LA CAJA
========================================== */

function textoPeriodoReporte(f){

    const d = f.desde ? fechaTextoDeISO(f.desde) : "el inicio";
    const h = f.hasta ? fechaTextoDeISO(f.hasta) : "hoy";

    return (f.desde && f.desde === f.hasta ? "Día " + d : "Desde " + d + " hasta " + h)
        + (f.empleado ? " · " + f.empleado : " · Todos");

}

function filasResumenCaja(c){

    const filas = [
        ["Ventas cobradas (" + c.ventasCobradas.length + ")", c.totalVentas],
        ["   en efectivo", c.ventasEfectivo],
        ["   en transferencia", c.ventasTransferencia],
        ["Cobros de deuda (" + c.cobros.length + ")", c.totalCobrado],
        ["   en efectivo", c.cobrosEfectivo],
        ["   en transferencia", c.cobrosTransferencia],
        ["Gastos (" + c.gastosPeriodo.length + ")", -c.totalGastos],
        ["   en efectivo", -c.gastosEfectivo],
        ["   en transferencia", -c.gastosTransferencia],
        ["DINERO EN EFECTIVO", c.dineroEfectivo],
        ["DINERO EN TRANSFERENCIA", c.dineroTransferencia],
        ["Vendido fiado, sin cobrar (" + c.ventasFiadas.length + ")", c.totalFiado]
    ];

    c.separar.forEach(([grupo, d]) =>{

        filas.push(["Separar " + grupo + " (" + formatearStock(d.bolsas) + " bolsas)", d.monto]);

    });

    return filas;

}

function imprimirReporte(){

    const f = filtrosReporteActuales();

    const c = calcularCaja(f.desde, f.hasta, f.empleado);

    const n = configuracionSistema.negocio || {};

    const filaGasto = g => `
        <tr>
            <td>${esc(g.fechaTexto || fechaTextoDeISO(g.fecha))}</td>
            <td>${esc(g.descripcion)}</td>
            <td class="derecha">${dinero(g.monto)}</td>
        </tr>
    `;

    imprimirHtml(`
        <div class="hojaImpresion">
            <h1>${esc(n.nombre || "")}</h1>
            <h2>Caja</h2>
            <p>${esc(textoPeriodoReporte(f))} · Impreso el ${esc(fechaHoraTexto(new Date()))}</p>
            <table>
                <tbody>
                    ${filasResumenCaja(c).map(([texto, monto]) => `
                        <tr class="${/^[A-ZÁÉÍÓÚ ]+$/.test(texto) ? "filaFuerte" : ""}">
                            <td>${esc(texto).replace(/^ +/, "&nbsp;&nbsp;&nbsp;&nbsp;")}</td>
                            <td class="derecha">${dinero(monto)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
            ${c.gastosPeriodo.length ? `
                <h3>Detalle de gastos</h3>
                <table>
                    <thead><tr><th>Fecha</th><th>Descripción</th><th class="derecha">Monto</th></tr></thead>
                    <tbody>${c.gastosPeriodo.map(filaGasto).join("")}</tbody>
                </table>
            ` : ""}
        </div>
    `, "impresionHoja");

}

function exportarReporteCSV(){

    const f = filtrosReporteActuales();

    const c = calcularCaja(f.desde, f.hasta, f.empleado);

    const filas = [["Caja", textoPeriodoReporte(f)], []]
        .concat(filasResumenCaja(c).map(([texto, monto]) => [texto.trim(), monto]));

    descargarArchivo("Caja_" + (f.desde || "inicio") + "_" + (f.hasta || "hoy") + ".csv", generarCSV(filas), "text/csv;charset=utf-8");

    notificacion("Caja exportada.");

}
