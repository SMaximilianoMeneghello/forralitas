/* ==========================================
   MEZCLAS (RECETAS)
   ------------------------------------------
   Una mezcla es una RECETA reutilizable
   (ej: "Mezcla de Caballo"): se cargan sus
   ingredientes una sola vez, junto con el
   producto de salida y cuántas bolsas rinde
   un lote. Después, cada vez que se prepara
   un lote, se entra al ojito y se "Registra
   producción": eso es lo que descuenta el
   stock de los ingredientes y suma el stock
   del producto de salida.
========================================== */

let filtroMezclas = "";
let filasIngredientesMezcla = 0;
let mezclaEditandoId = null;

function renderMezclas(){

    contenido().innerHTML = `

        <div class="clientesHeader">

            <div class="buscadorTabla">
                <span class="buscadorTablaIcono">🔍</span>
                <input
                    id="buscarMezclas"
                    type="text"
                    placeholder="Buscar por nombre de mezcla, producto o ingrediente..."
                    autocomplete="off">
                <button
                    id="btnLimpiarBuscarMezclas"
                    class="btnLimpiarBuscador oculto"
                    title="Limpiar búsqueda"
                    type="button">✕</button>
            </div>

            <button
                id="btnAgregarMezcla"
                class="btnAgregar">

                + Nueva mezcla

            </button>

        </div>

        <div class="card">

            <div class="tablaClientes">

                <table>

                    <thead>

                        <tr>
                            <th>Mezcla</th>
                            <th>Producto de salida</th>
                            <th>Ingredientes por lote</th>
                            <th>Producciones</th>
                            <th>Acciones</th>
                        </tr>

                    </thead>

                    <tbody id="tablaMezclasBody">

                    </tbody>

                </table>

            </div>

        </div>

    `;

    const btnAgregar = document.getElementById("btnAgregarMezcla");

    if(btnAgregar) btnAgregar.onclick = abrirModalNuevaMezcla;

    filtroMezclas = "";

    const inputBuscar = document.getElementById("buscarMezclas");
    const btnLimpiar = document.getElementById("btnLimpiarBuscarMezclas");

    inputBuscar.addEventListener("input", ()=>{

        filtroMezclas = inputBuscar.value.trim().toLowerCase();

        btnLimpiar.classList.toggle("oculto", filtroMezclas === "");

        actualizarTablaMezclas();

    });

    btnLimpiar.addEventListener("click", ()=>{

        inputBuscar.value = "";
        filtroMezclas = "";
        btnLimpiar.classList.add("oculto");

        actualizarTablaMezclas();

        inputBuscar.focus();

    });

    actualizarTablaMezclas();

}

function actualizarTablaMezclas(){

    const tbody = document.getElementById("tablaMezclasBody");

    if(!tbody) return;

    tbody.innerHTML = "";

    const ordenadas = [...mezclas].sort((a,b) =>
        (a.nombre || "").localeCompare(b.nombre || "")
    );

    const listaFiltrada = !filtroMezclas
        ? ordenadas
        : ordenadas.filter(m =>{

            const nombreSalida = ((m.productoSalida && m.productoSalida.nombre) || "").toLowerCase();

            const tieneIngrediente = (m.ingredientes || []).some(i =>
                (i.nombre || "").toLowerCase().includes(filtroMezclas)
            );

            return (m.nombre || "").toLowerCase().includes(filtroMezclas)
                || nombreSalida.includes(filtroMezclas)
                || tieneIngrediente;

        });

    if(mezclas.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="tablaVacia">
                    Todavía no hay mezclas (recetas) cargadas.
                </td>
            </tr>
        `;

        return;

    }

    if(listaFiltrada.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="tablaVacia">
                    No se encontraron mezclas para "${filtroMezclas}".
                </td>
            </tr>
        `;

        return;

    }

    listaFiltrada.forEach(m =>{

        const resumenIngredientes = (m.ingredientes || [])
            .map(i =>
                formatearStock(i.cantidad) + " "
                + (i.unidad === "kg" ? "kg" : "bolsas")
                + " de " + i.nombre
            )
            .join(", ") || "—";

        tbody.innerHTML += `
            <tr>
                <td><strong>${m.nombre || "—"}</strong> <small>(lote de ${formatearStock(m.bolsasPorLote || 10)} bolsas)</small></td>
                <td>${(m.productoSalida && m.productoSalida.nombre) || "—"}</td>
                <td>${resumenIngredientes}</td>
                <td>${(m.producciones || []).length}</td>
                <td class="accionesTabla">
                    <button
                        class="btnAccion btnVer"
                        title="Ver y producir"
                        onclick="verDetalleMezcla('${m.id}')">
                        👁️
                    </button>
                    <button
                        class="btnAccion btnEditar"
                        title="Editar receta"
                        onclick="editarMezcla('${m.id}')">
                        ✏️
                    </button>
                    <button
                        class="btnAccion btnBorrar"
                        title="Eliminar receta"
                        onclick="eliminarMezcla('${m.id}')">
                        🗑️
                    </button>
                </td>
            </tr>
        `;

    });

}

/* ==========================================
   BUSCADOR DE PRODUCTOS CON LUPA
   (reutilizable: producto de salida y cada
   ingrediente usan el mismo mecanismo)
========================================== */

function activarBuscadorProductoMezcla(contenedor){

    const input = contenedor.querySelector(".inputBuscarProductoMezcla");
    const idOculto = contenedor.querySelector(".idProductoMezclaSeleccionado");
    const lista = contenedor.querySelector(".listaSugerenciasProductoMezcla");

    function mostrarSugerencias(texto){

        const termino = texto.trim().toLowerCase();

        const coincidencias = !termino
            ? productos.slice(0, 8)
            : productos.filter(p => (p.nombre || "").toLowerCase().includes(termino)).slice(0, 8);

        if(coincidencias.length === 0){

            lista.innerHTML = `<div class="sugerenciaProductoMezclaVacia">Sin resultados</div>`;

        }else{

            lista.innerHTML = coincidencias.map(p => `
                <div class="sugerenciaProductoMezcla" data-id="${p.id}" data-nombre="${p.nombre}">
                    ${p.nombre} <small>(stock: ${formatearStock(p.stock)})</small>
                </div>
            `).join("");

        }

        lista.classList.remove("oculto");

    }

    input.addEventListener("focus", ()=> mostrarSugerencias(input.value));

    input.addEventListener("input", ()=>{

        idOculto.value = "";

        mostrarSugerencias(input.value);

    });

    lista.addEventListener("mousedown", (e)=>{

        const item = e.target.closest(".sugerenciaProductoMezcla");

        if(!item) return;

        input.value = item.dataset.nombre;
        idOculto.value = item.dataset.id;

        lista.classList.add("oculto");

    });

    input.addEventListener("blur", ()=>{

        setTimeout(()=> lista.classList.add("oculto"), 150);

    });

}

/* ==========================================
   MODAL NUEVA / EDITAR RECETA
========================================== */

function abrirModalNuevaMezcla(){

    mezclaEditandoId = null;

    document.getElementById("tituloModalMezcla").textContent = "Nueva Mezcla";

    limpiar("nombreMezcla", "bolsasPorLoteMezcla", "notasMezcla");

    document.getElementById("bolsasPorLoteMezcla").value = "10";

    const buscadorSalida = document.getElementById("buscadorSalidaMezcla");

    buscadorSalida.querySelector(".inputBuscarProductoMezcla").value = "";
    buscadorSalida.querySelector(".idProductoMezclaSeleccionado").value = "";

    document.getElementById("listaIngredientesMezcla").innerHTML = "";

    filasIngredientesMezcla = 0;

    agregarFilaIngredienteMezcla();

    abrir("modalMezcla");

    setTimeout(()=> document.getElementById("nombreMezcla").focus(), 100);

}

function editarMezcla(id){

    const mezcla = mezclas.find(m => m.id === id);

    if(!mezcla) return;

    mezclaEditandoId = id;

    document.getElementById("tituloModalMezcla").textContent = "Editar Mezcla";

    document.getElementById("nombreMezcla").value = mezcla.nombre || "";
    document.getElementById("bolsasPorLoteMezcla").value = mezcla.bolsasPorLote || 10;
    document.getElementById("notasMezcla").value = mezcla.notas || "";

    const buscadorSalida = document.getElementById("buscadorSalidaMezcla");

    buscadorSalida.querySelector(".inputBuscarProductoMezcla").value =
        (mezcla.productoSalida && mezcla.productoSalida.nombre) || "";

    buscadorSalida.querySelector(".idProductoMezclaSeleccionado").value =
        (mezcla.productoSalida && mezcla.productoSalida.id) || "";

    document.getElementById("listaIngredientesMezcla").innerHTML = "";

    filasIngredientesMezcla = 0;

    (mezcla.ingredientes || []).forEach(ing => agregarFilaIngredienteMezcla(ing));

    if((mezcla.ingredientes || []).length === 0) agregarFilaIngredienteMezcla();

    abrir("modalMezcla");

}

function cerrarModalMezcla(){

    cerrar("modalMezcla");

}

function agregarFilaIngredienteMezcla(ingredienteExistente){

    filasIngredientesMezcla++;

    const idFila = "filaMezcla" + filasIngredientesMezcla;

    const div = document.createElement("div");

    div.className = "filaIngredienteMezcla";
    div.id = idFila;

    div.innerHTML = `
        <div class="buscadorProductoMezcla">
            <span class="buscadorProductoMezclaIcono">🔍</span>
            <input type="text" class="inputBuscarProductoMezcla" placeholder="Buscar ingrediente..." autocomplete="off">
            <input type="hidden" class="idProductoMezclaSeleccionado">
            <div class="listaSugerenciasProductoMezcla oculto"></div>
        </div>
        <input
            class="inputCantidadIngrediente"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="Cantidad"
            oninput="limpiarNumero(this)">
        <select class="selectUnidadIngrediente">
            <option value="bolsa">Bolsas</option>
            <option value="kg">Kg</option>
        </select>
        <button
            type="button"
            class="btnQuitarFilaMezcla"
            title="Quitar ingrediente"
            onclick="quitarFilaIngredienteMezcla('${idFila}')">✕</button>
    `;

    document.getElementById("listaIngredientesMezcla").appendChild(div);

    activarBuscadorProductoMezcla(div.querySelector(".buscadorProductoMezcla"));

    if(ingredienteExistente){

        div.querySelector(".inputBuscarProductoMezcla").value = ingredienteExistente.nombre || "";
        div.querySelector(".idProductoMezclaSeleccionado").value = ingredienteExistente.idProducto || "";
        div.querySelector(".inputCantidadIngrediente").value = ingredienteExistente.cantidad || "";
        div.querySelector(".selectUnidadIngrediente").value = ingredienteExistente.unidad || "bolsa";

    }

}

function quitarFilaIngredienteMezcla(idFila){

    const total = document.querySelectorAll(".filaIngredienteMezcla").length;

    if(total <= 1){

        notificacion("Tiene que quedar al menos un ingrediente cargado.", "warning");

        return;

    }

    const fila = document.getElementById(idFila);

    if(fila) fila.remove();

}

function guardarMezcla(){

    const nombre = document.getElementById("nombreMezcla").value.trim();

    if(!nombre){

        notificacion("Ponele un nombre a la mezcla (ej: Mezcla de Caballo).", "warning");

        return;

    }

    const bolsasPorLote = Number(document.getElementById("bolsasPorLoteMezcla").value) || 10;

    const buscadorSalida = document.getElementById("buscadorSalidaMezcla");

    const idProductoSalida = buscadorSalida.querySelector(".idProductoMezclaSeleccionado").value;

    if(!idProductoSalida){

        notificacion("Elegí el producto de salida buscándolo en la lista.", "warning");

        return;

    }

    const productoSalida = productos.find(p => p.id === idProductoSalida);

    if(!productoSalida){

        notificacion("Ese producto de salida no existe. Elegilo de nuevo de la lista.", "error");

        return;

    }

    const filas = document.querySelectorAll(".filaIngredienteMezcla");

    const ingredientes = [];

    let filaInvalida = false;

    filas.forEach(fila =>{

        const idProducto = fila.querySelector(".idProductoMezclaSeleccionado").value;
        const nombreEscrito = fila.querySelector(".inputBuscarProductoMezcla").value.trim();
        const cantidad = Number(fila.querySelector(".inputCantidadIngrediente").value);
        const unidad = fila.querySelector(".selectUnidadIngrediente").value;

        if(!nombreEscrito && !cantidad) return; // fila vacía, se ignora

        if(!idProducto){

            filaInvalida = true;

            return;

        }

        if(!cantidad || cantidad <= 0){

            filaInvalida = true;

            return;

        }

        const producto = productos.find(p => p.id === idProducto);

        if(!producto) return;

        ingredientes.push({

            idProducto: producto.id,
            nombre: producto.nombre,
            cantidad,
            unidad

        });

    });

    if(filaInvalida){

        notificacion("Revisá los ingredientes: elegí el producto de la lista de sugerencias y cargá una cantidad válida.", "warning");

        return;

    }

    if(ingredientes.length === 0){

        notificacion("Cargá al menos un ingrediente con cantidad válida.", "warning");

        return;

    }

    const notas = document.getElementById("notasMezcla").value.trim();

    if(mezclaEditandoId){

        const mezcla = mezclas.find(m => m.id === mezclaEditandoId);

        if(mezcla){

            mezcla.nombre = nombre;
            mezcla.bolsasPorLote = bolsasPorLote;
            mezcla.productoSalida = { id: productoSalida.id, nombre: productoSalida.nombre };
            mezcla.ingredientes = ingredientes;
            mezcla.notas = notas;

            notificacion("Receta actualizada.");

        }

    }else{

        mezclas.unshift({

            id: "M" + Date.now(),
            nombre,
            bolsasPorLote,
            productoSalida: { id: productoSalida.id, nombre: productoSalida.nombre },
            ingredientes,
            notas,
            producciones: []

        });

        notificacion("Receta guardada. Ahora entrá al 👁️ para registrar producción cuando armes un lote.");

    }

    guardarDatos();

    cerrarModalMezcla();

    actualizarTablaMezclas();

    mezclaEditandoId = null;

}

function eliminarMezcla(id){

    const mezcla = mezclas.find(m => m.id === id);

    if(!mezcla) return;

    confirmar(

        "¿Eliminar la receta \"" + (mezcla.nombre || "") + "\"? "
        + "(Esto solo borra la receta y su historial de producción; NO revierte el stock ya descontado o sumado).",

        ()=>{

            mezclas = mezclas.filter(m => m.id !== id);

            registrarEliminacion(

                "Mezcla",

                "Receta · " + (mezcla.nombre || "")
                + " · salida: " + ((mezcla.productoSalida && mezcla.productoSalida.nombre) || ""),

                mezcla

            );

            guardarDatos();

            actualizarTablaMezclas();

            notificacion("Receta eliminada.", "error");

        }

    );

}
