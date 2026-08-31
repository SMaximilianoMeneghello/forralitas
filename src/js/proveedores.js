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
                <td colspan="5" class="tablaVacia">
                    Todavía no hay proveedores cargados.
                </td>
            </tr>
        `;

        return;

    }

    if(listaFiltrada.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="tablaVacia">
                    No se encontraron proveedores para "${filtroProveedores}".
                </td>
            </tr>
        `;

        return;

    }

    listaFiltrada.forEach(proveedor =>{

        tbody.innerHTML += `
            <tr>
                <td><strong>${proveedor.nombre}</strong></td>
                <td>${proveedor.telefono || "—"}</td>
                <td>${proveedor.direccion || "—"}</td>
                <td>${proveedor.tipoDePago || "—"}</td>
                <td class="accionesTabla">
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
   MODAL PROVEEDOR
========================================== */

function abrirModalNuevoProveedor(){

    proveedorEditandoId = null;

    document.getElementById("tituloModalProveedor").textContent = "Nuevo Proveedor";

    limpiar(
        "nombreProveedor",
        "telefonoProveedor",
        "direccionProveedor",
        "tipoDePagoProveedor",
        "observacionesProveedor"
    );

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
    document.getElementById("tipoDePagoProveedor").value = proveedor.tipoDePago || "";
    document.getElementById("observacionesProveedor").value = proveedor.observaciones || "";

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

    const tipoDePago = document.getElementById("tipoDePagoProveedor").value.trim();

    const observaciones = document.getElementById("observacionesProveedor").value.trim();

    if(proveedorEditandoId){

        const proveedor = proveedores.find(p => p.id === proveedorEditandoId);

        if(proveedor){

            proveedor.nombre = nombre;
            proveedor.telefono = telefono;
            proveedor.direccion = direccion;
            proveedor.tipoDePago = tipoDePago;
            proveedor.observaciones = observaciones;

            notificacion("Proveedor actualizado.");

        }

    }else{

        proveedores.push({

            id: "PR" + Date.now(),

            nombre,
            telefono,
            direccion,
            tipoDePago,
            observaciones

        });

        notificacion("Proveedor agregado correctamente.");

    }

    guardarDatos();

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

            guardarDatos();

            actualizarTablaProveedores();

            notificacion("Proveedor eliminado.", "error");

        }

    );

}

function cerrarModalProveedor(){

    cerrar("modalProveedor");

}
