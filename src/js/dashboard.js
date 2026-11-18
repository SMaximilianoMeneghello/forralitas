/* ==========================================
   DASHBOARD V3
========================================== */

function renderDashboard(){

    const totalProductos = productos.length;

    const valorInventario = productos.reduce((acc,p)=>acc+(Number(p.precioBolsa||0)*Number(p.stock||0)),0);

    const hoy = fechaLocalISO(new Date());

    const ventasHoy = historialVentas.filter(v=>fechaLocalISO(v.fecha)===hoy);

    // Las ventas "DEBE" (fiado) todavía no se cobraron, no se suman
    // como plata del día.
    const ventasHoyCobradas = ventasHoy.filter(v => v.metodoPago !== "debe");

    // Cobros de deuda de clientes (fiados pagados hoy): esta plata entró
    // hoy aunque la venta original sea de otro día, así que también
    // cuenta como plata real del día de hoy.
    const cobrosHoy = clientes.flatMap(c => c.pagos || [])
        .filter(p => fechaLocalISO(p.fecha) === hoy);

    const totalVentasHoy = ventasHoyCobradas.reduce((acc,v)=>acc+Number(v.total||0),0)
        + cobrosHoy.reduce((acc,p)=>acc+Number(p.monto||0),0);

    const totalGastos = gastos.reduce((acc,g)=>acc+Number(g.monto||0),0);

    const ultimasVentas=[...historialVentas]
    .sort((a,b)=>new Date(b.fecha)-new Date(a.fecha))
    .slice(0,5);

    const pocoStock=productos
    .filter(p=>Number(p.stock)<=Number(p.stockMinimo||5))
    .sort((a,b)=>a.stock-b.stock)
    .slice(0,8);

    const hoyISO = fechaLocalISO(new Date());

    const pagosProveedorPendientes = [];

    proveedores.forEach(prov =>{

        (prov.compras || []).forEach(c =>{

            if(Number(c.saldoPendiente || 0) > 0.01 && c.fechaVencimiento && c.fechaVencimiento <= hoyISO){

                pagosProveedorPendientes.push({

                    proveedor: prov.nombre,
                    proveedorId: prov.id,
                    descripcion: c.descripcion,
                    monto: c.saldoPendiente,
                    vencido: c.fechaVencimiento < hoyISO,
                    fechaVencimientoTexto: c.fechaVencimientoTexto

                });

            }

        });

    });

    pagosProveedorPendientes.sort((a, b) => (b.vencido - a.vencido));

    contenido().innerHTML=`

    ${
        pagosProveedorPendientes.length ? `
            <div class="card" style="border:2px solid var(--rojo);margin-bottom:20px">
                <h2>🚨 Pagos a proveedores para hoy</h2>
                ${pagosProveedorPendientes.map(p => `
                    <div class="ventaDashboard">
                        <div>
                            <strong>${p.proveedor}</strong>
                            <small>${p.descripcion} ${p.vencido ? "— vencido el " + p.fechaVencimientoTexto : "— vence hoy"}</small>
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
            <span class="subMetrica">${ventasHoyCobradas.length} ventas + ${cobrosHoy.length} cobros de deuda</span>
        </div>

        <div class="cardMetrica">
            <small>📦 Valor inventario</small>
            <h2>${dinero(valorInventario)}</h2>
            <span class="subMetrica">${totalProductos} productos</span>
        </div>

        <div class="cardMetrica">
            <small>🧾 Gastos</small>
            <h2>${dinero(totalGastos)}</h2>
            <span class="subMetrica">${gastos.length} registrados</span>
        </div>

        <div class="cardMetrica">
            <small>👥 Clientes</small>
            <h2>${clientes.length}</h2>
            <span class="subMetrica">registrados</span>
        </div>

    </div>

    <div class="dashboardResumen">

        <div class="card">

            <h2>🧾 Últimas ventas</h2>

            ${
                ultimasVentas.length

                ?

                ultimasVentas.map(v=>`

                    <div class="ventaDashboard">

                        <div>

                            <strong>${(v.cliente && v.cliente.nombre) ? v.cliente.nombre : "Consumidor Final"}</strong>

                            <small>${fechaHoraTexto(v.fecha)}</small>

                        </div>

                        <span>${dinero(v.total)}</span>

                    </div>

                `).join("")

                :

                `<p>No hay ventas registradas.</p>`

            }

        </div>

        <div class="card">

            <h2>⚠ Productos con poco stock</h2>

            ${
                pocoStock.length

                ?

                pocoStock.map(p=>`

                    <div class="stockDashboard">

                        <strong>${p.nombre}</strong>

                        <span class="stockRojo">

                            ${formatearStock(p.stock)}

                        </span>

                    </div>

                `).join("")

                :

                `<p>No hay productos con poco stock.</p>`

            }

        </div>

    </div>

    `;

}
