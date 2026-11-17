/* ==========================================
   DETALLE DE CLIENTE
========================================== */

/* Los pagos cargados con versiones anteriores no tenían
   identificador: se les asigna uno (siempre el mismo para el mismo
   pago) para poder editarlos o eliminarlos. */
function asegurarIdsPagos(lista, prefijo){

    let cambios = false;

    (lista || []).forEach((p, i) =>{

        if(!p.id){

            p.id = prefijo + (Date.parse(p.fecha) || 0) + "x" + i;

            cambios = true;

        }

    });

    return cambios;

}

/* Parte del saldo que no corresponde a ninguna venta fiada
   (por ejemplo una deuda anterior cargada a mano). */
function saldoGeneralCliente(cliente){

    const porVentas = historialVentas
        .filter(v => v.cliente && v.cliente.id === cliente.id)
        .reduce((acc, v) => acc + pendienteVenta(v), 0);

    return Math.max(0, redondear(Number(cliente.saldo || 0) - porVentas, 2));

}

function ventasDeClienteFiltradas(clienteId){

    const desde = document.getElementById("fechaDesdeCliente")?.value || null;

    const hasta = document.getElementById("fechaHastaCliente")?.value || null;

    return historialVentas
        .filter(v =>{

            if(!v.cliente || v.cliente.id !== clienteId) return false;

            if(desde || hasta){

                const f = fechaLocalISO(v.fecha);

                if(desde && f < desde) return false;

                if(hasta && f > hasta) return false;

            }

            return true;

        })
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

}

function htmlVentasCliente(ventas, textoVacio){

    if(ventas.length === 0){

        return `
            <div class="cardVentaHistorial">
                <p class="tablaVacia">${textoVacio}</p>
            </div>
        `;

    }

    return ventas.map(venta =>{

        const vendedor = venta.vendedor ? venta.vendedor.nombre : "—";

        return `
            <div class="cardVentaHistorial">
                <div class="cabeceraVentaHistorial">
                    <div>
                        <span class="fechaVenta">🗓️ ${esc(venta.fechaTexto)}${venta.numero !== undefined ? " · N.º " + esc(venta.numero) : ""}</span>
                        <span class="vendedorVenta">👤 ${esc(vendedor)}</span>
                    </div>
                    <span class="accionesVenta">${botonesVenta(venta)}</span>
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
                    <tbody>${filasProductosVenta(venta)}</tbody>
                </table>
                <div class="totalVentaHistorial">
                    TOTAL: ${dinero(venta.total)}
                </div>
            </div>
        `;

    }).join("");

}

function renderClienteDetalle(id){

    const cliente = clientes.find(c => c.id === id);

    if(!cliente){

        document.getElementById("tituloClienteDetalle").textContent = "Cliente";

        document.getElementById("contenidoClienteDetalle").innerHTML = `
            <div class="card">
                <p>Cliente no encontrado (puede que lo hayan eliminado).</p>
            </div>
        `;

        return;

    }

    if(asegurarIdsPagos(cliente.pagos, "PG")) guardarDatos("clientes");

    // Se conservan las fechas del filtro si la pantalla se vuelve a dibujar.
    const desdePrevio = document.getElementById("fechaDesdeCliente")?.value || "";
    const hastaPrevio = document.getElementById("fechaHastaCliente")?.value || "";

    document.getElementById("tituloClienteDetalle").textContent = cliente.nombre;

    const saldoClass = Number(cliente.saldo || 0) > 0
        ? "saldoDeuda"
        : "saldoOK";

    const totalComprado = historialVentas
        .filter(v => v.cliente && v.cliente.id === cliente.id)
        .reduce((acc, v) => acc + Number(v.total || 0), 0);

    document.getElementById("contenidoClienteDetalle").innerHTML = `

        <div class="detalleClienteGrid">

            <div class="columnaClienteIzquierda">

                <div class="card datosClienteCard">

                    <h2>Datos del cliente</h2>

                    <div class="datoCliente">
                        <span class="labelDato">Nombre</span>
                        <span class="valorDato">${esc(cliente.nombre)}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Dirección</span>
                        <span class="valorDato">${esc(cliente.direccion || "—")}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Teléfono</span>
                        <span class="valorDato">${esc(cliente.telefono || "—")}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Saldo</span>
                        <span class="valorDato ${saldoClass}">${dinero(cliente.saldo || 0)}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Total comprado</span>
                        <span class="valorDato">${dinero(totalComprado)}</span>
                    </div>

                    ${cliente.observaciones ? `
                        <div class="datoCliente">
                            <span class="labelDato">Observaciones</span>
                            <span class="valorDato">${esc(cliente.observaciones)}</span>
                        </div>
                    ` : ""}

                    <div class="accionesDetalleCliente">

                        <button id="btnPreciosCliente" class="btnPrecios">💲 Precios</button>

                        <button id="btnPagarCliente" class="btnRegistrarPago">💵 Registrar pago</button>

                        <button id="btnEstadoCuentaCliente" class="btnPrecios">🖨️ Estado de cuenta</button>

                        ${puede("editarClientes") ? `<button id="btnEditarClienteDetalle" class="btnPrecios">✏️ Editar datos</button>` : ""}

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
                        <input type="date" id="fechaDesdeCliente" value="${esc(desdePrevio)}">
                    </div>

                    <div class="grupoInput">
                        <label>Hasta</label>
                        <input type="date" id="fechaHastaCliente" value="${esc(hastaPrevio)}">
                    </div>

                    <button class="btnBuscarHistorial" id="btnBuscarHistorialCliente">Buscar</button>

                    <button class="btnHoy" id="btnHoyHistorialCliente">Hoy</button>

                    <button class="btnTodas" id="btnTodasHistorialCliente">Todas</button>

                </div>

                <p class="notaHistorialCliente">
                    Ventas registradas a nombre de ${esc(cliente.nombre)}.
                </p>

                <div class="historialClienteLista" id="historialClienteLista"></div>

            </div>

        </div>

    `;

    const enlazar = (idBoton, fn) =>{

        const el = document.getElementById(idBoton);

        if(el) el.onclick = fn;

    };

    enlazar("btnPreciosCliente", ()=> abrirPantallaPreciosClienteDetalle(cliente.id));
    enlazar("btnPagarCliente", ()=> abrirModalPagoCliente(cliente.id));
    enlazar("btnEstadoCuentaCliente", ()=> imprimirEstadoCuentaCliente(cliente.id));
    enlazar("btnEditarClienteDetalle", ()=> editarCliente(cliente.id));
    enlazar("btnBuscarHistorialCliente", ()=> filtrarHistorialCliente(cliente.id));

    enlazar("btnHoyHistorialCliente", ()=>{

        const hoy = fechaLocalISO(new Date());

        document.getElementById("fechaDesdeCliente").value = hoy;
        document.getElementById("fechaHastaCliente").value = hoy;

        filtrarHistorialCliente(cliente.id);

    });

    enlazar("btnTodasHistorialCliente", ()=>{

        document.getElementById("fechaDesdeCliente").value = "";
        document.getElementById("fechaHastaCliente").value = "";

        filtrarHistorialCliente(cliente.id);

    });

    filtrarHistorialCliente(cliente.id);

}

/* ==========================================
   FILTRAR HISTORIAL DEL CLIENTE
========================================== */

function filtrarHistorialCliente(clienteId){

    const cont = document.getElementById("historialClienteLista");

    if(!cont) return;

    const hayFiltro = !!(document.getElementById("fechaDesdeCliente")?.value
        || document.getElementById("fechaHastaCliente")?.value);

    cont.innerHTML = htmlVentasCliente(
        ventasDeClienteFiltradas(clienteId),
        hayFiltro
            ? "No hay ventas en este período."
            : "Este cliente todavía no tiene ventas registradas."
    );

}

/* ==========================================
   HISTORIAL DE PAGOS DEL CLIENTE
========================================== */

function textoMetodoPagoSimple(pago){

    if(pago.tipoPago === "transferencia") return "Transferencia";

    if(pago.tipoPago === "mixto"){

        return "Mixto (E: " + dinero((pago.pago && pago.pago.efectivo) || 0)
            + " · T: " + dinero((pago.pago && pago.pago.transferencia) || 0) + ")";

    }

    return "Efectivo";

}

function renderHistorialPagosCliente(cliente){

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
                    <small>🗓️ ${esc(pago.fechaTexto)} · ${esc(textoMetodoPagoSimple(pago))}</small>
                </div>
                <div class="detallePagoCliente">
                    ${pago.ventaId
                        ? `<span>Aplicado a la venta del ${esc(pago.ventaFechaTexto || "—")}</span>
                           <span>Le quedaban ${dinero(pago.restanteVenta || 0)} de esa venta</span>`
                        : `<span>A cuenta del saldo general</span>`}
                    ${pago.vendedor && pago.vendedor.nombre ? `<span>Cobró: ${esc(pago.vendedor.nombre)}</span>` : ""}
                </div>
                ${esAdmin() ? `
                    <div class="accionesTabla">
                        <button class="btnAccion btnEditar" title="Editar pago"
                            onclick="editarPagoCliente('${esc(cliente.id)}', '${esc(pago.id)}')">✏️</button>
                        <button class="btnAccion btnBorrar" title="Eliminar pago"
                            onclick="eliminarPagoCliente('${esc(cliente.id)}', '${esc(pago.id)}')">🗑️</button>
                    </div>
                ` : ""}
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

    const mapaBotones = {
        efectivo: "btnEfectivoPagoCliente",
        transferencia: "btnTransferenciaPagoCliente",
        mixto: "btnMixtoPagoCliente"
    };

    Object.keys(mapaBotones).forEach(k =>{

        document.getElementById(mapaBotones[k])?.classList.toggle("activo", k === tipo);

    });

    const pagoMixto = document.getElementById("pagoMixtoPagoCliente");

    if(pagoMixto) pagoMixto.classList.toggle("activo", tipo === "mixto");

}

function abrirModalPagoCliente(id){

    const cliente = clientes.find(c => c.id === id);

    if(!cliente) return;

    clientePagoActualId = id;

    document.getElementById("saldoActualPago").value = dinero(cliente.saldo || 0);

    limpiar("montoPagoCliente", "montoEfectivoPagoCliente", "montoTransferenciaPagoCliente");

    cambiarMetodoPagoCliente("efectivo");

    const ventasPendientes = historialVentas
        .filter(v => v.cliente && v.cliente.id === id && pendienteVenta(v) > 0)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const general = saldoGeneralCliente(cliente);

    const lista = document.getElementById("listaVentasPendientesPago");

    let html = ventasPendientes.map((v, i) => `
        <label class="filaVentaPendiente">
            <input
                type="radio"
                name="ventaPagoSeleccionada"
                value="${esc(v.id)}"
                ${i === 0 ? "checked" : ""}>
            <span>
                🗓️ ${esc(v.fechaTexto)} — debe <strong>${dinero(pendienteVenta(v))}</strong>
                de ${dinero(v.total)}
            </span>
        </label>
    `).join("");

    // Deuda que no viene de una venta (saldo cargado a mano).
    if(general > 0.01){

        html += `
            <label class="filaVentaPendiente">
                <input
                    type="radio"
                    name="ventaPagoSeleccionada"
                    value="__general__"
                    ${ventasPendientes.length === 0 ? "checked" : ""}>
                <span>
                    Saldo general (deuda anterior, sin venta asociada) — debe
                    <strong>${dinero(general)}</strong>
                </span>
            </label>
        `;

    }

    lista.innerHTML = html
        || `<p class="tablaVacia">Este cliente no tiene nada pendiente de pago.</p>`;

    abrir("modalPagoCliente");

    setTimeout(()=> document.getElementById("montoPagoCliente").focus(), 100);

}

/* Arma el desglose efectivo/transferencia de un pago. Devuelve
   null (y avisa) si los montos del pago mixto no cierran. */
function armarDesglosePago(metodo, monto, idEfectivo, idTransferencia){

    const pago = { efectivo: 0, transferencia: 0 };

    if(metodo === "efectivo"){

        pago.efectivo = monto;

    }else if(metodo === "transferencia"){

        pago.transferencia = monto;

    }else{

        pago.efectivo = numeroDe(idEfectivo);
        pago.transferencia = numeroDe(idTransferencia);

        if(Math.abs(pago.efectivo + pago.transferencia - monto) > 0.01){

            notificacion(
                "Los montos del pago mixto deben sumar " + dinero(monto) + ".",
                "warning"
            );

            return null;

        }

    }

    return pago;

}

function guardarPagoCliente(){

    if(!clientePagoActualId) return;

    const cliente = clientes.find(c => c.id === clientePagoActualId);

    if(!cliente) return;

    const seleccion = document.querySelector('input[name="ventaPagoSeleccionada"]:checked');

    if(!seleccion){

        notificacion("Este cliente no tiene nada pendiente para aplicar el pago.", "warning");

        return;

    }

    const esGeneral = seleccion.value === "__general__";

    const venta = esGeneral ? null : historialVentas.find(v => v.id === seleccion.value);

    if(!esGeneral && !venta){

        notificacion("No se encontró esa venta.", "warning");

        return;

    }

    const monto = numeroDe("montoPagoCliente");

    const pendiente = esGeneral ? saldoGeneralCliente(cliente) : pendienteVenta(venta);

    if(monto <= 0){

        notificacion("Ingrese un monto válido.", "warning");

        return;

    }

    if(monto > pendiente + 0.01){

        notificacion(
            "Ese pago (" + dinero(monto) + ") es mayor a lo que debe ahí (" + dinero(pendiente) + "). "
            + "Elegí otra opción o cargá un monto menor.",
            "warning"
        );

        return;

    }

    // Desglose efectivo/transferencia, igual que en ventas y gastos,
    // para que esta plata se sume después en la Caja.
    const pago = armarDesglosePago(metodoPagoCliente, monto, "montoEfectivoPagoCliente", "montoTransferenciaPagoCliente");

    if(!pago) return;

    const restante = redondear(Math.max(0, pendiente - monto), 2);

    if(venta){

        venta.saldoPendiente = restante;
        venta.pagada = restante <= 0.01;

    }

    cliente.saldo = redondear(Math.max(0, Number(cliente.saldo || 0) - monto), 2);

    if(!cliente.pagos) cliente.pagos = [];

    const ahora = new Date();

    cliente.pagos.push({

        id: nuevoId("PG"),
        fecha: ahora.toISOString(),
        fechaTexto: fechaHoraTexto(ahora),
        monto,
        tipoPago: metodoPagoCliente,
        pago,
        ventaId: venta ? venta.id : null,
        ventaFechaTexto: venta ? venta.fechaTexto : null,
        restanteVenta: restante,

        // Para que la Caja separe esta plata por empleado.
        vendedor: usuarioActual
            ? { usuario: usuarioActual.usuario, nombre: usuarioActual.nombre }
            : null

    });

    guardarDatos("clientes", "historialVentas");

    cerrarModalPagoCliente();

    renderClienteDetalle(cliente.id);

    clientePagoActualId = null;

    notificacion(
        venta && restante <= 0.01
            ? "¡Venta saldada! Quedó marcada como pagada."
            : "Pago registrado. Quedan " + dinero(restante) + (venta ? " de esa venta." : " del saldo general.")
    );

}

/* ==========================================
   EDITAR / ELIMINAR UN PAGO (SOLO ADMIN)
   El mismo modal sirve para pagos de clientes
   y pagos a proveedores.
========================================== */

let pagoEditando = null;

function abrirModalEditarPago(contexto, pago, conMetodo){

    pagoEditando = contexto;

    document.getElementById("montoEditarPago").value = pago.monto || "";
    document.getElementById("fechaEditarPago").value = fechaParaInputLocal(pago.fecha);

    document.getElementById("grupoMetodoEditarPago").classList.toggle("oculto", !conMetodo);

    const metodo = document.getElementById("metodoEditarPago");

    metodo.value = pago.tipoPago || "efectivo";

    document.getElementById("efectivoEditarPago").value = (pago.pago && pago.pago.efectivo) || "";
    document.getElementById("transferenciaEditarPago").value = (pago.pago && pago.pago.transferencia) || "";

    const alternar = () => document.getElementById("mixtoEditarPago")
        .classList.toggle("oculto", !conMetodo || metodo.value !== "mixto");

    metodo.onchange = alternar;

    alternar();

    abrir("modalEditarPago");

}

function editarPagoCliente(clienteId, pagoId){

    if(!soloAdmin()) return;

    const cliente = clientes.find(c => c.id === clienteId);

    const pago = cliente ? (cliente.pagos || []).find(p => p.id === pagoId) : null;

    if(!pago) return;

    abrirModalEditarPago({ tipo: "cliente", duenoId: clienteId, pagoId }, pago, true);

}

function guardarPagoEditado(){

    if(!soloAdmin() || !pagoEditando) return;

    const monto = numeroDe("montoEditarPago");

    if(monto <= 0){

        notificacion("Ingresá un monto válido.", "warning");

        return;

    }

    const fechaValor = document.getElementById("fechaEditarPago").value;

    const fecha = fechaValor ? new Date(fechaValor) : null;

    if(fecha && isNaN(fecha.getTime())){

        notificacion("La fecha no es válida.", "warning");

        return;

    }

    const ok = pagoEditando.tipo === "cliente"
        ? aplicarEdicionPagoCliente(monto, fecha)
        : aplicarEdicionPagoProveedor(monto, fecha);

    if(!ok) return;

    cerrar("modalEditarPago");

    pagoEditando = null;

    notificacion("Pago actualizado.");

}

function aplicarEdicionPagoCliente(monto, fecha){

    const cliente = clientes.find(c => c.id === pagoEditando.duenoId);

    const pago = cliente ? (cliente.pagos || []).find(p => p.id === pagoEditando.pagoId) : null;

    if(!pago) return false;

    const metodo = document.getElementById("metodoEditarPago").value;

    const desglose = armarDesglosePago(metodo, monto, "efectivoEditarPago", "transferenciaEditarPago");

    if(!desglose) return false;

    const diferencia = redondear(monto - Number(pago.monto || 0), 2);

    const venta = pago.ventaId ? historialVentas.find(v => v.id === pago.ventaId) : null;

    const disponible = venta && venta.metodoPago === "debe"
        ? pendienteVenta(venta)
        : (pago.ventaId ? Number(cliente.saldo || 0) : saldoGeneralCliente(cliente));

    if(diferencia > disponible + 0.01){

        notificacion(
            "El pago no puede superar lo que se debía: como máximo "
            + dinero(Number(pago.monto || 0) + disponible) + ".",
            "warning"
        );

        return false;

    }

    if(venta && venta.metodoPago === "debe"){

        venta.saldoPendiente = redondear(Math.max(0, pendienteVenta(venta) - diferencia), 2);
        venta.pagada = venta.saldoPendiente <= 0.01;

        pago.restanteVenta = venta.saldoPendiente;

    }

    cliente.saldo = redondear(Math.max(0, Number(cliente.saldo || 0) - diferencia), 2);

    pago.monto = monto;
    pago.tipoPago = metodo;
    pago.pago = desglose;

    if(fecha){

        pago.fecha = fecha.toISOString();
        pago.fechaTexto = fechaHoraTexto(fecha);

    }

    guardarDatos("clientes", "historialVentas");

    renderClienteDetalle(cliente.id);

    return true;

}

function eliminarPagoCliente(clienteId, pagoId){

    if(!soloAdmin()) return;

    const cliente = clientes.find(c => c.id === clienteId);

    const pago = cliente ? (cliente.pagos || []).find(p => p.id === pagoId) : null;

    if(!pago) return;

    confirmar(
        "¿Eliminar el pago de " + dinero(pago.monto) + " del " + pago.fechaTexto
        + "? Esa plata vuelve a figurar como deuda del cliente.",
        ()=>{

            const venta = pago.ventaId ? historialVentas.find(v => v.id === pago.ventaId) : null;

            if(venta && venta.metodoPago === "debe"){

                venta.saldoPendiente = redondear(
                    Math.min(Number(venta.total || 0), pendienteVenta(venta) + Number(pago.monto || 0)),
                    2
                );

                venta.pagada = venta.saldoPendiente <= 0.01;

            }

            cliente.saldo = redondear(Number(cliente.saldo || 0) + Number(pago.monto || 0), 2);

            cliente.pagos = cliente.pagos.filter(p => p.id !== pagoId);

            registrarEliminacion(
                "Pago de cliente",
                "Pago de " + cliente.nombre + " · " + dinero(pago.monto) + " · " + pago.fechaTexto,
                pago
            );

            guardarDatos("clientes", "historialVentas", "eliminaciones");

            renderClienteDetalle(cliente.id);

            notificacion("Pago eliminado.", "error");

        }
    );

}

/* ==========================================
   ESTADO DE CUENTA IMPRIMIBLE
========================================== */

function imprimirEstadoCuentaCliente(clienteId){

    const cliente = clientes.find(c => c.id === clienteId);

    if(!cliente) return;

    const n = configuracionSistema.negocio || {};

    const pendientes = historialVentas
        .filter(v => v.cliente && v.cliente.id === clienteId && pendienteVenta(v) > 0)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const general = saldoGeneralCliente(cliente);

    const filasVentas = pendientes.map(v => `
        <tr>
            <td>${esc(v.fechaTexto)}</td>
            <td>${(v.productos || []).map(i => esc(formatearCantidadItem(i) + " " + unidadVenta(i.modo).toLowerCase() + " " + i.nombre)).join("<br>")}</td>
            <td class="derecha">${dinero(v.total)}</td>
            <td class="derecha"><strong>${dinero(pendienteVenta(v))}</strong></td>
        </tr>
    `).join("");

    const pagos = [...(cliente.pagos || [])]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 15);

    const filasPagos = pagos.map(p => `
        <tr>
            <td>${esc(p.fechaTexto)}</td>
            <td>${esc(textoMetodoPagoSimple(p))}</td>
            <td class="derecha">${dinero(p.monto)}</td>
        </tr>
    `).join("");

    imprimirHtml(`
        <div class="hojaImpresion">
            <h1>${esc(n.nombre || "")}</h1>
            <p>${[n.direccion, n.telefono].filter(Boolean).map(esc).join(" · ")}</p>
            <h2>Estado de cuenta — ${esc(cliente.nombre)}</h2>
            <p>Fecha: ${esc(fechaHoraTexto(new Date()))}</p>
            <h3>Ventas pendientes de pago</h3>
            ${pendientes.length ? `
                <table>
                    <thead><tr><th>Fecha</th><th>Detalle</th><th class="derecha">Total</th><th class="derecha">Debe</th></tr></thead>
                    <tbody>${filasVentas}</tbody>
                </table>
            ` : "<p>No tiene ventas pendientes.</p>"}
            ${general > 0.01 ? `<p>Saldo anterior (sin venta asociada): <strong>${dinero(general)}</strong></p>` : ""}
            <p class="totalHoja">SALDO TOTAL: ${dinero(cliente.saldo || 0)}</p>
            ${pagos.length ? `
                <h3>Últimos pagos</h3>
                <table>
                    <thead><tr><th>Fecha</th><th>Forma de pago</th><th class="derecha">Monto</th></tr></thead>
                    <tbody>${filasPagos}</tbody>
                </table>
            ` : ""}
        </div>
    `, "impresionHoja");

}
