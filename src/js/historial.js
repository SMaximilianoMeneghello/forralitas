/* ==========================================
   HISTORIAL DE VENTAS
========================================== */

function renderHistorial(){

    const opcionesEmpleados = obtenerListaEmpleadosParaFiltro()
        .map(nombre => `<option value="${esc(nombre)}">${esc(nombre)}</option>`)
        .join("");

    contenido().innerHTML = `

        <div class="historialVentas">

            <div class="historialBuscador">

                <div class="grupoInput">
                    <label>Desde</label>
                    <input type="date" id="fechaDesdeHistorial">
                </div>

                <div class="grupoInput">
                    <label>Hasta</label>
                    <input type="date" id="fechaHastaHistorial">
                </div>

                <div class="grupoInput">
                    <label>Desde la hora</label>
                    <select id="horaDesdeHistorial">
                        <option value="">Cualquier hora</option>
                        ${Array.from({ length: 24 }, (_, h) =>
                            `<option value="${h}">${String(h).padStart(2,"0")}:00</option>`
                        ).join("")}
                    </select>
                </div>

                <div class="grupoInput">
                    <label>Empleado</label>
                    <select id="empleadoHistorial">
                        <option value="">Todos los empleados</option>
                        ${opcionesEmpleados}
                    </select>
                </div>

                <div class="grupoInput">
                    <label>Pago</label>
                    <select id="pagoHistorial">
                        <option value="">Todos</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="mixto">Mixto</option>
                        <option value="debe">Debe (sin saldar)</option>
                        <option value="fiado">Fiado (todas)</option>
                    </select>
                </div>

                <div class="grupoInput grupoInputBuscarTexto">
                    <label>Buscar</label>
                    <input
                        type="text"
                        id="buscarTextoHistorial"
                        placeholder="Cliente, producto o N.º..."
                        autocomplete="off">
                </div>

                <button class="btnBuscar" id="btnBuscarHistorial">Buscar</button>

                <button class="btnHoy" id="btnHoyHistorial">Hoy</button>

                <button class="btnTodas" id="btnTodasHistorial">Todas</button>

            </div>

            <div class="resumenHistorial" id="resumenHistorial"></div>

            <div id="listaHistorialVentas"></div>

        </div>

    `;

    document.getElementById("btnBuscarHistorial").onclick = buscarHistorial;

    document.getElementById("btnHoyHistorial").onclick = filtrarHoyHistorial;

    document.getElementById("btnTodasHistorial").onclick = filtrarTodasHistorial;

    document.getElementById("buscarTextoHistorial").addEventListener("keydown", (e)=>{

        if(e.key === "Enter") buscarHistorial();

    });

    ["horaDesdeHistorial", "empleadoHistorial", "pagoHistorial", "fechaDesdeHistorial", "fechaHastaHistorial"]
        .forEach(id => document.getElementById(id).addEventListener("change", buscarHistorial));

    filtrarTodasHistorial();

}

/* ==========================================
   LISTA DE EMPLEADOS PARA EL FILTRO
   (nombres de vendedores que ya registraron
   alguna venta, más los usuarios cargados)
========================================== */

function obtenerListaEmpleadosParaFiltro(){

    const nombres = new Set();

    (historialVentas || []).forEach(v =>{

        if(v.vendedor && v.vendedor.nombre) nombres.add(v.vendedor.nombre);

    });

    (usuarios || []).forEach(u =>{

        if(u.nombre) nombres.add(u.nombre);

    });

    return Array.from(nombres).sort((a,b)=> a.localeCompare(b));

}

/* ==========================================
   DATOS DE UNA VENTA
========================================== */

function pendienteVenta(venta){

    if(!venta || venta.metodoPago !== "debe") return 0;

    // Compatibilidad con ventas viejas que no tenían saldoPendiente:
    // si nunca se registró como pagada, se toma como que debe el total.
    const pendiente = venta.saldoPendiente !== undefined
        ? Number(venta.saldoPendiente)
        : (venta.pagada === true ? 0 : Number(venta.total || 0));

    return pendiente > 0.01 ? pendiente : 0;

}

function nombreClienteVenta(venta){

    return (venta.cliente && venta.cliente.nombre) ? venta.cliente.nombre : "Consumidor Final";

}

function textoMetodoPagoPlano(venta){

    if(!venta || !venta.metodoPago) return "—";

    if(venta.metodoPago === "debe"){

        const pendiente = pendienteVenta(venta);

        return pendiente > 0 ? "DEBE " + dinero(pendiente) : "Fiado · PAGADO";

    }

    if(venta.metodoPago === "efectivo") return "Efectivo";

    if(venta.metodoPago === "transferencia") return "Transferencia";

    if(venta.metodoPago === "mixto"){

        return "Mixto (E: " + dinero((venta.pago && venta.pago.efectivo) || 0)
            + " · T: " + dinero((venta.pago && venta.pago.transferencia) || 0) + ")";

    }

    return String(venta.metodoPago);

}

function textoMetodoPago(venta){

    if(!venta || !venta.metodoPago) return "—";

    if(venta.metodoPago === "debe"){

        const pendiente = pendienteVenta(venta);

        if(pendiente <= 0){

            return `<span style="color:var(--verde);font-weight:800">✔ PAGADO</span>`;

        }

        return `<span style="color:var(--rojo);font-weight:800">DEBE ${dinero(pendiente)}</span>`;

    }

    return esc(textoMetodoPagoPlano(venta));

}

function filasProductosVenta(venta){

    return (venta.productos || []).map(item => `
        <tr>
            <td>${esc(item.nombre)}</td>
            <td>${formatearCantidadItem(item)}</td>
            <td>${unidadVenta(item.modo)}</td>
            <td>${dinero(item.precio)}</td>
            <td>${dinero(item.subtotal)}</td>
        </tr>
    `).join("");

}

function botonesVenta(venta){

    return `
        <button class="btnAccion btnVer" title="Imprimir comprobante"
            onclick="imprimirComprobanteVenta('${esc(venta.id)}')">🖨️</button>
        ${esAdmin() ? `
            <button class="btnAccion btnEditar" title="Editar venta"
                onclick="editarVenta('${esc(venta.id)}')">✏️</button>
        ` : ""}
        ${puede("eliminarVentas") ? `
            <button class="btnAccion btnBorrar" title="Eliminar venta"
                onclick="eliminarVentaHistorial('${esc(venta.id)}')">🗑️</button>
        ` : ""}
    `;

}

/* ==========================================
   FILTRAR
========================================== */

function filtrarHoyHistorial(){

    const hoy = fechaLocalISO(new Date());

    document.getElementById("fechaDesdeHistorial").value = hoy;
    document.getElementById("fechaHastaHistorial").value = hoy;
    document.getElementById("buscarTextoHistorial").value = "";
    document.getElementById("horaDesdeHistorial").value = "";
    document.getElementById("empleadoHistorial").value = "";
    document.getElementById("pagoHistorial").value = "";

    buscarHistorial();

}

function filtrarTodasHistorial(){

    document.getElementById("fechaDesdeHistorial").value = "";
    document.getElementById("fechaHastaHistorial").value = "";
    document.getElementById("buscarTextoHistorial").value = "";
    document.getElementById("horaDesdeHistorial").value = "";
    document.getElementById("empleadoHistorial").value = "";
    document.getElementById("pagoHistorial").value = "";

    buscarHistorial();

}

function ventasFiltradasHistorial(){

    const valor = (id) =>{

        const el = document.getElementById(id);

        return el ? el.value : "";

    };

    const desde = valor("fechaDesdeHistorial");
    const hasta = valor("fechaHastaHistorial");
    const texto = valor("buscarTextoHistorial").trim().toLowerCase();
    const horaDesde = valor("horaDesdeHistorial");
    const empleado = valor("empleadoHistorial");
    const pago = valor("pagoHistorial");

    return [...historialVentas]
        .sort((a,b)=> new Date(b.fecha) - new Date(a.fecha))
        .filter(v =>{

            if(desde || hasta){

                const f = fechaLocalISO(v.fecha);

                if(desde && f < desde) return false;

                if(hasta && f > hasta) return false;

            }

            if(horaDesde !== "" && horaDeFecha(v.fecha) < Number(horaDesde)) return false;

            if(empleado && (v.vendedor && v.vendedor.nombre) !== empleado) return false;

            if(pago === "debe" && pendienteVenta(v) <= 0) return false;

            if(pago === "fiado" && v.metodoPago !== "debe") return false;

            if(pago && pago !== "debe" && pago !== "fiado" && v.metodoPago !== pago) return false;

            if(texto){

                const enCliente = nombreClienteVenta(v).toLowerCase().includes(texto);

                const enProducto = (v.productos || []).some(item =>
                    (item.nombre || "").toLowerCase().includes(texto)
                );

                const enNumero = v.numero !== undefined && String(v.numero) === texto.replace("#", "");

                if(!enCliente && !enProducto && !enNumero) return false;

            }

            return true;

        });

}

const LIMITE_VENTAS_EN_PANTALLA = 300;

function buscarHistorial(){

    const cont = document.getElementById("listaHistorialVentas");

    if(!cont) return;

    const ventas = ventasFiltradasHistorial();

    const resumen = document.getElementById("resumenHistorial");

    if(resumen){

        const total = ventas.reduce((acc, v) => acc + Number(v.total || 0), 0);

        const pendiente = ventas.reduce((acc, v) => acc + pendienteVenta(v), 0);

        resumen.innerHTML = `
            <span><strong>${ventas.length}</strong> ventas</span>
            <span>Total: <strong>${dinero(total)}</strong></span>
            ${pendiente > 0 ? `<span>Sin cobrar: <strong class="saldoDeuda">${dinero(pendiente)}</strong></span>` : ""}
            <button class="btnSecundario" id="btnExportarHistorial" ${ventas.length ? "" : "disabled"}>
                ⬇ Exportar a Excel
            </button>
        `;

        document.getElementById("btnExportarHistorial").onclick = () => exportarVentasCSV(ventas);

    }

    if(ventas.length === 0){

        cont.innerHTML = `
            <div class="card">
                <p class="tablaVacia">
                    No hay ventas registradas con esos filtros.
                </p>
            </div>
        `;

        return;

    }

    const visibles = ventas.slice(0, LIMITE_VENTAS_EN_PANTALLA);

    cont.innerHTML = visibles.map(venta =>{

        const vendedor = (venta.vendedor && venta.vendedor.nombre)
            ? venta.vendedor.nombre
            : "—";

        return `
            <div class="cardVentaHistorial">
                <div class="cardVentaCabecera">
                    <div>
                        <h3>${esc(nombreClienteVenta(venta))}</h3>
                        <small>
                            ${venta.numero !== undefined ? "N.º " + esc(venta.numero) + " · " : ""}${esc(venta.fechaTexto)}
                            ${venta.editada ? ` · <em title="Editada por ${esc(venta.editada.por)} el ${esc(venta.editada.fechaTexto)}">editada</em>` : ""}
                        </small>
                    </div>
                    <small>👤 ${esc(vendedor)}</small>
                </div>
                <div class="cardVentaInfo">
                    <span class="badgePago">${textoMetodoPago(venta)}</span>
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
                    <tbody>${filasProductosVenta(venta)}</tbody>
                </table>
                <div class="totalVenta">
                    <span>TOTAL</span>
                    <strong>${dinero(venta.total)}</strong>
                    <span class="accionesVenta">${botonesVenta(venta)}</span>
                </div>
            </div>
        `;

    }).join("")

    + (ventas.length > visibles.length ? `
        <div class="card">
            <p class="tablaVacia">
                Se muestran las ${visibles.length} ventas más recientes de ${ventas.length}.
                Achicá el rango de fechas o usá el buscador para ver el resto
                (el total de arriba y la exportación a Excel incluyen todas).
            </p>
        </div>
    ` : "");

}

/* ==========================================
   EXPORTAR A EXCEL (CSV)
========================================== */

function exportarVentasCSV(ventas){

    const filas = [[
        "N.º", "Fecha", "Cliente", "Vendedor", "Producto", "Cantidad", "Unidad",
        "Precio unitario", "Subtotal", "Total venta", "Pago", "Efectivo", "Transferencia", "Saldo pendiente"
    ]];

    ventas.forEach(v =>{

        (v.productos || []).forEach((item, i) =>{

            filas.push([
                v.numero !== undefined ? v.numero : "",
                v.fechaTexto,
                nombreClienteVenta(v),
                (v.vendedor && v.vendedor.nombre) || "",
                item.nombre,
                Number(formatearCantidadItem(item)),
                unidadVenta(item.modo),
                Number(item.precio || 0),
                Number(item.subtotal || 0),
                i === 0 ? Number(v.total || 0) : "",
                i === 0 ? (v.metodoPago === "debe" ? "Fiado" : v.metodoPago) : "",
                i === 0 ? Number((v.pago && v.pago.efectivo) || 0) : "",
                i === 0 ? Number((v.pago && v.pago.transferencia) || 0) : "",
                i === 0 ? pendienteVenta(v) : ""
            ]);

        });

    });

    descargarArchivo("Ventas_" + fechaLocalISO(new Date()) + ".csv", generarCSV(filas), "text/csv;charset=utf-8");

    notificacion("Ventas exportadas (" + ventas.length + ").");

}

/* ==========================================
   EFECTOS DE UNA VENTA (stock, saldo, pagos)
========================================== */

// signo +1 devuelve el stock, -1 lo descuenta.
function ajustarStockVenta(venta, signo){

    (venta.productos || []).forEach(item =>{

        const producto = productos.find(p => p.id === item.id);

        if(producto){

            producto.stock = redondear(Number(producto.stock || 0) + signo * Number(item.bolsas || 0));

        }

    });

}

function pagosDeVenta(venta){

    if(!venta || !venta.cliente) return [];

    const cliente = clientes.find(c => c.id === venta.cliente.id);

    if(!cliente) return [];

    return (cliente.pagos || []).filter(p => p.ventaId === venta.id);

}

/* Saca una venta del sistema deshaciendo todo lo que provocó:
   devuelve el stock, descuenta del saldo del cliente lo que debía
   de esa venta y quita los pagos que se le habían aplicado.
   Devuelve una copia completa por si después se quiere restaurar. */
function quitarVenta(venta){

    const copia = JSON.parse(JSON.stringify(venta));

    ajustarStockVenta(venta, +1);

    copia.stockDevuelto = true;

    const cliente = venta.cliente ? clientes.find(c => c.id === venta.cliente.id) : null;

    if(cliente){

        const pendiente = pendienteVenta(venta);

        if(pendiente > 0){

            cliente.saldo = redondear(Math.max(0, Number(cliente.saldo || 0) - pendiente), 2);

        }

        const pagos = (cliente.pagos || []).filter(p => p.ventaId === venta.id);

        if(pagos.length){

            copia.pagosEliminados = JSON.parse(JSON.stringify(pagos));

            cliente.pagos = cliente.pagos.filter(p => p.ventaId !== venta.id);

        }

    }

    historialVentas = historialVentas.filter(v => v.id !== venta.id);

    return copia;

}

function restaurarVentaEliminada(d){

    const pagos = d.pagosEliminados || [];

    const stockDevuelto = d.stockDevuelto;

    delete d.pagosEliminados;
    delete d.stockDevuelto;

    if(!d.id) d.id = nuevoId("V");

    // Solo se vuelve a descontar si al eliminarla se había devuelto.
    if(stockDevuelto) ajustarStockVenta(d, -1);

    historialVentas.unshift(d);

    const cliente = d.cliente ? clientes.find(c => c.id === d.cliente.id) : null;

    if(cliente){

        const pendiente = pendienteVenta(d);

        if(pendiente > 0) cliente.saldo = redondear(Number(cliente.saldo || 0) + pendiente, 2);

        if(pagos.length){

            if(!cliente.pagos) cliente.pagos = [];

            pagos.forEach(p =>{

                if(!cliente.pagos.some(x => x.id && x.id === p.id)) cliente.pagos.push(p);

            });

        }

    }

}

/* ==========================================
   ELIMINAR VENTA
========================================== */

function refrescarDespuesDeCambiarVenta(){

    if(pantallaVisible("pantallaClienteDetalle")) renderClienteDetalle(clienteDetalleActualId);

    if(paginaActual === "Historial") buscarHistorial();

    if(paginaActual === "Dashboard") renderDashboard();

}

function eliminarVentaHistorial(id){

    if(!puede("eliminarVentas")){ avisarSinPermiso(); return; }

    const venta = historialVentas.find(v => v.id === id);

    if(!venta) return;

    const pagos = pagosDeVenta(venta);

    const totalPagos = pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0);

    let texto = "¿Eliminar la venta del "
        + (venta.fechaTexto || "fecha desconocida")
        + " de " + nombreClienteVenta(venta)
        + " por " + dinero(venta.total) + "? "
        + "Se devuelve el stock de los productos";

    if(pendienteVenta(venta) > 0) texto += ", se descuenta del saldo del cliente lo que debía (" + dinero(pendienteVenta(venta)) + ")";

    if(pagos.length) texto += " y se quitan los " + pagos.length + " pago(s) que tenía registrados (" + dinero(totalPagos) + ")";

    texto += ".";

    confirmar(texto, ()=>{

        const copia = quitarVenta(venta);

        registrarEliminacion(
            "Venta",
            "Venta eliminada · " + nombreClienteVenta(venta) + " · " + dinero(venta.total),
            copia
        );

        guardarDatos("historialVentas", "productos", "clientes", "eliminaciones");

        refrescarDespuesDeCambiarVenta();

        notificacion("Venta eliminada. Se devolvió el stock.", "error");

    });

}

/* ==========================================
   EDITAR VENTA (SOLO ADMINISTRADOR)
   Se trabaja sobre una copia: nada cambia
   hasta apretar "Guardar cambios".
========================================== */

let ventaEditando = null;

function editarVenta(id){

    if(!soloAdmin()) return;

    const venta = historialVentas.find(v => v.id === id);

    if(!venta) return;

    ventaEditando = JSON.parse(JSON.stringify(venta));

    document.getElementById("tituloEditarVenta").textContent =
        "Editar venta" + (venta.numero !== undefined ? " N.º " + venta.numero : "");

    document.getElementById("fechaEditarVenta").value = fechaParaInputLocal(venta.fecha);

    // Clientes.
    const idCliente = venta.cliente ? venta.cliente.id : "";

    let opcionesCliente = `<option value="">Consumidor Final</option>`;

    [...clientes].sort((a,b)=> (a.nombre || "").localeCompare(b.nombre || "")).forEach(c =>{

        opcionesCliente += `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`;

    });

    if(idCliente && !clientes.some(c => c.id === idCliente)){

        opcionesCliente += `<option value="${esc(idCliente)}">${esc(venta.cliente.nombre)} (eliminado)</option>`;

    }

    const selCliente = document.getElementById("clienteEditarVenta");

    selCliente.innerHTML = opcionesCliente;
    selCliente.value = idCliente;

    // Vendedores.
    const loginVendedor = venta.vendedor ? venta.vendedor.usuario : "";

    let opcionesVendedor = `<option value="">— Sin vendedor —</option>`;

    usuarios.forEach(u =>{

        opcionesVendedor += `<option value="${esc(u.usuario)}">${esc(u.nombre)}</option>`;

    });

    if(loginVendedor && !usuarios.some(u => u.usuario === loginVendedor)){

        opcionesVendedor += `<option value="${esc(loginVendedor)}">${esc(venta.vendedor.nombre)} (eliminado)</option>`;

    }

    const selVendedor = document.getElementById("vendedorEditarVenta");

    selVendedor.innerHTML = opcionesVendedor;
    selVendedor.value = loginVendedor;

    // Pago.
    document.getElementById("metodoEditarVenta").value = venta.metodoPago || "efectivo";
    document.getElementById("efectivoEditarVenta").value = (venta.pago && venta.pago.efectivo) || "";
    document.getElementById("transferenciaEditarVenta").value = (venta.pago && venta.pago.transferencia) || "";
    document.getElementById("ajustarStockEditarVenta").checked = true;

    // Productos para agregar.
    document.getElementById("productoAgregarEditarVenta").innerHTML =
        `<option value="">Elegir producto…</option>`
        + [...productos]
            .sort((a,b)=> (a.nombre || "").localeCompare(b.nombre || ""))
            .map(p => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`)
            .join("");

    document.getElementById("modoAgregarEditarVenta").value = "bolsa";
    document.getElementById("cantidadAgregarEditarVenta").value = "";

    document.getElementById("metodoEditarVenta").onchange = actualizarPagoEditarVenta;
    document.getElementById("clienteEditarVenta").onchange = actualizarPagoEditarVenta;
    document.getElementById("btnAgregarItemEditarVenta").onclick = agregarItemEditarVenta;

    renderItemsEditarVenta();

    abrir("modalEditarVenta");

}

function pesoBolsaItem(item){

    const producto = productos.find(p => p.id === item.id);

    if(producto && Number(producto.pesoBolsa) > 0) return Number(producto.pesoBolsa);

    // Producto eliminado: se deduce de la propia línea.
    if(Number(item.bolsas) > 0 && Number(item.kg) > 0) return Number(item.kg) / Number(item.bolsas);

    return 0;

}

function recalcularItemEditado(item){

    const linea = calcularLinea(
        { precioBolsa: Number(item.precio || 0), precioKg: Number(item.precio || 0) },
        pesoBolsaItem(item),
        Number(item.cantidad || 0),
        item.modo
    );

    item.subtotal = linea.subtotal;
    item.bolsas = linea.bolsas;
    item.kg = linea.kg;

}

function totalVentaEditando(){

    return redondear((ventaEditando.productos || []).reduce((acc, i) => acc + Number(i.subtotal || 0), 0), 2);

}

function renderItemsEditarVenta(){

    const tbody = document.getElementById("itemsEditarVenta");

    const etiquetaCantidad = { bolsa: "bolsas", kg: "kg", dinero: "$ (monto)" };

    if(ventaEditando.productos.length === 0){

        tbody.innerHTML = `<tr><td colspan="5" class="tablaVacia">La venta no tiene productos: agregá al menos uno.</td></tr>`;

    }else{

        tbody.innerHTML = ventaEditando.productos.map((item, i) => `
            <tr>
                <td>
                    ${esc(item.nombre)}
                    ${item.modo === "dinero" ? `<br><small>≈ ${Number(item.kg || 0).toFixed(2)} kg</small>` : ""}
                </td>
                <td>
                    <input type="text" inputmode="decimal" autocomplete="off" class="inputTablaChico"
                        value="${esc(item.cantidad)}"
                        oninput="limpiarNumero(this)"
                        onchange="cambiarItemEditarVenta(${i}, 'cantidad', this.value)">
                    <small>${etiquetaCantidad[item.modo] || ""}</small>
                </td>
                <td>
                    <input type="text" inputmode="decimal" autocomplete="off" class="inputTablaChico"
                        value="${esc(item.precio)}"
                        oninput="limpiarNumero(this)"
                        onchange="cambiarItemEditarVenta(${i}, 'precio', this.value)">
                    <small>${item.modo === "bolsa" ? "por bolsa" : "por kg"}</small>
                </td>
                <td><strong>${dinero(item.subtotal)}</strong></td>
                <td>
                    <button class="btnAccion btnBorrar" title="Quitar producto"
                        onclick="quitarItemEditarVenta(${i})">🗑️</button>
                </td>
            </tr>
        `).join("");

    }

    document.getElementById("totalEditarVenta").textContent = dinero(totalVentaEditando());

    actualizarPagoEditarVenta();

}

function cambiarItemEditarVenta(indice, campo, valor){

    const item = ventaEditando.productos[indice];

    if(!item) return;

    const n = Number(String(valor).replace(",", ".")) || 0;

    item[campo] = n;

    recalcularItemEditado(item);

    renderItemsEditarVenta();

}

function quitarItemEditarVenta(indice){

    ventaEditando.productos.splice(indice, 1);

    renderItemsEditarVenta();

}

function agregarItemEditarVenta(){

    const idProducto = document.getElementById("productoAgregarEditarVenta").value;
    const modo = document.getElementById("modoAgregarEditarVenta").value;
    const cantidad = numeroDe("cantidadAgregarEditarVenta");

    const producto = productos.find(p => p.id === idProducto);

    if(!producto){

        notificacion("Elegí un producto para agregar.", "warning");

        return;

    }

    if(cantidad <= 0){

        notificacion("Ingresá la cantidad.", "warning");

        return;

    }

    const clienteId = document.getElementById("clienteEditarVenta").value || null;

    const precios = preciosProductoPara(producto, clienteId);

    const linea = calcularLinea(precios, producto.pesoBolsa, cantidad, modo);

    const item = {
        id: producto.id,
        nombre: producto.nombre,
        cantidad,
        precio: linea.precio,
        modo,
        subtotal: linea.subtotal,
        bolsas: linea.bolsas,
        kg: linea.kg
    };

    if(Number(producto.separarPorBolsa) > 0){

        item.separar = Number(producto.separarPorBolsa);
        item.grupoSeparar = producto.grupoSeparar || producto.nombre;

    }

    if(Number(producto.costoBolsa) > 0) item.costo = Number(producto.costoBolsa);

    ventaEditando.productos.push(item);

    document.getElementById("cantidadAgregarEditarVenta").value = "";

    renderItemsEditarVenta();

}

function actualizarPagoEditarVenta(){

    const metodo = document.getElementById("metodoEditarVenta").value;

    document.getElementById("mixtoEditarVenta").classList.toggle("oculto", metodo !== "mixto");

    const nota = document.getElementById("notaPagoEditarVenta");

    const original = historialVentas.find(v => v.id === ventaEditando.id);

    const pagos = original ? pagosDeVenta(original) : [];

    const pagado = pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0);

    const clienteId = document.getElementById("clienteEditarVenta").value;

    const mismoCliente = original && original.cliente && original.cliente.id === clienteId;

    if(metodo === "debe" && !clienteId){

        nota.textContent = "Para dejarla como DEBE hay que elegir un cliente.";

    }else if(pagos.length && (metodo !== "debe" || !mismoCliente)){

        nota.textContent = "Esta venta tiene " + pagos.length + " pago(s) registrados por " + dinero(pagado)
            + ". Al guardar con este cambio, esos pagos se eliminan.";

    }else if(metodo === "debe"){

        const queda = Math.max(0, totalVentaEditando() - (mismoCliente ? pagado : 0));

        nota.textContent = (mismoCliente && pagado > 0 ? "Ya pagó " + dinero(pagado) + ". " : "")
            + "Queda debiendo " + dinero(queda) + ".";

    }else{

        nota.textContent = "";

    }

}

function guardarVentaEditada(){

    if(!soloAdmin() || !ventaEditando) return;

    const original = historialVentas.find(v => v.id === ventaEditando.id);

    if(!original){

        notificacion("Esa venta ya no existe (la eliminaron desde otra computadora).", "error");

        cerrar("modalEditarVenta");

        return;

    }

    const items = ventaEditando.productos;

    if(items.length === 0){

        notificacion("La venta tiene que tener al menos un producto. Si querés anularla, eliminala.", "warning");

        return;

    }

    if(items.some(i => !(Number(i.cantidad) > 0))){

        notificacion("Hay productos con cantidad en cero.", "warning");

        return;

    }

    const fechaValor = document.getElementById("fechaEditarVenta").value;

    const fecha = fechaValor ? new Date(fechaValor) : new Date(original.fecha);

    if(isNaN(fecha.getTime())){

        notificacion("La fecha no es válida.", "warning");

        return;

    }

    const metodo = document.getElementById("metodoEditarVenta").value;
    const clienteId = document.getElementById("clienteEditarVenta").value;
    const loginVendedor = document.getElementById("vendedorEditarVenta").value;
    const ajustarStock = document.getElementById("ajustarStockEditarVenta").checked;

    const total = totalVentaEditando();

    const clienteNuevo = clienteId ? clientes.find(c => c.id === clienteId) : null;

    if(metodo === "debe" && !clienteNuevo){

        notificacion("Para dejarla como DEBE hay que elegir un cliente.", "warning");

        return;

    }

    const pago = { efectivo: 0, transferencia: 0 };

    if(metodo === "efectivo") pago.efectivo = total;

    if(metodo === "transferencia") pago.transferencia = total;

    if(metodo === "mixto"){

        pago.efectivo = numeroDe("efectivoEditarVenta");
        pago.transferencia = numeroDe("transferenciaEditarVenta");

        if(Math.abs(pago.efectivo + pago.transferencia - total) > 0.01){

            notificacion("Los montos del pago mixto deben sumar " + dinero(total) + ".", "warning");

            return;

        }

    }

    const pagosPrevios = pagosDeVenta(original);

    const mismoCliente = !!original.cliente && original.cliente.id === clienteId;

    const conservaPagos = metodo === "debe" && mismoCliente;

    const pagado = conservaPagos
        ? pagosPrevios.reduce((acc, p) => acc + Number(p.monto || 0), 0)
        : 0;

    if(conservaPagos && pagado > total + 0.01){

        notificacion(
            "El cliente ya pagó " + dinero(pagado) + " de esta venta: el total no puede quedar por debajo de eso. "
            + "Eliminá primero algún pago desde la ficha del cliente.",
            "warning"
        );

        return;

    }

    const aplicar = ()=>{

        // 1) Se deshace lo que había provocado la venta original.
        if(ajustarStock) ajustarStockVenta(original, +1);

        const clienteViejo = original.cliente ? clientes.find(c => c.id === original.cliente.id) : null;

        if(clienteViejo){

            const pendienteViejo = pendienteVenta(original);

            if(pendienteViejo > 0){

                clienteViejo.saldo = redondear(Math.max(0, Number(clienteViejo.saldo || 0) - pendienteViejo), 2);

            }

            if(!conservaPagos && pagosPrevios.length){

                clienteViejo.pagos = (clienteViejo.pagos || []).filter(p => p.ventaId !== original.id);

            }

        }

        // 2) Se aplican los datos nuevos.
        original.fecha = fecha.toISOString();
        original.fechaTexto = fechaHoraTexto(fecha);

        original.cliente = clienteNuevo
            ? { id: clienteNuevo.id, nombre: clienteNuevo.nombre }
            : (clienteId && original.cliente && original.cliente.id === clienteId ? original.cliente : null);

        const vendedor = usuarios.find(u => u.usuario === loginVendedor);

        original.vendedor = vendedor
            ? { usuario: vendedor.usuario, nombre: vendedor.nombre }
            : (loginVendedor && original.vendedor && original.vendedor.usuario === loginVendedor ? original.vendedor : null);

        original.productos = JSON.parse(JSON.stringify(items));
        original.total = total;
        original.metodoPago = metodo;
        original.pago = pago;

        if(metodo === "debe"){

            original.saldoPendiente = redondear(Math.max(0, total - pagado), 2);
            original.pagada = original.saldoPendiente <= 0.01;

            clienteNuevo.saldo = redondear(Number(clienteNuevo.saldo || 0) + original.saldoPendiente, 2);

            // Los pagos ya hechos siguen apuntando a la fecha nueva.
            (clienteNuevo.pagos || []).forEach(p =>{

                if(p.ventaId === original.id) p.ventaFechaTexto = original.fechaTexto;

            });

        }else{

            original.saldoPendiente = 0;
            original.pagada = true;

        }

        original.editada = {
            por: usuarioActual.nombre,
            fecha: new Date().toISOString(),
            fechaTexto: fechaHoraTexto(new Date())
        };

        if(ajustarStock) ajustarStockVenta(original, -1);

        guardarDatos("historialVentas", "productos", "clientes");

        cerrar("modalEditarVenta");

        ventaEditando = null;

        refrescarDespuesDeCambiarVenta();

        notificacion("Venta actualizada.");

    };

    if(!conservaPagos && pagosPrevios.length){

        confirmar(
            "Esta venta tiene " + pagosPrevios.length + " pago(s) registrados que se van a eliminar con este cambio. ¿Continuar?",
            aplicar
        );

    }else{

        aplicar();

    }

}

/* ==========================================
   COMPROBANTE IMPRIMIBLE
========================================== */

function imprimirComprobanteVenta(id){

    const venta = historialVentas.find(v => v.id === id);

    if(!venta) return;

    const n = configuracionSistema.negocio || {};

    const datosNegocio = [n.direccion, n.telefono ? "Tel: " + n.telefono : "", n.cuit ? "CUIT: " + n.cuit : ""]
        .filter(Boolean)
        .map(esc)
        .join("<br>");

    const filas = (venta.productos || []).map(item => `
        <tr>
            <td>
                ${esc(item.nombre)}<br>
                <small>${formatearCantidadItem(item)} ${unidadVenta(item.modo).toLowerCase()} × ${dinero(item.precio)}</small>
            </td>
            <td class="derecha">${dinero(item.subtotal)}</td>
        </tr>
    `).join("");

    const pendiente = pendienteVenta(venta);

    imprimirHtml(`
        <div class="ticket">
            <h1>${esc(n.nombre || "Comprobante")}</h1>
            ${datosNegocio ? `<p class="centro">${datosNegocio}</p>` : ""}
            <hr>
            <p>
                <strong>Comprobante${venta.numero !== undefined ? " N.º " + esc(venta.numero) : ""}</strong><br>
                Fecha: ${esc(venta.fechaTexto)}<br>
                Cliente: ${esc(nombreClienteVenta(venta))}<br>
                ${venta.vendedor && venta.vendedor.nombre ? "Atendió: " + esc(venta.vendedor.nombre) : ""}
            </p>
            <hr>
            <table>${filas}</table>
            <hr>
            <p class="totalTicket"><span>TOTAL</span><span>${dinero(venta.total)}</span></p>
            <p>Pago: ${esc(textoMetodoPagoPlano(venta))}</p>
            ${pendiente > 0 ? `<p><strong>Saldo pendiente de esta venta: ${dinero(pendiente)}</strong></p>` : ""}
            <hr>
            ${n.pieTicket ? `<p class="centro">${esc(n.pieTicket)}</p>` : ""}
            <p class="centro chico">Comprobante no válido como factura</p>
        </div>
    `, "impresionTicket");

}
