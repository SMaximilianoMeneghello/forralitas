/* ==========================================
   PROVEEDORES
========================================== */

let proveedorEditandoId = null;
let filtroProveedores = "";

function renderProveedores(){

    contenido().innerHTML = `

        <div class="clientesHeader">

            <div class="buscadorTabla">
                <span class="buscadorTablaIcono">🔍</span>
                <input
                    id="buscarProveedores"
                    type="text"
                    placeholder="Buscar proveedor por nombre, teléfono o dirección..."
                    autocomplete="off">
                <button
                    id="btnLimpiarBuscarProveedores"
                    class="btnLimpiarBuscador oculto"
                    title="Limpiar búsqueda"
                    type="button">✕</button>
            </div>

            <button id="btnAgregarProveedor" class="btnAgregar">
                + Agregar proveedor
            </button>

        </div>

        <div class="card">

            <div class="tablaProveedores">

                <table>

                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Teléfono</th>
                            <th>Dirección</th>
                            <th>Tipo de Pago</th>
                            <th>Debe</th>
                            <th>Vencimiento</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody id="tablaProveedoresBody"></tbody>

                </table>

            </div>

        </div>

    `;

    const btnAgregar = document.getElementById("btnAgregarProveedor");

    if(btnAgregar) btnAgregar.onclick = abrirModalNuevoProveedor;

    filtroProveedores = "";

    const inputBuscar = document.getElementById("buscarProveedores");
    const btnLimpiar = document.getElementById("btnLimpiarBuscarProveedores");

    inputBuscar.addEventListener("input", ()=>{

        filtroProveedores = inputBuscar.value.trim().toLowerCase();

        btnLimpiar.classList.toggle("oculto", filtroProveedores === "");

        actualizarTablaProveedores();

    });

    btnLimpiar.addEventListener("click", ()=>{

        inputBuscar.value = "";
        filtroProveedores = "";
        btnLimpiar.classList.add("oculto");

        actualizarTablaProveedores();

        inputBuscar.focus();

    });

    actualizarTablaProveedores();

}

function actualizarTablaProveedores(){

    const tbody = document.getElementById("tablaProveedoresBody");

    if(!tbody) return;

    const listaFiltrada = !filtroProveedores
        ? proveedores
        : proveedores.filter(p =>
            (p.nombre || "").toLowerCase().includes(filtroProveedores)
            || (p.telefono || "").toLowerCase().includes(filtroProveedores)
            || (p.direccion || "").toLowerCase().includes(filtroProveedores)
        );

    if(proveedores.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="tablaVacia">
                    Todavía no hay proveedores cargados.
                </td>
            </tr>
        `;

        return;

    }

    if(listaFiltrada.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="tablaVacia">
                    No se encontraron proveedores para "${esc(filtroProveedores)}".
                </td>
            </tr>
        `;

        return;

    }

    tbody.innerHTML = listaFiltrada.map(proveedor =>{

        const saldo = saldoPendienteProveedor(proveedor);

        return `
            <tr>
                <td><strong>${esc(proveedor.nombre)}</strong></td>
                <td>${esc(proveedor.telefono || "—")}</td>
                <td>${esc(proveedor.direccion || "—")}</td>
                <td>${proveedor.diasPago ? "Cada " + esc(proveedor.diasPago) + " días" : "—"}</td>
                <td class="${saldo > 0.01 ? "saldoDeuda" : ""}">${dinero(saldo)}</td>
                <td>${obtenerProximoVencimientoProveedor(proveedor)}</td>
                <td class="accionesTabla">
                    <button
                        class="btnAccion btnVer"
                        title="Ver detalle"
                        onclick="verDetalleProveedor('${esc(proveedor.id)}')">
                        👁️
                    </button>
                    <button
                        class="btnAccion btnEditar"
                        title="Editar"
                        onclick="editarProveedor('${esc(proveedor.id)}')">
                        ✏️
                    </button>
                    <button
                        class="btnAccion btnBorrar"
                        title="Eliminar"
                        onclick="eliminarProveedor('${esc(proveedor.id)}')">
                        🗑️
                    </button>
                </td>
            </tr>
        `;

    }).join("");

}

/* ==========================================
   SALDO Y VENCIMIENTOS
========================================== */

function saldoPendienteProveedor(proveedor){

    return redondear((proveedor.compras || [])
        .reduce((acc, c) => acc + Number(c.saldoPendiente || 0), 0), 2);

}

function obtenerProximoVencimientoProveedor(proveedor){

    const comprasDebiendo = (proveedor.compras || [])
        .filter(c => Number(c.saldoPendiente || 0) > 0.01 && c.fechaVencimiento);

    if(comprasDebiendo.length === 0){

        return saldoPendienteProveedor(proveedor) > 0.01
            ? `<span class="subMetrica">Sin fecha</span>`
            : `<span class="subMetrica">Al día</span>`;

    }

    const proxima = [...comprasDebiendo]
        .sort((a, b) => String(a.fechaVencimiento).localeCompare(String(b.fechaVencimiento)))[0];

    const hoy = fechaLocalISO(new Date());

    const texto = esc(proxima.fechaVencimientoTexto || fechaTextoDeISO(proxima.fechaVencimiento));

    if(proxima.fechaVencimiento < hoy){

        return `<span style="color:var(--rojo);font-weight:800">⚠ Vencido (${texto})</span>`;

    }

    if(proxima.fechaVencimiento === hoy){

        return `<span style="color:var(--rojo);font-weight:800">⚠ Vence hoy</span>`;

    }

    return `<span class="subMetrica">Vence ${texto}</span>`;

}

/* Fecha de vencimiento de una compra según cada cuántos días se
   le paga al proveedor. */
function calcularVencimientoCompra(fechaISO, diasPago){

    if(!diasPago) return { fechaVencimiento: null, fechaVencimientoTexto: null };

    const vencimiento = new Date(fechaISO + "T00:00:00");

    vencimiento.setDate(vencimiento.getDate() + Number(diasPago));

    const iso = fechaLocalISO(vencimiento);

    return { fechaVencimiento: iso, fechaVencimientoTexto: fechaTextoDeISO(iso) };

}

/* ==========================================
   MODAL PROVEEDOR
========================================== */

function abrirModalNuevoProveedor(){

    proveedorEditandoId = null;

    document.getElementById("tituloModalProveedor").textContent = "Nuevo Proveedor";

    limpiar(
        "nombreProveedor",
        "telefonoProveedor",
        "direccionProveedor",
        "diasPagoProveedorOtro",
        "observacionesProveedor"
    );

    document.getElementById("diasPagoProveedor").value = "";

    document.getElementById("grupoDiasPagoOtro").classList.add("oculto");

    abrir("modalProveedor");

    setTimeout(()=> document.getElementById("nombreProveedor").focus(), 100);

}

function editarProveedor(id){

    const proveedor = proveedores.find(p => p.id === id);

    if(!proveedor) return;

    proveedorEditandoId = id;

    document.getElementById("tituloModalProveedor").textContent = "Editar Proveedor";

    document.getElementById("nombreProveedor").value = proveedor.nombre || "";
    document.getElementById("telefonoProveedor").value = proveedor.telefono || "";
    document.getElementById("direccionProveedor").value = proveedor.direccion || "";
    document.getElementById("observacionesProveedor").value = proveedor.observaciones || "";

    const opcionesComunes = ["7", "15", "30", "45", "60"];

    if(!proveedor.diasPago){

        document.getElementById("diasPagoProveedor").value = "";
        document.getElementById("grupoDiasPagoOtro").classList.add("oculto");

    }else if(opcionesComunes.includes(String(proveedor.diasPago))){

        document.getElementById("diasPagoProveedor").value = String(proveedor.diasPago);
        document.getElementById("grupoDiasPagoOtro").classList.add("oculto");

    }else{

        document.getElementById("diasPagoProveedor").value = "otro";
        document.getElementById("diasPagoProveedorOtro").value = proveedor.diasPago;
        document.getElementById("grupoDiasPagoOtro").classList.remove("oculto");

    }

    abrir("modalProveedor");

}

function guardarProveedor(){

    if(!puede("proveedores")){ avisarSinPermiso(); return; }

    const nombre = document.getElementById("nombreProveedor").value.trim();

    if(!nombre){

        notificacion("El nombre del proveedor es obligatorio.", "warning");

        return;

    }

    const telefono = document.getElementById("telefonoProveedor").value.trim();
    const direccion = document.getElementById("direccionProveedor").value.trim();
    const observaciones = document.getElementById("observacionesProveedor").value.trim();

    const seleccionDias = document.getElementById("diasPagoProveedor").value;

    const diasPago = seleccionDias === "otro"
        ? Math.round(numeroDe("diasPagoProveedorOtro")) || null
        : (seleccionDias ? Number(seleccionDias) : null);

    if(proveedorEditandoId){

        const proveedor = proveedores.find(p => p.id === proveedorEditandoId);

        if(proveedor){

            const cambioDias = (proveedor.diasPago || null) !== diasPago;

            proveedor.nombre = nombre;
            proveedor.telefono = telefono;
            proveedor.direccion = direccion;
            proveedor.diasPago = diasPago;
            proveedor.observaciones = observaciones;

            // Si cambió cada cuánto se le paga, se recalculan los
            // vencimientos de lo que todavía se le debe.
            if(cambioDias){

                (proveedor.compras || []).forEach(c =>{

                    if(Number(c.saldoPendiente || 0) > 0.01){

                        Object.assign(c, calcularVencimientoCompra(c.fecha, diasPago));

                    }

                });

            }

            notificacion("Proveedor actualizado.");

        }

    }else{

        proveedores.push({
            id: nuevoId("PR"),
            nombre,
            telefono,
            direccion,
            diasPago,
            observaciones,
            compras: [],
            pagos: []
        });

        notificacion("Proveedor agregado correctamente.");

    }

    guardarDatos("proveedores");

    cerrarModalProveedor();

    actualizarTablaProveedores();

    if(pantallaVisible("pantallaProveedorDetalle")) renderProveedorDetalle(proveedorDetalleActualId);

    proveedorEditandoId = null;

}

function eliminarProveedor(id){

    if(!puede("proveedores")){ avisarSinPermiso(); return; }

    const proveedor = proveedores.find(p => p.id === id);

    if(!proveedor) return;

    const saldo = saldoPendienteProveedor(proveedor);

    confirmar(
        "¿Eliminar al proveedor " + proveedor.nombre + "?"
        + (saldo > 0.01 ? " Todavía se le deben " + dinero(saldo) + "." : "")
        + " Se borra también su historial de compras y pagos.",
        ()=>{

            proveedores = proveedores.filter(p => p.id !== id);

            registrarEliminacion(
                "Proveedor",
                "Proveedor " + proveedor.nombre
                + (proveedor.telefono ? " · " + proveedor.telefono : ""),
                proveedor
            );

            guardarDatos("proveedores", "eliminaciones");

            actualizarTablaProveedores();

            notificacion("Proveedor eliminado.", "error");

        }
    );

}

function cerrarModalProveedor(){

    cerrar("modalProveedor");

}

function verDetalleProveedor(id){

    proveedorDetalleActualId = id;

    abrirPantallaProveedorDetalle();

    renderProveedorDetalle(id);

}

document.addEventListener("DOMContentLoaded", ()=>{

    const selectDias = document.getElementById("diasPagoProveedor");

    if(selectDias){

        selectDias.addEventListener("change", ()=>{

            document.getElementById("grupoDiasPagoOtro")
                .classList.toggle("oculto", selectDias.value !== "otro");

        });

    }

});
