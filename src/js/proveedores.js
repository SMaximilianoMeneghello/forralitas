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

            <button
                id="btnAgregarProveedor"
                class="btnAgregar">

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

                    <tbody id="tablaProveedoresBody">

                    </tbody>

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

    tbody.innerHTML = "";

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
                    No se encontraron proveedores para "${filtroProveedores}".
                </td>
            </tr>
        `;

        return;

    }

    listaFiltrada.forEach(proveedor =>{

        const alerta = obtenerProximoVencimientoProveedor(proveedor);

        tbody.innerHTML += `
            <tr>
                <td><strong>${proveedor.nombre}</strong></td>
                <td>${proveedor.telefono || "—"}</td>
                <td>${proveedor.direccion || "—"}</td>
                <td>${proveedor.diasPago ? "Cada " + proveedor.diasPago + " días" : "—"}</td>
                <td>${dinero(saldoPendienteProveedor(proveedor))}</td>
                <td>${alerta}</td>
                <td class="accionesTabla">
                    <button
                        class="btnAccion btnVer"
                        title="Ver detalle"
                        onclick="verDetalleProveedor('${proveedor.id}')">
                        👁️
                    </button>
                    <button
                        class="btnAccion btnEditar"
                        title="Editar"
                        onclick="editarProveedor('${proveedor.id}')">
                        ✏️
                    </button>
                    <button
                        class="btnAccion btnBorrar"
                        title="Eliminar"
                        onclick="eliminarProveedor('${proveedor.id}')">
                        🗑️
                    </button>
                </td>
            </tr>
        `;

    });

}

/* ==========================================
   SALDO Y VENCIMIENTOS
========================================== */

function saldoPendienteProveedor(proveedor){

    return (proveedor.compras || [])
        .reduce((acc, c) => acc + Number(c.saldoPendiente || 0), 0);

}

function obtenerProximoVencimientoProveedor(proveedor){

    const comprasDebiendo = (proveedor.compras || [])
        .filter(c => Number(c.saldoPendiente || 0) > 0.01 && c.fechaVencimiento);

    if(comprasDebiendo.length === 0) return `<span class="subMetrica">Al día</span>`;

    const proxima = comprasDebiendo
        .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento))[0];

    const hoy = fechaLocalISO(new Date());

    if(proxima.fechaVencimiento < hoy){

        return `<span style="color:var(--rojo);font-weight:800">⚠ Vencido (${proxima.fechaVencimientoTexto})</span>`;

    }

    if(proxima.fechaVencimiento === hoy){

        return `<span style="color:var(--rojo);font-weight:800">⚠ Vence hoy</span>`;

    }

    return `<span class="subMetrica">Vence ${proxima.fechaVencimientoTexto}</span>`;

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
        ? Number(document.getElementById("diasPagoProveedorOtro").value) || null
        : (seleccionDias ? Number(seleccionDias) : null);

    if(proveedorEditandoId){

        const proveedor = proveedores.find(p => p.id === proveedorEditandoId);

        if(proveedor){

            proveedor.nombre = nombre;
            proveedor.telefono = telefono;
            proveedor.direccion = direccion;
            proveedor.diasPago = diasPago;
            proveedor.observaciones = observaciones;

            notificacion("Proveedor actualizado.");

        }

    }else{

        proveedores.push({

            id: "PR" + Date.now(),

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

    proveedorEditandoId = null;

}

function eliminarProveedor(id){

    const proveedor = proveedores.find(p => p.id === id);

    if(!proveedor) return;

    confirmar(

        "¿Eliminar al proveedor " + proveedor.nombre + "?",

        ()=>{

            proveedores = proveedores.filter(p => p.id !== id);

            registrarEliminacion(

                "Proveedor",

                "Proveedor " + proveedor.nombre
                + (proveedor.telefono ? " · " + proveedor.telefono : ""),

                proveedor

            );

            guardarDatos("proveedores");

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
