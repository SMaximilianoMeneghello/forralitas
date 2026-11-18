/* ==========================================
   CLIENTES
========================================== */

let clienteEditandoId = null;
let filtroClientes = "";

function renderClientes(){

    contenido().innerHTML = `

        <div class="clientesHeader">

            <div class="buscadorTabla">
                <span class="buscadorTablaIcono">🔍</span>
                <input
                    id="buscarClientes"
                    type="text"
                    placeholder="Buscar cliente por nombre, dirección o teléfono..."
                    autocomplete="off">
                <button
                    id="btnLimpiarBuscarClientes"
                    class="btnLimpiarBuscador oculto"
                    title="Limpiar búsqueda"
                    type="button">✕</button>
            </div>

            <button
                id="btnAgregarCliente"
                class="btnAgregar">

                + Agregar cliente

            </button>

        </div>

        ${mjBarraClientes()}

        <div class="card">

            <div class="tablaClientes">

                <table>

                    <thead>

                        <tr>
                            <th>Nombre</th>
                            <th>Dirección</th>
                            <th>Teléfono</th>
                            <th>Saldo</th>
                            <th>Acciones</th>
                        </tr>

                    </thead>

                    <tbody id="tablaClientesBody">

                    </tbody>

                </table>

            </div>

        </div>

    `;

    const btnAgregar = document.getElementById("btnAgregarCliente");

    if(btnAgregar) btnAgregar.onclick = abrirModalNuevoCliente;

    filtroClientes = "";

    const inputBuscar = document.getElementById("buscarClientes");
    const btnLimpiar = document.getElementById("btnLimpiarBuscarClientes");

    inputBuscar.addEventListener("input", ()=>{

        filtroClientes = inputBuscar.value.trim().toLowerCase();

        btnLimpiar.classList.toggle("oculto", filtroClientes === "");

        actualizarTablaClientes();

    });

    btnLimpiar.addEventListener("click", ()=>{

        inputBuscar.value = "";
        filtroClientes = "";
        btnLimpiar.classList.add("oculto");

        actualizarTablaClientes();

        inputBuscar.focus();

    });

    actualizarTablaClientes();

}

function actualizarTablaClientes(){

    const tbody = document.getElementById("tablaClientesBody");

    if(!tbody) return;

    tbody.innerHTML = "";

    const listaFiltrada = mjFiltrarClientes(!filtroClientes
        ? clientes
        : clientes.filter(c =>
            (c.nombre || "").toLowerCase().includes(filtroClientes)
            || (c.direccion || "").toLowerCase().includes(filtroClientes)
            || (c.telefono || "").toLowerCase().includes(filtroClientes)
        ));

    if(clientes.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="tablaVacia">
                    Todavía no hay clientes cargados.
                </td>
            </tr>
        `;

        return;

    }

    if(listaFiltrada.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="tablaVacia">
                    No se encontraron clientes para "${filtroClientes}".
                </td>
            </tr>
        `;

        return;

    }

    listaFiltrada.forEach(cliente =>{

        const saldoClass = Number(cliente.saldo || 0) > 0
            ? "saldoDeuda"
            : "saldoOK";

        tbody.innerHTML += `
            <tr>
                <td><strong>${cliente.nombre}</strong></td>
                <td>${cliente.direccion || "—"}</td>
                <td>${cliente.telefono || "—"}</td>
                <td class="${saldoClass}">${dinero(cliente.saldo || 0)}</td>
                <td class="accionesTabla">
                    <button
                        class="btnAccion btnVer"
                        title="Ver detalle"
                        onclick="verDetalleCliente('${cliente.id}')">
                        👁️
                    </button>
                    <button
                        class="btnAccion btnEditar"
                        title="Editar"
                        onclick="editarCliente('${cliente.id}')">
                        ✏️
                    </button>
                    <button
                        class="btnAccion btnBorrar"
                        title="Eliminar"
                        onclick="eliminarCliente('${cliente.id}')">
                        🗑️
                    </button>
                </td>
            </tr>
        `;

    });

}

/* ==========================================
   MODAL CLIENTE (NUEVO / EDITAR)
========================================== */

function abrirModalNuevoCliente(){

    clienteEditandoId = null;

    document.getElementById("tituloModalCliente").textContent = "Nuevo Cliente";

    limpiar(
        "nombreCliente",
        "telefonoCliente",
        "direccionCliente",
        "observacionesCliente"
    );

    document.getElementById("saldoCliente").value = 0;

    abrir("modalCliente");

    setTimeout(()=> document.getElementById("nombreCliente").focus(), 100);

}

function editarCliente(id){

    const cliente = clientes.find(c => c.id === id);

    if(!cliente) return;

    clienteEditandoId = id;

    document.getElementById("tituloModalCliente").textContent = "Editar Cliente";

    document.getElementById("nombreCliente").value = cliente.nombre || "";
    document.getElementById("telefonoCliente").value = cliente.telefono || "";
    document.getElementById("direccionCliente").value = cliente.direccion || "";
    document.getElementById("saldoCliente").value = cliente.saldo || 0;
    document.getElementById("observacionesCliente").value = cliente.observaciones || "";

    abrir("modalCliente");

}

function guardarCliente(){

    const nombre = document.getElementById("nombreCliente").value.trim();

    if(!nombre){

        notificacion("El nombre del cliente es obligatorio.", "warning");

        return;

    }

    const telefono = document.getElementById("telefonoCliente").value.trim();

    const direccion = document.getElementById("direccionCliente").value.trim();

    const saldo = Number(document.getElementById("saldoCliente").value) || 0;

    const observaciones = document.getElementById("observacionesCliente").value.trim();

    if(clienteEditandoId){

        const cliente = clientes.find(c => c.id === clienteEditandoId);

        if(cliente){

            cliente.nombre = nombre;
            cliente.telefono = telefono;
            cliente.direccion = direccion;
            cliente.saldo = saldo;
            cliente.observaciones = observaciones;

            notificacion("Cliente actualizado.");

        }

    }else{

        clientes.push({

            id: "C" + Date.now(),

            nombre,
            telefono,
            direccion,
            saldo,
            observaciones

        });

        notificacion("Cliente agregado correctamente.");

    }

    guardarDatos("clientes");

    cerrarModalCliente();

    actualizarTablaClientes();

    // Si se editó desde la ficha del cliente, la ficha se actualiza.
    mjRefrescarClienteYProductos();

    clienteEditandoId = null;

}

function eliminarCliente(id){

    const cliente = clientes.find(c => c.id === id);

    if(!cliente) return;

    confirmar(

        "¿Eliminar al cliente " + cliente.nombre + "?",

        ()=>{

            clientes = clientes.filter(c => c.id !== id);

            // Se guardan sus precios especiales junto con el cliente, por si
            // el administrador lo restaura desde Eliminaciones.
            const copiaCliente = JSON.parse(JSON.stringify(cliente));

            copiaCliente.preciosEspeciales = obtenerPreciosCliente(id);

            // Se eliminan también los precios personalizados del cliente.
            eliminarPreciosCliente(id);

            registrarEliminacion(

                "Cliente",

                "Cliente " + cliente.nombre
                + (cliente.telefono ? " · " + cliente.telefono : ""),

                copiaCliente

            );

            guardarDatos("clientes");

            actualizarTablaClientes();

            notificacion("Cliente eliminado.", "error");

        }

    );

}

/* ==========================================
   VER DETALLE DE CLIENTE
========================================== */

let clienteDetalleActualId = null;

function verDetalleCliente(id){

    clienteDetalleActualId = id;

    abrirPantallaClienteDetalle();

    renderClienteDetalle(id);

}
