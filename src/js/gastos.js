/* ==========================================
   GASTOS
========================================== */

let gastoEditandoId = null;
let filtroGastos = "";
let metodoPagoGasto = "efectivo";

function cambiarMetodoPagoGasto(tipo){

    metodoPagoGasto = tipo;

    ["btnEfectivoGasto", "btnTransferenciaGasto", "btnMixtoGasto"].forEach(id =>{

        document.getElementById(id)?.classList.remove("activo");

    });

    const mapaBotones = {
        efectivo: "btnEfectivoGasto",
        transferencia: "btnTransferenciaGasto",
        mixto: "btnMixtoGasto"
    };

    document.getElementById(mapaBotones[tipo])?.classList.add("activo");

    const pagoMixtoGasto = document.getElementById("pagoMixtoGasto");

    if(pagoMixtoGasto) pagoMixtoGasto.classList.toggle("activo", tipo === "mixto");

}

function renderGastos(){

    contenido().innerHTML = `

        <div class="gastosBuscador">

            <div class="grupoInput">
                <label>Desde</label>
                <input type="date" id="fechaDesdeGasto">
            </div>

            <div class="grupoInput">
                <label>Hasta</label>
                <input type="date" id="fechaHastaGasto">
            </div>

            <div class="grupoInput grupoInputBuscarTexto">
                <label>Buscar</label>
                <input
                    type="text"
                    id="buscarTextoGasto"
                    placeholder="Descripción o categoría..."
                    autocomplete="off">
            </div>

            <button class="btnBuscar" id="btnBuscarGasto">Buscar</button>

            <button class="btnHoy" id="btnHoyGasto">Hoy</button>

            <button class="btnTodas" id="btnTodasGasto">Todos</button>

            <button
                id="btnAgregarGasto"
                class="btnAgregar">

                + Agregar gasto

            </button>

        </div>

        <div class="card">

            <div class="tablaGastos">

                <table>

                    <thead>

                        <tr>
                            <th>Fecha</th>
                            <th>Descripción</th>
                            <th>Categoría</th>
                            <th>Pago</th>
                            <th>Monto</th>
                            <th>Acciones</th>
                        </tr>

                    </thead>

                    <tbody id="tablaGastosBody">

                    </tbody>

                </table>

            </div>

        </div>

    `;

    const btnAgregar = document.getElementById("btnAgregarGasto");

    if(btnAgregar) btnAgregar.onclick = abrirModalNuevoGasto;

    document.getElementById("btnBuscarGasto").onclick = buscarGastos;

    document.getElementById("btnHoyGasto").onclick = filtrarHoyGastos;

    document.getElementById("btnTodasGasto").onclick = filtrarTodosGastos;

    document.getElementById("buscarTextoGasto").addEventListener("keydown", (e)=>{

        if(e.key === "Enter") buscarGastos();

    });

    filtrarTodosGastos();

}

function filtrarHoyGastos(){

    const hoy = fechaLocalISO(new Date());

    document.getElementById("fechaDesdeGasto").value = hoy;
    document.getElementById("fechaHastaGasto").value = hoy;

    actualizarTablaGastos(hoy, hoy, filtroGastos);

}

function filtrarTodosGastos(){

    document.getElementById("fechaDesdeGasto").value = "";
    document.getElementById("fechaHastaGasto").value = "";
    document.getElementById("buscarTextoGasto").value = "";

    filtroGastos = "";

    actualizarTablaGastos(null, null, "");

}

function buscarGastos(){

    const desde = document.getElementById("fechaDesdeGasto").value;
    const hasta = document.getElementById("fechaHastaGasto").value;

    filtroGastos = document.getElementById("buscarTextoGasto").value.trim().toLowerCase();

    actualizarTablaGastos(desde || null, hasta || null, filtroGastos);

}

function actualizarTablaGastos(desde = null, hasta = null, texto = ""){

    const tbody = document.getElementById("tablaGastosBody");

    if(!tbody) return;

    tbody.innerHTML = "";

    if(gastos.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="tablaVacia">
                    Todavía no hay gastos cargados.
                </td>
            </tr>
        `;

        return;

    }

    let gastosOrdenados = [...gastos].sort((a,b)=>
        new Date(b.fecha || 0) - new Date(a.fecha || 0)
    );

    if(desde || hasta){

        gastosOrdenados = gastosOrdenados.filter(g =>{

            const f = g.fecha || "";

            if(desde && f < desde) return false;

            if(hasta && f > hasta) return false;

            return true;

        });

    }

    if(texto){

        gastosOrdenados = gastosOrdenados.filter(g =>
            (g.descripcion || "").toLowerCase().includes(texto)
            || (g.categoria || "").toLowerCase().includes(texto)
        );

    }

    if(gastosOrdenados.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="tablaVacia">
                    No se encontraron gastos con esos filtros.
                </td>
            </tr>
        `;

        return;

    }

    const etiquetaPago = {
        efectivo: "Efectivo",
        transferencia: "Transferencia",
        mixto: "Mixto"
    };

    gastosOrdenados.forEach(gasto =>{

        tbody.innerHTML += `
            <tr>
                <td>${gasto.fechaTexto || "—"}</td>
                <td>${gasto.descripcion || "—"}</td>
                <td>${gasto.categoria || "general"}</td>
                <td>${etiquetaPago[gasto.metodoPago] || "Efectivo"}</td>
                <td class="saldoDeuda">${dinero(gasto.monto || 0)}</td>
                <td class="accionesTabla">
                    <button
                        class="btnAccion btnEditar"
                        title="Editar"
                        onclick="editarGasto('${gasto.id}')">
                        ✏️
                    </button>
                    <button
                        class="btnAccion btnBorrar"
                        title="Eliminar"
                        onclick="eliminarGasto('${gasto.id}')">
                        🗑️
                    </button>
                </td>
            </tr>
        `;

    });

}

/* ==========================================
   MODAL GASTO
========================================== */

function abrirModalNuevoGasto(){

    gastoEditandoId = null;

    document.getElementById("tituloModalGasto").textContent = "Nuevo Gasto";

    limpiar("descripcionGasto", "montoGasto", "montoEfectivoGasto", "montoTransferenciaGasto");

    document.getElementById("categoriaGasto").value = "general";

    document.getElementById("fechaGasto").value = fechaLocalISO(new Date());

    cambiarMetodoPagoGasto("efectivo");

    abrir("modalGasto");

    setTimeout(()=> document.getElementById("descripcionGasto").focus(), 100);

}

function editarGasto(id){

    const gasto = gastos.find(g => g.id === id);

    if(!gasto) return;

    gastoEditandoId = id;

    document.getElementById("tituloModalGasto").textContent = "Editar Gasto";

    document.getElementById("descripcionGasto").value = gasto.descripcion || "";
    document.getElementById("montoGasto").value = gasto.monto || "";
    document.getElementById("categoriaGasto").value = gasto.categoria || "general";
    document.getElementById("fechaGasto").value = gasto.fecha || fechaLocalISO(new Date());

    const pago = gasto.pago || { efectivo: gasto.monto || 0, transferencia: 0 };

    document.getElementById("montoEfectivoGasto").value = pago.efectivo || "";
    document.getElementById("montoTransferenciaGasto").value = pago.transferencia || "";

    cambiarMetodoPagoGasto(gasto.metodoPago || "efectivo");

    abrir("modalGasto");

}

function refrescarTablaGastosConFiltrosActuales(){

    const desde = document.getElementById("fechaDesdeGasto")?.value || null;
    const hasta = document.getElementById("fechaHastaGasto")?.value || null;

    actualizarTablaGastos(desde, hasta, filtroGastos);

}

function guardarGasto(){

    const descripcion = document.getElementById("descripcionGasto").value.trim();

    if(!descripcion){

        notificacion("La descripción del gasto es obligatoria.", "warning");

        return;

    }

    const monto = Number(document.getElementById("montoGasto").value) || 0;

    if(monto <= 0){

        notificacion("Ingresá un monto válido.", "warning");

        return;

    }

    const categoria = document.getElementById("categoriaGasto").value;

    const fecha = document.getElementById("fechaGasto").value || fechaLocalISO(new Date());

    const fechaTexto = new Date(fecha + "T00:00:00").toLocaleDateString("es-AR");

    let pago = { efectivo: 0, transferencia: 0 };

    if(metodoPagoGasto === "efectivo"){

        pago.efectivo = monto;

    }else if(metodoPagoGasto === "transferencia"){

        pago.transferencia = monto;

    }else{

        pago.efectivo = Number(document.getElementById("montoEfectivoGasto").value) || 0;
        pago.transferencia = Number(document.getElementById("montoTransferenciaGasto").value) || 0;

        const suma = pago.efectivo + pago.transferencia;

        if(Math.abs(suma - monto) > 0.01){

            notificacion(
                "Los montos del pago mixto deben sumar " + dinero(monto) + ".",
                "warning"
            );

            return;

        }

    }

    if(gastoEditandoId){

        const gasto = gastos.find(g => g.id === gastoEditandoId);

        if(gasto){

            gasto.descripcion = descripcion;
            gasto.monto = monto;
            gasto.categoria = categoria;
            gasto.fecha = fecha;
            gasto.fechaTexto = fechaTexto;
            gasto.metodoPago = metodoPagoGasto;
            gasto.pago = pago;

            notificacion("Gasto actualizado.");

        }

    }else{

        gastos.push({

            id: "G" + Date.now(),

            descripcion,
            monto,
            categoria,
            fecha,
            fechaTexto,
            metodoPago: metodoPagoGasto,
            pago

        });

        notificacion("Gasto agregado correctamente.");

    }

    guardarDatos();

    cerrarModalGasto();

    refrescarTablaGastosConFiltrosActuales();

    gastoEditandoId = null;

}

function eliminarGasto(id){

    const gasto = gastos.find(g => g.id === id);

    if(!gasto) return;

    confirmar(

        "¿Eliminar el gasto \"" + gasto.descripcion + "\"?",

        ()=>{

            gastos = gastos.filter(g => g.id !== id);

            registrarEliminacion(

                "Gasto",

                "Gasto " + gasto.descripcion
                + " · " + dinero(gasto.monto),

                gasto

            );

            guardarDatos();

            refrescarTablaGastosConFiltrosActuales();

            notificacion("Gasto eliminado.", "error");

        }

    );

}

function cerrarModalGasto(){

    cerrar("modalGasto");

}
