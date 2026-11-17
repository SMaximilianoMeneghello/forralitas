/* ==========================================
   DASHBOARD
========================================== */

function renderDashboard(){

    const cfg = configuracionSistema.dashboard;

    const hoy = fechaLocalISO(new Date());

    const mesActual = hoy.slice(0, 7);

    const ventasHoy = historialVentas.filter(v => fechaLocalISO(v.fecha) === hoy);

    // Las ventas "DEBE" (fiado) todavía no se cobraron, no se suman
    // como plata del día.
    const totalVentasHoy = ventasHoy
        .filter(v => v.metodoPago !== "debe")
        .reduce((acc,v)=>acc+Number(v.total||0),0);

    const fiadoHoy = ventasHoy
        .filter(v => v.metodoPago === "debe")
        .reduce((acc,v)=>acc+Number(v.total||0),0);

    const valorInventario = productos.reduce((acc,p)=>acc+(Number(p.precioBolsa||0)*Math.max(0, Number(p.stock||0))),0);

    const gastosMes = gastos.filter(g => String(g.fecha || "").slice(0, 7) === mesActual);

    const totalGastosMes = gastosMes.reduce((acc,g)=>acc+Number(g.monto||0),0);

    const deudores = clientes.filter(c => Number(c.saldo || 0) > 0.01);

    const totalPorCobrar = deudores.reduce((acc, c) => acc + Number(c.saldo || 0), 0);

    const ultimasVentas = [...historialVentas]
        .sort((a,b)=>new Date(b.fecha)-new Date(a.fecha))
        .slice(0, Math.max(1, Number(cfg.cantidadVentas) || 5));

    const pocoStock = productos
        .filter(productoConStockBajo)
        .sort((a,b)=>Number(a.stock || 0)-Number(b.stock || 0))
        .slice(0,8);

    const pagosProveedorPendientes = [];

    if(puede("proveedores")){

        proveedores.forEach(prov =>{

            (prov.compras || []).forEach(c =>{

                if(Number(c.saldoPendiente || 0) > 0.01 && c.fechaVencimiento && c.fechaVencimiento <= hoy){

                    pagosProveedorPendientes.push({
                        proveedor: prov.nombre,
                        descripcion: c.descripcion,
                        monto: c.saldoPendiente,
                        vencido: c.fechaVencimiento < hoy,
                        fechaVencimientoTexto: c.fechaVencimientoTexto || fechaTextoDeISO(c.fechaVencimiento)
                    });

                }

            });

        });

    }

    pagosProveedorPendientes.sort((a, b) => (b.vencido - a.vencido));

    contenido().innerHTML=`

    ${
        pagosProveedorPendientes.length ? `
            <div class="card" style="border:2px solid var(--rojo);margin-bottom:20px">
                <h2>🚨 Pagos a proveedores para hoy</h2>
                ${pagosProveedorPendientes.map(p => `
                    <div class="ventaDashboard">
                        <div>
                            <strong>${esc(p.proveedor)}</strong>
                            <small>${esc(p.descripcion)} ${p.vencido ? "— vencido el " + esc(p.fechaVencimientoTexto) : "— vence hoy"}</small>
                        </div>
                        <span class="saldoDeuda">${dinero(p.monto)}</span>
                    </div>
                `).join("")}
            </div>
        ` : ""
    }

    <div class="dashboardGrid">

        <div class="cardMetrica">
            <small>💰 Ventas de hoy</small>
            <h2>${dinero(totalVentasHoy)}</h2>
            <span class="subMetrica">${ventasHoy.length} ventas${fiadoHoy > 0 ? " · fiado: " + dinero(fiadoHoy) : ""}</span>
        </div>

        <div class="cardMetrica">
            <small>💳 Por cobrar</small>
            <h2>${dinero(totalPorCobrar)}</h2>
            <span class="subMetrica">${deudores.length} cliente(s) con deuda</span>
        </div>

        ${esAdmin() ? `
        <div class="cardMetrica">
            <small>📦 Valor inventario</small>
            <h2>${dinero(valorInventario)}</h2>
            <span class="subMetrica">${productos.length} productos</span>
        </div>

        <div class="cardMetrica">
            <small>🧾 Gastos del mes</small>
            <h2>${dinero(totalGastosMes)}</h2>
            <span class="subMetrica">${gastosMes.length} registrados</span>
        </div>
        ` : `
        <div class="cardMetrica">
            <small>📦 Productos</small>
            <h2>${productos.length}</h2>
            <span class="subMetrica">${pocoStock.length ? "hay productos con poco stock" : "stock en orden"}</span>
        </div>

        <div class="cardMetrica">
            <small>👥 Clientes</small>
            <h2>${clientes.length}</h2>
            <span class="subMetrica">registrados</span>
        </div>
        `}

    </div>

    <div class="dashboardResumen">

        ${cfg.mostrarUltimasVentas ? `
        <div class="card">

            <h2>🧾 Últimas ventas</h2>

            ${
                ultimasVentas.length
                ?
                ultimasVentas.map(v=>`
                    <div class="ventaDashboard">
                        <div>
                            <strong>${esc(nombreClienteVenta(v))}</strong>
                            <small>${esc(fechaHoraTexto(v.fecha))}${v.metodoPago === "debe" && pendienteVenta(v) > 0 ? " · DEBE" : ""}</small>
                        </div>
                        <span>${dinero(v.total)}</span>
                    </div>
                `).join("")
                :
                `<p>No hay ventas registradas.</p>`
            }

        </div>
        ` : ""}

        ${cfg.mostrarStock ? `
        <div class="card">

            <h2>⚠ Productos con poco stock</h2>

            ${
                pocoStock.length
                ?
                pocoStock.map(p=>`
                    <div class="stockDashboard">
                        <strong>${esc(p.nombre)}</strong>
                        <span class="stockRojo">${formatearStock(p.stock)}</span>
                    </div>
                `).join("")
                :
                `<p>No hay productos con poco stock.</p>`
            }

        </div>
        ` : ""}

    </div>

    `;

}
