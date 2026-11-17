/* ==========================================
   DETALLE DE PROVEEDOR
========================================== */

let proveedorDetalleActualId = null;
let proveedorPagoActualId = null;

function renderProveedorDetalle(id){

    const proveedor = proveedores.find(p => p.id === id);

    if(!proveedor){

        document.getElementById("tituloProveedorDetalle").textContent = "Proveedor";

        document.getElementById("contenidoProveedorDetalle").innerHTML = `
            <div class="card"><p>Proveedor no encontrado (puede que lo hayan eliminado).</p></div>
        `;

        return;

    }

    if(!proveedor.compras) proveedor.compras = [];
    if(!proveedor.pagos) proveedor.pagos = [];

    if(asegurarIdsPagos(proveedor.pagos, "PP")) guardarDatos("proveedores");

    document.getElementById("tituloProveedorDetalle").textContent = proveedor.nombre;

    const saldo = saldoPendienteProveedor(proveedor);

    const saldoClass = saldo > 0 ? "saldoDeuda" : "saldoOK";

    document.getElementById("contenidoProveedorDetalle").innerHTML = `

        <div class="detalleClienteGrid">

            <div class="columnaClienteIzquierda">

                <div class="card datosClienteCard">

                    <h2>Datos del proveedor</h2>

                    <div class="datoCliente">
                        <span class="labelDato">Nombre</span>
                        <span class="valorDato">${esc(proveedor.nombre)}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Teléfono</span>
                        <span class="valorDato">${esc(proveedor.telefono || "—")}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Dirección</span>
                        <span class="valorDato">${esc(proveedor.direccion || "—")}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Le pagamos</span>
                        <span class="valorDato">${proveedor.diasPago ? "Cada " + esc(proveedor.diasPago) + " días" : "Sin frecuencia fija"}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Le debemos</span>
                        <span class="valorDato ${saldoClass}">${dinero(saldo)}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Próximo vencimiento</span>
                        <span class="valorDato">${obtenerProximoVencimientoProveedor(proveedor)}</span>
                    </div>

                    ${proveedor.observaciones ? `
                        <div class="datoCliente">
                            <span class="labelDato">Observaciones</span>
                            <span class="valorDato">${esc(proveedor.observaciones)}</span>
                        </div>
                    ` : ""}

                    <div class="accionesDetalleCliente">

                        <button id="btnComprarProveedor" class="btnPrecios">🧾 Registrar compra</button>

                        <button id="btnPagarProveedor" class="btnRegistrarPago">💵 Registrar pago</button>

                    </div>

                </div>

                <div class="card historialPagosCard">

                    <h2>Historial de pagos</h2>

                    ${renderHistorialPagosProveedor(proveedor)}

                </div>

            </div>

            <div class="card historialClienteCard">

                <h2>Historial de compras</h2>

                <p class="notaHistorialCliente">
                    Compras registradas a nombre de ${esc(proveedor.nombre)}.
                </p>

                <div class="historialClienteLista" id="historialComprasProveedor">
                    ${renderHistorialComprasProveedor(proveedor)}
                </div>

            </div>

        </div>

    `;

    document.getElementById("btnComprarProveedor").onclick = ()=> abrirModalCompraProveedor(proveedor.id);

    document.getElementById("btnPagarProveedor").onclick = ()=> abrirModalPagoProveedor(proveedor.id);

}

function renderHistorialComprasProveedor(proveedor){

    const compras = proveedor.compras || [];

    if(compras.length === 0){

        return `<div class="cardVentaHistorial"><p class="tablaVacia">Todavía no hay compras registradas.</p></div>`;

    }

    return [...compras]
        .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
        .map(compra =>{

            const pagada = Number(compra.saldoPendiente || 0) <= 0.01;

            const estado = pagada
                ? `<span style="color:var(--verde);font-weight:800">✔ PAGADO</span>`
                : `<span style="color:var(--rojo);font-weight:800">DEBE ${dinero(compra.saldoPendiente)}</span>`;

            return `
                <div class="cardVentaHistorial">
                    <div class="cabeceraVentaHistorial">
                        <div>
                            <span class="fechaVenta">🗓️ ${esc(compra.fechaTexto)}</span>
                            ${compra.fechaVencimientoTexto && !pagada ? `<span class="vendedorVenta">⏰ Vence ${esc(compra.fechaVencimientoTexto)}</span>` : ""}
                        </div>
                        ${esAdmin() ? `
                            <span class="accionesVenta">
                                <button class="btnAccion btnEditar" title="Editar compra"
                                    onclick="editarCompraProveedor('${esc(proveedor.id)}', '${esc(compra.id)}')">✏️</button>
                                <button class="btnAccion btnBorrar" title="Eliminar compra"
                                    onclick="eliminarCompraProveedor('${esc(proveedor.id)}', '${esc(compra.id)}')">🗑️</button>
                            </span>
                        ` : ""}
                    </div>
                    <div class="datosVentaHistorial">
                        <span>${esc(compra.descripcion)}</span>
                        <span><strong>Estado:</strong> ${estado}</span>
                    </div>
                    <div class="totalVentaHistorial">
                        TOTAL: ${dinero(compra.monto)}
                    </div>
                </div>
            `;

        }).join("");

}

function renderHistorialPagosProveedor(proveedor){

    const pagos = proveedor.pagos || [];

    if(pagos.length === 0){

        return `<p class="tablaVacia">Todavía no se registraron pagos.</p>`;

    }

    return `<div class="listaPagosCliente">` + [...pagos]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .map(pago => `
            <div class="filaPagoCliente">
                <div>
                    <strong>${dinero(pago.monto)}</strong>
                    <small>🗓️ ${esc(pago.fechaTexto)}</small>
                </div>
                <div class="detallePagoCliente">
                    <span>Aplicado a: ${esc(pago.compraDescripcion || "—")}</span>
                    <span>Quedaban ${dinero(pago.restanteCompra || 0)} de esa compra</span>
                </div>
                ${esAdmin() ? `
                    <div class="accionesTabla">
                        <button class="btnAccion btnEditar" title="Editar pago"
                            onclick="editarPagoProveedor('${esc(proveedor.id)}', '${esc(pago.id)}')">✏️</button>
                        <button class="btnAccion btnBorrar" title="Eliminar pago"
                            onclick="eliminarPagoProveedor('${esc(proveedor.id)}', '${esc(pago.id)}')">🗑️</button>
                    </div>
                ` : ""}
            </div>
        `).join("") + `</div>`;

}

/* ==========================================
   MODAL REGISTRAR / EDITAR COMPRA
========================================== */

let proveedorCompraActualId = null;
let compraEditandoId = null;

function abrirModalCompraProveedor(id){

    proveedorCompraActualId = id;
    compraEditandoId = null;

    document.getElementById("tituloModalCompraProveedor").textContent = "Registrar compra";

    limpiar("descripcionCompraProveedor", "montoCompraProveedor");

    document.getElementById("fechaCompraProveedor").value = fechaLocalISO(new Date());

    abrir("modalCompraProveedor");

    setTimeout(()=> document.getElementById("descripcionCompraProveedor").focus(), 100);

}

function editarCompraProveedor(proveedorId, compraId){

    if(!soloAdmin()) return;

    const proveedor = proveedores.find(p => p.id === proveedorId);

    const compra = proveedor ? (proveedor.compras || []).find(c => c.id === compraId) : null;

    if(!compra) return;

    proveedorCompraActualId = proveedorId;
    compraEditandoId = compraId;

    document.getElementById("tituloModalCompraProveedor").textContent = "Editar compra";

    document.getElementById("descripcionCompraProveedor").value = compra.descripcion || "";
    document.getElementById("montoCompraProveedor").value = compra.monto || "";
    document.getElementById("fechaCompraProveedor").value = String(compra.fecha || "").slice(0, 10);

    abrir("modalCompraProveedor");

}

function guardarCompraProveedor(){

    if(!puede("proveedores")){ avisarSinPermiso(); return; }

    const proveedor = proveedores.find(p => p.id === proveedorCompraActualId);

    if(!proveedor) return;

    const descripcion = document.getElementById("descripcionCompraProveedor").value.trim();

    const monto = numeroDe("montoCompraProveedor");

    const fecha = document.getElementById("fechaCompraProveedor").value || fechaLocalISO(new Date());

    if(!descripcion){

        notificacion("Describí qué le compramos.", "warning");

        return;

    }

    if(monto <= 0){

        notificacion("Ingresá un monto válido.", "warning");

        return;

    }

    if(!proveedor.compras) proveedor.compras = [];

    const vencimiento = calcularVencimientoCompra(fecha, proveedor.diasPago);

    if(compraEditandoId){

        if(!soloAdmin()) return;

        const compra = proveedor.compras.find(c => c.id === compraEditandoId);

        if(!compra) return;

        const pagado = redondear(Number(compra.monto || 0) - Number(compra.saldoPendiente || 0), 2);

        if(monto < pagado - 0.01){

            notificacion(
                "De esa compra ya se pagaron " + dinero(pagado) + ": el monto no puede ser menor. "
                + "Eliminá primero algún pago.",
                "warning"
            );

            return;

        }

        compra.descripcion = descripcion;
        compra.monto = monto;
        compra.fecha = fecha;
        compra.fechaTexto = fechaTextoDeISO(fecha);
        compra.saldoPendiente = redondear(Math.max(0, monto - pagado), 2);
        compra.pagada = compra.saldoPendiente <= 0.01;

        Object.assign(compra, vencimiento);

        (proveedor.pagos || []).forEach(p =>{

            if(p.compraId === compra.id) p.compraDescripcion = descripcion;

        });

        notificacion("Compra actualizada.");

    }else{

        proveedor.compras.push({
            id: nuevoId("CP"),
            descripcion,
            monto,
            fecha,
            fechaTexto: fechaTextoDeISO(fecha),
            fechaVencimiento: vencimiento.fechaVencimiento,
            fechaVencimientoTexto: vencimiento.fechaVencimientoTexto,
            saldoPendiente: monto,
            pagada: false
        });

        notificacion("Compra registrada.");

    }

    guardarDatos("proveedores");

    cerrar("modalCompraProveedor");

    compraEditandoId = null;

    renderProveedorDetalle(proveedor.id);

}

function eliminarCompraProveedor(proveedorId, compraId){

    if(!soloAdmin()) return;

    const proveedor = proveedores.find(p => p.id === proveedorId);

    const compra = proveedor ? (proveedor.compras || []).find(c => c.id === compraId) : null;

    if(!compra) return;

    const pagos = (proveedor.pagos || []).filter(p => p.compraId === compraId);

    confirmar(
        "¿Eliminar la compra \"" + compra.descripcion + "\" por " + dinero(compra.monto) + "?"
        + (pagos.length ? " También se quitan los " + pagos.length + " pago(s) que tenía aplicados." : ""),
        ()=>{

            proveedor.compras = proveedor.compras.filter(c => c.id !== compraId);

            proveedor.pagos = (proveedor.pagos || []).filter(p => p.compraId !== compraId);

            registrarEliminacion(
                "Compra a proveedor",
                "Compra a " + proveedor.nombre + " · " + compra.descripcion + " · " + dinero(compra.monto),
                { compra, pagos }
            );

            guardarDatos("proveedores", "eliminaciones");

            renderProveedorDetalle(proveedor.id);

            notificacion("Compra eliminada.", "error");

        }
    );

}

/* ==========================================
   MODAL REGISTRAR PAGO A PROVEEDOR
========================================== */

function abrirModalPagoProveedor(id){

    const proveedor = proveedores.find(p => p.id === id);

    if(!proveedor) return;

    proveedorPagoActualId = id;

    document.getElementById("saldoActualPagoProveedor").value = dinero(saldoPendienteProveedor(proveedor));

    document.getElementById("montoPagoProveedor").value = "";

    const comprasPendientes = (proveedor.compras || [])
        .filter(c => Number(c.saldoPendiente || 0) > 0.01)
        .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

    const lista = document.getElementById("listaComprasPendientesPago");

    if(comprasPendientes.length === 0){

        lista.innerHTML = `<p class="tablaVacia">No hay compras pendientes de pago.</p>`;

    }else{

        lista.innerHTML = comprasPendientes.map((c, i) => `
            <label class="filaVentaPendiente">
                <input
                    type="radio"
                    name="compraPagoSeleccionada"
                    value="${esc(c.id)}"
                    ${i === 0 ? "checked" : ""}>
                <span>
                    🗓️ ${esc(c.fechaTexto)} — ${esc(c.descripcion)} — debe
                    <strong>${dinero(c.saldoPendiente)}</strong> de ${dinero(c.monto)}
                </span>
            </label>
        `).join("");

    }

    abrir("modalPagoProveedor");

    setTimeout(()=> document.getElementById("montoPagoProveedor").focus(), 100);

}

function guardarPagoProveedor(){

    if(!puede("proveedores")){ avisarSinPermiso(); return; }

    const proveedor = proveedores.find(p => p.id === proveedorPagoActualId);

    if(!proveedor) return;

    const compraSeleccionada = document.querySelector('input[name="compraPagoSeleccionada"]:checked');

    if(!compraSeleccionada){

        notificacion("No hay ninguna compra pendiente para aplicar el pago.", "warning");

        return;

    }

    const compra = (proveedor.compras || []).find(c => c.id === compraSeleccionada.value);

    if(!compra) return;

    const monto = numeroDe("montoPagoProveedor");

    const pendiente = Number(compra.saldoPendiente || 0);

    if(monto <= 0){

        notificacion("Ingresá un monto válido.", "warning");

        return;

    }

    if(monto > pendiente + 0.01){

        notificacion(
            "Ese pago (" + dinero(monto) + ") es mayor a lo que debe esa compra (" + dinero(pendiente) + ").",
            "warning"
        );

        return;

    }

    const restante = redondear(Math.max(0, pendiente - monto), 2);

    compra.saldoPendiente = restante;
    compra.pagada = restante <= 0.01;

    if(!proveedor.pagos) proveedor.pagos = [];

    const ahora = new Date();

    proveedor.pagos.push({
        id: nuevoId("PP"),
        fecha: ahora.toISOString(),
        fechaTexto: fechaHoraTexto(ahora),
        monto,
        compraId: compra.id,
        compraDescripcion: compra.descripcion,
        restanteCompra: restante,
        usuario: usuarioActual ? usuarioActual.nombre : null
    });

    guardarDatos("proveedores");

    cerrar("modalPagoProveedor");

    renderProveedorDetalle(proveedor.id);

    proveedorPagoActualId = null;

    notificacion(
        restante <= 0.01
            ? "¡Compra saldada!"
            : "Pago registrado. Quedan " + dinero(restante) + " de esa compra."
    );

}

/* ==========================================
   EDITAR / ELIMINAR PAGO A PROVEEDOR (ADMIN)
========================================== */

function editarPagoProveedor(proveedorId, pagoId){

    if(!soloAdmin()) return;

    const proveedor = proveedores.find(p => p.id === proveedorId);

    const pago = proveedor ? (proveedor.pagos || []).find(p => p.id === pagoId) : null;

    if(!pago) return;

    abrirModalEditarPago({ tipo: "proveedor", duenoId: proveedorId, pagoId }, pago, false);

}

function aplicarEdicionPagoProveedor(monto, fecha){

    const proveedor = proveedores.find(p => p.id === pagoEditando.duenoId);

    const pago = proveedor ? (proveedor.pagos || []).find(p => p.id === pagoEditando.pagoId) : null;

    if(!pago) return false;

    const compra = (proveedor.compras || []).find(c => c.id === pago.compraId);

    const diferencia = redondear(monto - Number(pago.monto || 0), 2);

    if(compra){

        const pendiente = Number(compra.saldoPendiente || 0);

        if(diferencia > pendiente + 0.01){

            notificacion(
                "El pago no puede superar lo que se debía de esa compra: como máximo "
                + dinero(Number(pago.monto || 0) + pendiente) + ".",
                "warning"
            );

            return false;

        }

        compra.saldoPendiente = redondear(Math.max(0, pendiente - diferencia), 2);
        compra.pagada = compra.saldoPendiente <= 0.01;

        pago.restanteCompra = compra.saldoPendiente;

    }

    pago.monto = monto;

    if(fecha){

        pago.fecha = fecha.toISOString();
        pago.fechaTexto = fechaHoraTexto(fecha);

    }

    guardarDatos("proveedores");

    renderProveedorDetalle(proveedor.id);

    return true;

}

function eliminarPagoProveedor(proveedorId, pagoId){

    if(!soloAdmin()) return;

    const proveedor = proveedores.find(p => p.id === proveedorId);

    const pago = proveedor ? (proveedor.pagos || []).find(p => p.id === pagoId) : null;

    if(!pago) return;

    confirmar(
        "¿Eliminar el pago de " + dinero(pago.monto) + " del " + pago.fechaTexto
        + "? Esa plata vuelve a figurar como deuda con el proveedor.",
        ()=>{

            const compra = (proveedor.compras || []).find(c => c.id === pago.compraId);

            if(compra){

                compra.saldoPendiente = redondear(
                    Math.min(Number(compra.monto || 0), Number(compra.saldoPendiente || 0) + Number(pago.monto || 0)),
                    2
                );

                compra.pagada = compra.saldoPendiente <= 0.01;

            }

            proveedor.pagos = proveedor.pagos.filter(p => p.id !== pagoId);

            registrarEliminacion(
                "Pago a proveedor",
                "Pago a " + proveedor.nombre + " · " + dinero(pago.monto) + " · " + pago.fechaTexto,
                pago
            );

            guardarDatos("proveedores", "eliminaciones");

            renderProveedorDetalle(proveedor.id);

            notificacion("Pago eliminado.", "error");

        }
    );

}
