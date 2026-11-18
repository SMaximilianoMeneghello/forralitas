/* ==========================================
   ANOTACIONES
   ------------------------------------------
   Carpetas tipo "bloc de notas" (por ejemplo
   "Deudas de Gerardo") donde se puede escribir
   texto libre. No afectan stock, saldos ni
   ningún otro cálculo de la app.
========================================== */

let filtroAnotaciones = "";
let carpetaNotaEditandoId = null;
let carpetaNotaDetalleActualId = null;

function renderAnotaciones(){

    contenido().innerHTML = `

        <div class="clientesHeader">

            <div class="buscadorTabla">
                <span class="buscadorTablaIcono">🔍</span>
                <input
                    id="buscarAnotaciones"
                    type="text"
                    placeholder="Buscar carpeta por título..."
                    autocomplete="off">
                <button
                    id="btnLimpiarBuscarAnotaciones"
                    class="btnLimpiarBuscador oculto"
                    title="Limpiar búsqueda"
                    type="button">✕</button>
            </div>

            <button
                id="btnAgregarCarpetaNota"
                class="btnAgregar">

                + Nueva carpeta

            </button>

        </div>

        <div class="card">

            <div class="tablaClientes">

                <table>

                    <thead>

                        <tr>
                            <th>Carpeta</th>
                            <th>Última actualización</th>
                            <th>Acciones</th>
                        </tr>

                    </thead>

                    <tbody id="tablaAnotacionesBody">

                    </tbody>

                </table>

            </div>

        </div>

    `;

    const btnAgregar = document.getElementById("btnAgregarCarpetaNota");

    if(btnAgregar) btnAgregar.onclick = abrirModalNuevaCarpetaNota;

    filtroAnotaciones = "";

    const inputBuscar = document.getElementById("buscarAnotaciones");
    const btnLimpiar = document.getElementById("btnLimpiarBuscarAnotaciones");

    inputBuscar.addEventListener("input", ()=>{

        filtroAnotaciones = inputBuscar.value.trim().toLowerCase();

        btnLimpiar.classList.toggle("oculto", filtroAnotaciones === "");

        actualizarTablaAnotaciones();

    });

    btnLimpiar.addEventListener("click", ()=>{

        inputBuscar.value = "";
        filtroAnotaciones = "";
        btnLimpiar.classList.add("oculto");

        actualizarTablaAnotaciones();

        inputBuscar.focus();

    });

    actualizarTablaAnotaciones();

}

function actualizarTablaAnotaciones(){

    const tbody = document.getElementById("tablaAnotacionesBody");

    if(!tbody) return;

    tbody.innerHTML = "";

    const ordenadas = [...carpetasNotas].sort((a,b) =>
        (b.actualizadoISO || b.fecha || "").localeCompare(a.actualizadoISO || a.fecha || "")
    );

    const listaFiltrada = !filtroAnotaciones
        ? ordenadas
        : ordenadas.filter(c => (c.titulo || "").toLowerCase().includes(filtroAnotaciones));

    if(carpetasNotas.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="tablaVacia">
                    Todavía no creaste ninguna carpeta de anotaciones.
                </td>
            </tr>
        `;

        return;

    }

    if(listaFiltrada.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="tablaVacia">
                    No se encontraron carpetas para "${filtroAnotaciones}".
                </td>
            </tr>
        `;

        return;

    }

    listaFiltrada.forEach(c =>{

        tbody.innerHTML += `
            <tr>
                <td><strong>📁 ${c.titulo}</strong></td>
                <td>${c.actualizadoTexto || c.fechaTexto || "—"}</td>
                <td class="accionesTabla">
                    <button
                        class="btnAccion btnVer"
                        title="Abrir anotaciones"
                        onclick="verCarpetaNota('${c.id}')">
                        👁️
                    </button>
                    <button
                        class="btnAccion btnEditar"
                        title="Renombrar carpeta"
                        onclick="editarCarpetaNota('${c.id}')">
                        ✏️
                    </button>
                    <button
                        class="btnAccion btnBorrar"
                        title="Eliminar carpeta"
                        onclick="eliminarCarpetaNota('${c.id}')">
                        🗑️
                    </button>
                </td>
            </tr>
        `;

    });

}

/* ==========================================
   MODAL NUEVA CARPETA / RENOMBRAR
========================================== */

function abrirModalNuevaCarpetaNota(){

    carpetaNotaEditandoId = null;

    document.getElementById("tituloModalCarpetaNota").textContent = "Nueva carpeta";

    document.getElementById("tituloCarpetaNota").value = "";

    abrir("modalCarpetaNota");

    setTimeout(()=> document.getElementById("tituloCarpetaNota").focus(), 100);

}

function editarCarpetaNota(id){

    const carpeta = carpetasNotas.find(c => c.id === id);

    if(!carpeta) return;

    carpetaNotaEditandoId = id;

    document.getElementById("tituloModalCarpetaNota").textContent = "Renombrar carpeta";

    document.getElementById("tituloCarpetaNota").value = carpeta.titulo || "";

    abrir("modalCarpetaNota");

}

function cerrarModalCarpetaNota(){

    cerrar("modalCarpetaNota");

}

function guardarCarpetaNota(){

    const titulo = document.getElementById("tituloCarpetaNota").value.trim();

    if(!titulo){

        notificacion("Ponele un título a la carpeta.", "warning");

        return;

    }

    if(carpetaNotaEditandoId){

        const carpeta = carpetasNotas.find(c => c.id === carpetaNotaEditandoId);

        if(carpeta){

            carpeta.titulo = titulo;

            notificacion("Carpeta renombrada.");

        }

    }else{

        const ahora = new Date();

        carpetasNotas.unshift({

            id: "N" + Date.now(),

            titulo,

            contenido: "",

            fecha: ahora.toISOString(),

            fechaTexto: fechaHoraTexto(ahora),

            actualizadoISO: ahora.toISOString(),

            actualizadoTexto: fechaHoraTexto(ahora)

        });

        notificacion("Carpeta creada.");

    }

    guardarDatos("carpetasNotas");

    cerrarModalCarpetaNota();

    actualizarTablaAnotaciones();

    carpetaNotaEditandoId = null;

}

function eliminarCarpetaNota(id){

    const carpeta = carpetasNotas.find(c => c.id === id);

    if(!carpeta) return;

    confirmar(

        "¿Eliminar la carpeta \"" + carpeta.titulo + "\" junto con todo lo escrito adentro?",

        ()=>{

            carpetasNotas = carpetasNotas.filter(c => c.id !== id);

            registrarEliminacion(

                "Anotación",

                "Carpeta de anotaciones · " + carpeta.titulo,

                carpeta

            );

            guardarDatos("carpetasNotas");

            actualizarTablaAnotaciones();

            notificacion("Carpeta eliminada.", "error");

        }

    );

}

/* ==========================================
   VER / ESCRIBIR ANOTACIONES (BLOC DE NOTAS)
========================================== */

function verCarpetaNota(id){

    carpetaNotaDetalleActualId = id;

    abrirPantallaAnotacionDetalle();

    renderAnotacionDetalle(id);

}

function renderAnotacionDetalle(id){

    const carpeta = carpetasNotas.find(c => c.id === id);

    if(!carpeta) return;

    document.getElementById("tituloAnotacionDetalle").textContent = "📁 " + carpeta.titulo;

    document.getElementById("contenidoAnotacionDetalle").innerHTML = `

        <div class="card">

            <textarea
                id="textoAnotacion"
                class="blocDeNotas"
                placeholder="Escribí acá todo lo que quieras anotar sobre esta carpeta...">${carpeta.contenido || ""}</textarea>

            <div class="accionesModal" style="margin-top:14px;justify-content:space-between">

                <span class="notaGuardadoAnotacion" id="notaGuardadoAnotacion">
                    ${carpeta.actualizadoTexto ? "Última actualización: " + carpeta.actualizadoTexto : ""}
                </span>

                <button class="btnGuardar" onclick="guardarTextoAnotacion('${id}')">
                    Guardar
                </button>

            </div>

        </div>

    `;

}

function guardarTextoAnotacion(id){

    const carpeta = carpetasNotas.find(c => c.id === id);

    if(!carpeta) return;

    carpeta.contenido = document.getElementById("textoAnotacion").value;

    const ahora = new Date();

    carpeta.actualizadoISO = ahora.toISOString();
    carpeta.actualizadoTexto = fechaHoraTexto(ahora);

    guardarDatos("carpetasNotas");

    const nota = document.getElementById("notaGuardadoAnotacion");

    if(nota) nota.textContent = "Guardado · " + carpeta.actualizadoTexto;

    notificacion("Anotación guardada.");

}
