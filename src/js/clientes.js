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

            <label class="filtroCheck">
                <input type="checkbox" id="soloDeudores"> Solo los que deben
            </label>

            <button id="btnAgregarCliente" class="btnAgregar">
                + Agregar cliente
            </button>

        </div>

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

                    <tbody id="tablaClientesBody"></tbody>

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

    document.getElementById("soloDeudores").addEventListener("change", actualizarTablaClientes);

    actualizarTablaClientes();

}

function actualizarTablaClientes(){

    const tbody = document.getElementById("tablaClientesBody");

    if(!tbody) return;

    const soloDeudores = !!(document.getElementById("soloDeudores") || {}).checked;

    let listaFiltrada = !filtroClientes
        ? clientes
        : clientes.filter(c =>
            (c.nombre || "").toLowerCase().includes(filtroClientes)
            || (c.direccion || "").toLowerCase().includes(filtroClientes)
            || (c.telefono || "").toLowerCase().includes(filtroClientes)
        );

    if(soloDeudores) listaFiltrada = listaFiltrada.filter(c => Number(c.saldo || 0) > 0.01);

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
                    No se encontraron clientes${filtroClientes ? ` para "${esc(filtroClientes)}"` : ""}.
                </td>
            </tr>
        `;

        return;

    }

    const editar = puede("editarClientes");

    tbody.innerHTML = listaFiltrada.map(cliente =>{

        const saldoClass = Number(cliente.saldo || 0) > 0
            ? "saldoDeuda"
            : "saldoOK";

        return `
            <tr>
                <td><strong>${esc(cliente.nombre)}</strong></td>
                <td>${esc(cliente.direccion || "—")}</td>
                <td>${esc(cliente.telefono || "—")}</td>
                <td class="${saldoClass}">${dinero(cliente.saldo || 0)}</td>
                <td class="accionesTabla">
                    <button
                        class="btnAccion btnVer"
                        title="Ver detalle"
                        onclick="verDetalleCliente('${esc(cliente.id)}')">
                        👁️
                    </button>
                    ${editar ? `
                    <button
                        class="btnAccion btnEditar"
                        title="Editar"
                        onclick="editarCliente('${esc(cliente.id)}')">
                        ✏️
                    </button>
                    <button
                        class="btnAccion btnBorrar"
                        title="Eliminar"
                        onclick="eliminarCliente('${esc(cliente.id)}')">
                        🗑️
                    </button>
                    ` : ""}
                </td>
            </tr>
        `;

    }).join("");

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

    const saldo = document.getElementById("saldoCliente");

    saldo.value = 0;
    saldo.readOnly = false;

    document.getElementById("ayudaSaldoCliente").textContent =
        "Si ya te debía plata de antes, cargá acá cuánto.";

    abrir("modalCliente");

    setTimeout(()=> document.getElementById("nombreCliente").focus(), 100);

}

function editarCliente(id){

    if(!puede("editarClientes")){ avisarSinPermiso(); return; }

    const cliente = clientes.find(c => c.id === id);

    if(!cliente) return;

    clienteEditandoId = id;

    document.getElementById("tituloModalCliente").textContent = "Editar Cliente";

    document.getElementById("nombreCliente").value = cliente.nombre || "";
    document.getElementById("telefonoCliente").value = cliente.telefono || "";
    document.getElementById("direccionCliente").value = cliente.direccion || "";
    document.getElementById("observacionesCliente").value = cliente.observaciones || "";

    const saldo = document.getElementById("saldoCliente");

    saldo.value = cliente.saldo || 0;

    // El saldo se mueve solo con las ventas fiadas y los pagos. Corregirlo
    // a mano queda reservado al administrador.
    saldo.readOnly = !esAdmin();

    document.getElementById("ayudaSaldoCliente").textContent = esAdmin()
        ? "Se actualiza solo con las ventas fiadas y los pagos. Cambialo a mano solo para corregir."
        : "Se actualiza solo con las ventas fiadas y los pagos (solo el administrador puede corregirlo).";

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
    const saldo = numeroDe("saldoCliente");
    const observaciones = document.getElementById("observacionesCliente").value.trim();

    const repetido = clientes.find(c =>
        c.id !== clienteEditandoId
        && (c.nombre || "").trim().toLowerCase() === nombre.toLowerCase()
    );

    if(repetido && !guardarCliente.forzar){

        confirmar("Ya existe un cliente llamado \"" + repetido.nombre + "\". ¿Guardar igual?", ()=>{

            guardarCliente.forzar = true;

            try{ guardarCliente(); }finally{ guardarCliente.forzar = false; }

        });

        return;

    }

    if(clienteEditandoId){

        if(!puede("editarClientes")){ avisarSinPermiso(); return; }

        const cliente = clientes.find(c => c.id === clienteEditandoId);

        if(cliente){

            const nombreAnterior = cliente.nombre;

            cliente.nombre = nombre;
            cliente.telefono = telefono;
            cliente.direccion = direccion;
            cliente.observaciones = observaciones;

            if(esAdmin()) cliente.saldo = saldo;

            // El nombre nuevo también se refleja en sus ventas anteriores.
            if(nombreAnterior !== nombre){

                historialVentas.forEach(v =>{

                    if(v.cliente && v.cliente.id === cliente.id) v.cliente.nombre = nombre;

                });

            }

            notificacion("Cliente actualizado.");

        }

    }else{

        clientes.push({
            id: nuevoId("C"),
            nombre,
            telefono,
            direccion,
            saldo,
            observaciones,
            pagos: []
        });

        notificacion("Cliente agregado correctamente.");

    }

    guardarDatos("clientes", "historialVentas");

    cerrarModalCliente();

    actualizarTablaClientes();

    if(pantallaVisible("pantallaClienteDetalle")) renderClienteDetalle(clienteDetalleActualId);

    clienteEditandoId = null;

}

function eliminarCliente(id){

    if(!puede("editarClientes")){ avisarSinPermiso(); return; }

    const cliente = clientes.find(c => c.id === id);

    if(!cliente) return;

    const debe = Number(cliente.saldo || 0) > 0.01
        ? " Todavía debe " + dinero(cliente.saldo) + "."
        : "";

    confirmar(
        "¿Eliminar al cliente " + cliente.nombre + "?" + debe
        + " Sus ventas quedan en el historial.",
        ()=>{

            // Se guardan también sus precios especiales, por si se restaura.
            const copia = JSON.parse(JSON.stringify(cliente));

            copia.preciosEspeciales = obtenerPreciosCliente(id);

            clientes = clientes.filter(c => c.id !== id);

            eliminarPreciosCliente(id);

            if(clienteSeleccionado && clienteSeleccionado.id === id) clienteSeleccionado = null;

            registrarEliminacion(
                "Cliente",
                "Cliente " + cliente.nombre
                + (cliente.telefono ? " · " + cliente.telefono : ""),
                copia
            );

            guardarDatos("clientes", "preciosClientes", "eliminaciones");

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
