/* ==========================================
   GASTOS
========================================== */

let gastoEditandoId = null;
let filtroGastos = "";
let metodoPagoGasto = "efectivo";

const CATEGORIAS_GASTO = {
    general: "General",
    compras: "Compras",
    servicios: "Servicios",
    sueldos: "Sueldos",
    otros: "Otros"
};

function cambiarMetodoPagoGasto(tipo){

    metodoPagoGasto = tipo;

    const mapaBotones = {
        efectivo: "btnEfectivoGasto",
        transferencia: "btnTransferenciaGasto",
        mixto: "btnMixtoGasto"
    };

    Object.keys(mapaBotones).forEach(k =>{

        document.getElementById(mapaBotones[k])?.classList.toggle("activo", k === tipo);

    });

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

            <button id="btnAgregarGasto" class="btnAgregar">+ Agregar gasto</button>

        </div>

        <div class="resumenHistorial" id="resumenGastos"></div>

        <div class="card">

            <div class="tablaGastos">

                <table>

                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Descripción</th>
                            <th>Categoría</th>
                            <th>Pago</th>
                            <th>Cargado por</th>
                            <th>Monto</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody id="tablaGastosBody"></tbody>

                </table>

            </div>

        </div>

    `;

    document.getElementById("btnAgregarGasto").onclick = abrirModalNuevoGasto;

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

/* Un empleado puede corregir o borrar un gasto si tiene el permiso
   general o si lo cargó él mismo hoy. */
function puedeTocarGasto(gasto){

    if(puede("gastos")) return true;

    return !!usuarioActual
        && !!gasto.vendedor
        && gasto.vendedor.usuario === usuarioActual.usuario
        && gasto.fecha === fechaLocalISO(new Date());

}

function gastosFiltrados(desde, hasta, texto){

    return [...gastos]
        .sort((a,b)=> String(b.fecha || "").localeCompare(String(a.fecha || "")))
        .filter(g =>{

            const f = g.fecha || "";

            if(desde && f < desde) return false;

            if(hasta && f > hasta) return false;

            if(texto
                && !(g.descripcion || "").toLowerCase().includes(texto)
                && !(g.categoria || "").toLowerCase().includes(texto)) return false;

            return true;

        });

}

function actualizarTablaGastos(desde = null, hasta = null, texto = ""){

    const tbody = document.getElementById("tablaGastosBody");

    if(!tbody) return;

    const lista = gastosFiltrados(desde, hasta, texto);

    const resumen = document.getElementById("resumenGastos");

    if(resumen){

        const total = lista.reduce((acc, g) => acc + Number(g.monto || 0), 0);

        resumen.innerHTML = `
            <span><strong>${lista.length}</strong> gastos</span>
            <span>Total: <strong class="saldoDeuda">${dinero(total)}</strong></span>
            <button class="btnSecundario" id="btnExportarGastos" ${lista.length ? "" : "disabled"}>⬇ Exportar a Excel</button>
        `;

        document.getElementById("btnExportarGastos").onclick = () => exportarGastosCSV(lista);

    }

    if(gastos.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="tablaVacia">
                    Todavía no hay gastos cargados.
                </td>
            </tr>
        `;

        return;

    }

    if(lista.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="tablaVacia">
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

    tbody.innerHTML = lista.map(gasto => `
        <tr>
            <td>${esc(gasto.fechaTexto || fechaTextoDeISO(gasto.fecha))}</td>
            <td>${esc(gasto.descripcion || "—")}</td>
            <td>${esc(CATEGORIAS_GASTO[gasto.categoria] || gasto.categoria || "General")}</td>
            <td>${etiquetaPago[gasto.metodoPago] || "Efectivo"}</td>
            <td>${esc((gasto.vendedor && gasto.vendedor.nombre) || "—")}</td>
            <td class="saldoDeuda">${dinero(gasto.monto || 0)}</td>
            <td class="accionesTabla">
                ${puedeTocarGasto(gasto) ? `
                <button
                    class="btnAccion btnEditar"
                    title="Editar"
                    onclick="editarGasto('${esc(gasto.id)}')">
                    ✏️
                </button>
                <button
                    class="btnAccion btnBorrar"
                    title="Eliminar"
                    onclick="eliminarGasto('${esc(gasto.id)}')">
                    🗑️
                </button>
                ` : "—"}
            </td>
        </tr>
    `).join("");

}

function exportarGastosCSV(lista){

    const filas = [["Fecha", "Descripción", "Categoría", "Pago", "Efectivo", "Transferencia", "Cargado por", "Monto"]];

    lista.forEach(g =>{

        const pago = g.pago || { efectivo: g.monto || 0, transferencia: 0 };

        filas.push([
            g.fechaTexto || fechaTextoDeISO(g.fecha),
            g.descripcion || "",
            CATEGORIAS_GASTO[g.categoria] || g.categoria || "General",
            g.metodoPago || "efectivo",
            Number(pago.efectivo || 0),
            Number(pago.transferencia || 0),
            (g.vendedor && g.vendedor.nombre) || "",
            Number(g.monto || 0)
        ]);

    });

    descargarArchivo("Gastos_" + fechaLocalISO(new Date()) + ".csv", generarCSV(filas), "text/csv;charset=utf-8");

    notificacion("Gastos exportados (" + lista.length + ").");

}

/* ==========================================
   MODAL GASTO
========================================== */

function prepararCargadoPorGasto(loginActual){

    // Solo el administrador puede cambiar a nombre de quién queda el gasto.
    const grupo = document.getElementById("grupoCargadoPorGasto");

    grupo.classList.toggle("oculto", !esAdmin());

    if(!esAdmin()) return;

    const select = document.getElementById("cargadoPorGasto");

    let opciones = `<option value="">— Sin asignar —</option>`
        + usuarios.map(u => `<option value="${esc(u.usuario)}">${esc(u.nombre)}</option>`).join("");

    if(loginActual && !usuarios.some(u => u.usuario === loginActual)){

        opciones += `<option value="${esc(loginActual)}">${esc(loginActual)} (eliminado)</option>`;

    }

    select.innerHTML = opciones;

    select.value = loginActual || "";

}

function abrirModalNuevoGasto(){

    gastoEditandoId = null;

    document.getElementById("tituloModalGasto").textContent = "Nuevo Gasto";

    limpiar("descripcionGasto", "montoGasto", "montoEfectivoGasto", "montoTransferenciaGasto");

    document.getElementById("categoriaGasto").value = "general";

    document.getElementById("fechaGasto").value = fechaLocalISO(new Date());

    cambiarMetodoPagoGasto("efectivo");

    prepararCargadoPorGasto(usuarioActual ? usuarioActual.usuario : "");

    abrir("modalGasto");

    setTimeout(()=> document.getElementById("descripcionGasto").focus(), 100);

}

function editarGasto(id){

    const gasto = gastos.find(g => g.id === id);

    if(!gasto) return;

    if(!puedeTocarGasto(gasto)){ avisarSinPermiso(); return; }

    gastoEditandoId = id;

    document.getElementById("tituloModalGasto").textContent = "Editar Gasto";

    document.getElementById("descripcionGasto").value = gasto.descripcion || "";
    document.getElementById("montoGasto").value = gasto.monto || "";

    const categoria = document.getElementById("categoriaGasto");

    categoria.value = gasto.categoria || "general";

    if(categoria.value !== (gasto.categoria || "general")) categoria.value = "otros";

    document.getElementById("fechaGasto").value = gasto.fecha || fechaLocalISO(new Date());

    const pago = gasto.pago || { efectivo: gasto.monto || 0, transferencia: 0 };

    document.getElementById("montoEfectivoGasto").value = pago.efectivo || "";
    document.getElementById("montoTransferenciaGasto").value = pago.transferencia || "";

    cambiarMetodoPagoGasto(gasto.metodoPago || "efectivo");

    prepararCargadoPorGasto(gasto.vendedor ? gasto.vendedor.usuario : "");

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

    const monto = numeroDe("montoGasto");

    if(monto <= 0){

        notificacion("Ingresá un monto válido.", "warning");

        return;

    }

    const categoria = document.getElementById("categoriaGasto").value;

    const fecha = document.getElementById("fechaGasto").value || fechaLocalISO(new Date());

    const fechaTexto = fechaTextoDeISO(fecha);

    const pago = armarDesglosePago(metodoPagoGasto, monto, "montoEfectivoGasto", "montoTransferenciaGasto");

    if(!pago) return;

    // A nombre de quién queda: el admin puede elegirlo; si no, quien lo carga.
    let vendedor = usuarioActual
        ? { usuario: usuarioActual.usuario, nombre: usuarioActual.nombre }
        : null;

    let adminEligio = false;

    if(esAdmin()){

        const login = document.getElementById("cargadoPorGasto").value;

        const u = usuarios.find(x => x.usuario === login);

        adminEligio = true;

        vendedor = u ? { usuario: u.usuario, nombre: u.nombre } : null;

    }

    if(gastoEditandoId){

        const gasto = gastos.find(g => g.id === gastoEditandoId);

        if(gasto){

            if(!puedeTocarGasto(gasto)){ avisarSinPermiso(); return; }

            gasto.descripcion = descripcion;
            gasto.monto = monto;
            gasto.categoria = categoria;
            gasto.fecha = fecha;
            gasto.fechaTexto = fechaTexto;
            gasto.metodoPago = metodoPagoGasto;
            gasto.pago = pago;

            // Al editar no se cambia quién lo cargó, salvo que el admin
            // lo elija (y siempre que no sea un usuario ya eliminado).
            if(adminEligio && (vendedor || !document.getElementById("cargadoPorGasto").value)){

                gasto.vendedor = vendedor;

            }

            notificacion("Gasto actualizado.");

        }

    }else{

        gastos.push({
            id: nuevoId("G"),
            descripcion,
            monto,
            categoria,
            fecha,
            fechaTexto,
            metodoPago: metodoPagoGasto,
            pago,

            // Para que cada caja quede separada por empleado, igual que
            // las ventas: este gasto queda a nombre de quien lo cargó.
            vendedor
        });

        notificacion("Gasto agregado correctamente.");

    }

    guardarDatos("gastos");

    cerrarModalGasto();

    refrescarTablaGastosConFiltrosActuales();

    gastoEditandoId = null;

}

function eliminarGasto(id){

    const gasto = gastos.find(g => g.id === id);

    if(!gasto) return;

    if(!puedeTocarGasto(gasto)){ avisarSinPermiso(); return; }

    confirmar(
        "¿Eliminar el gasto \"" + gasto.descripcion + "\" por " + dinero(gasto.monto) + "?",
        ()=>{

            gastos = gastos.filter(g => g.id !== id);

            registrarEliminacion(
                "Gasto",
                "Gasto " + gasto.descripcion
                + " · " + dinero(gasto.monto),
                gasto
            );

            guardarDatos("gastos", "eliminaciones");

            refrescarTablaGastosConFiltrosActuales();

            notificacion("Gasto eliminado.", "error");

        }
    );

}

function cerrarModalGasto(){

    cerrar("modalGasto");

}
