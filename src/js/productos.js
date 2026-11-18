/* ==========================================
   PRODUCTOS
========================================== */

let productoEditandoId = null;
let filtroProductos = "";

function renderProductos(){

    asegurarEstilosIngresosProductos();

    contenido().innerHTML = `

        <div class="productosHeader productosHeaderConIngresos">
            <button
                id="btnIngresosProductos"
                class="btnIngresosProductos"
                type="button">
                📥 Ingresos de productos
            </button>

            <div class="buscadorTabla buscadorProductosPrincipal">
                <span class="buscadorTablaIcono">🔍</span>
                <input
                    id="buscarProductos"
                    type="text"
                    placeholder="Buscar producto por nombre o categoría..."
                    autocomplete="off">
                <button
                    id="btnLimpiarBuscarProductos"
                    class="btnLimpiarBuscador oculto"
                    title="Limpiar búsqueda"
                    type="button">✕</button>
            </div>
            <button
                id="btnAgregarProducto"
                class="btnAgregar">

                + Agregar producto

            </button>

        </div>

        <div class="card">

            <div class="tablaProductos">

                <table>

                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Categoría</th>
                            <th>Peso/Bolsa</th>
                            <th>Precio Bolsa</th>
                            <th>Precio Kg</th>
                            <th>Stock</th>
                            <th>Acciones</th>
                        </tr>

                    </thead>

                    <tbody id="tablaProductosBody">

                    </tbody>
                </table>

            </div>

        </div>

    `;

    const btnAgregar = document.getElementById("btnAgregarProducto");
    const btnIngresos = document.getElementById("btnIngresosProductos");

    if(btnAgregar) btnAgregar.onclick = abrirModalNuevoProducto;
    if(btnIngresos) btnIngresos.onclick = renderIngresosProductos;

    filtroProductos = "";

    const inputBuscar = document.getElementById("buscarProductos");
    const btnLimpiar = document.getElementById("btnLimpiarBuscarProductos");

    inputBuscar.addEventListener("input", ()=>{

        filtroProductos = inputBuscar.value.trim().toLowerCase();
        btnLimpiar.classList.toggle("oculto", filtroProductos === "");

        actualizarTablaProductos();

    });

    btnLimpiar.addEventListener("click", ()=>{

        inputBuscar.value = "";
        filtroProductos = "";
        btnLimpiar.classList.add("oculto");

        actualizarTablaProductos();

        inputBuscar.focus();

    });

    actualizarTablaProductos();

}

function actualizarTablaProductos(){

    const tbody = document.getElementById("tablaProductosBody");
    if(!tbody) return;

    tbody.innerHTML = "";

    const listaFiltrada = !filtroProductos
        ? productos
        : productos.filter(p =>
            (p.nombre || "").toLowerCase().includes(filtroProductos)
            || (p.categoria || "").toLowerCase().includes(filtroProductos)
        );

    if(productos.length === 0){
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="tablaVacia">
                    Todavía no hay productos cargados.
                </td>
            </tr>
        `;

        return;

    }

    if(listaFiltrada.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="tablaVacia">
                    No se encontraron productos para "${filtroProductos}".
                </td>
            </tr>
        `;

        return;

    }

    listaFiltrada.forEach(producto =>{

        const stockBajo = producto.stock <= (producto.stockMinimo || 0);

        const stockHtml = stockBajo
            ? `<span class="stockBajo">${formatearStock(producto.stock)}</span>`
            : formatearStock(producto.stock);

        tbody.innerHTML += `
            <tr>
                <td><strong>${producto.nombre}</strong></td>
                <td>${producto.categoria || "—"}</td>
                <td>${producto.pesoBolsa || 0} kg</td>
                <td>${dinero(producto.precioBolsa)}</td>
                <td>${dinero(producto.precioKg)}</td>
                <td>${stockHtml}</td>
                <td class="accionesTabla">
                    <button
                        class="btnAccion btnEditar"
                        title="Editar"
                        onclick="editarProducto('${producto.id}')">
                        ✏️
                    </button>
                    <button
                        class="btnAccion btnBorrar"
                        title="Eliminar"
                        onclick="eliminarProducto('${producto.id}')">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });

}

function abrirModalNuevoProducto(){

    productoEditandoId = null;

    document.getElementById("tituloModalProducto").textContent = "Nuevo Producto";

    limpiar(
        "nombreProducto",
        "categoriaProducto",
        "pesoBolsa",
        "precioBolsaProducto",
        "precioKgProducto",
        "stockProducto",
        "stockMinimoProducto"
    );

    abrir("modalProducto");

    setTimeout(()=> document.getElementById("nombreProducto").focus(), 100);

}
function editarProducto(id){

    const producto = productos.find(p => p.id === id);

    if(!producto) return;

    productoEditandoId = id;

    document.getElementById("tituloModalProducto").textContent = "Editar Producto";

    document.getElementById("nombreProducto").value = producto.nombre || "";
    document.getElementById("categoriaProducto").value = producto.categoria || "";
    document.getElementById("pesoBolsa").value = producto.pesoBolsa || "";
    document.getElementById("precioBolsaProducto").value = producto.precioBolsa || "";
    document.getElementById("precioKgProducto").value = producto.precioKg || "";
    document.getElementById("stockProducto").value = producto.stock || "";
    document.getElementById("stockMinimoProducto").value = producto.stockMinimo || "";

    abrir("modalProducto");

}

function guardarProducto(){

    const nombre = document.getElementById("nombreProducto").value.trim();

    if(!nombre){

        notificacion("El nombre del producto es obligatorio.", "warning");

        return;

    }

    const categoria = document.getElementById("categoriaProducto").value.trim();

    const pesoBolsa = Number(document.getElementById("pesoBolsa").value) || 0;

    const precioBolsa = Number(document.getElementById("precioBolsaProducto").value) || 0;

    const precioKg = Number(document.getElementById("precioKgProducto").value) || 0;

    const stock = Number(document.getElementById("stockProducto").value) || 0;

    const stockMinimo = Number(document.getElementById("stockMinimoProducto").value) || 0;

    if(productoEditandoId){

        const producto = productos.find(p => p.id === productoEditandoId);

        if(producto){
            producto.nombre = nombre;
            producto.categoria = categoria;
            producto.pesoBolsa = pesoBolsa;
            producto.precioBolsa = precioBolsa;
            producto.precioKg = precioKg;
            producto.stock = stock;
            producto.stockMinimo = stockMinimo;

            notificacion("Producto actualizado.");

        }

    }else{

        productos.push({

            id: "P" + Date.now(),
            nombre,
            categoria,
            pesoBolsa,
            precioBolsa,
            precioKg,
            stock,
            stockMinimo

        });

        notificacion("Producto agregado correctamente.");

    }

    productos = ordenarProductosPorNombre(productos);

    guardarDatos("productos");

    cerrarModalProducto();

    actualizarTablaProductos();

    productoEditandoId = null;

}

function eliminarProducto(id){

    const producto = productos.find(p => p.id === id);

    if(!producto) return;

    confirmar(
        "¿Eliminar el producto " + producto.nombre + "?",

        ()=>{

            productos = productos.filter(p => p.id !== id);

            registrarEliminacion(

                "Producto",

                "Producto " + producto.nombre
                + " · Stock: " + formatearStock(producto.stock),

                producto

            );

            guardarDatos("productos");

            actualizarTablaProductos();

            notificacion("Producto eliminado.", "error");

        }

    );

}
/* ==========================================
   PRECIO BOLSA / PRECIO KG
   Son dos campos totalmente independientes:
   el precio por bolsa NO recalcula el precio
   por kilo, ni viceversa. Cada uno se carga
   a mano con el valor que decida el usuario.
========================================== */


/* ==========================================================
   INGRESOS DE PRODUCTOS
   ----------------------------------------------------------
   - Busca un producto ya existente.
   - Suma bolsas al stock.
   - Guarda un historial de cada ingreso.
   - Sincroniza el historial con Firebase por separado.
========================================================== */

let historialIngresosProductos = [];
let productoIngresoSeleccionadoId = null;
let unsubscribeIngresosProductos = null;

function asegurarEstilosIngresosProductos(){

    if(document.getElementById("estilosIngresosProductos")) return;

    const style = document.createElement("style");
    style.id = "estilosIngresosProductos";
    style.textContent = `
        .productosHeaderConIngresos{
            display:grid;
            grid-template-columns:auto minmax(280px, 1fr) auto;
            align-items:center;
            gap:12px;
        }
        .buscadorProductosPrincipal{min-width:0;}
        .btnIngresosProductos{
            border:none;
            border-radius:10px;
            padding:12px 16px;
            font-weight:800;
            cursor:pointer;
            background:#1565c0;
            color:#fff;
            white-space:nowrap;
        }
        .btnIngresosProductos:hover{filter:brightness(.95);}
        .ingresosProductosBarra{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            margin-bottom:18px;
            flex-wrap:wrap;
        }
        .ingresosProductosFormulario{
            display:grid;
            grid-template-columns:minmax(280px, 1fr) minmax(180px, 260px) auto;
            gap:14px;
            align-items:end;
        }
        .ingresoBuscadorWrap{position:relative;}
        .ingresoBuscadorWrap input,
        .ingresosProductosFormulario input{
            width:100%;
            box-sizing:border-box;
        }
        .sugerenciasIngresoProductos{
            position:absolute;
            z-index:60;
            top:100%;
            left:0;
            right:0;
            background:#fff;
            border:1px solid #ddd;
            border-radius:10px;
            box-shadow:0 12px 28px rgba(0,0,0,.13);
            max-height:280px;
            overflow:auto;
            margin-top:4px;
        }
        .sugerenciaIngresoProducto{
            display:flex;
            justify-content:space-between;
            gap:12px;
            padding:11px 13px;
            cursor:pointer;
            border-bottom:1px solid #eee;
        }
        .sugerenciaIngresoProducto:last-child{border-bottom:none;}
        .sugerenciaIngresoProducto:hover{background:#f5f8fb;}
        .productoIngresoSeleccionado{
            margin-top:14px;
            padding:12px 14px;
            border-radius:10px;
            background:#f3f8f4;
            border:1px solid #d7ead9;
            display:flex;
            justify-content:space-between;
            gap:14px;
            align-items:center;
            flex-wrap:wrap;
        }
        .btnRegistrarIngresoProducto{
            border:none;
            border-radius:10px;
            padding:12px 17px;
            font-weight:800;
            cursor:pointer;
            background:#2e7d32;
            color:#fff;
            min-height:44px;
        }
        .btnRegistrarIngresoProducto:disabled{
            opacity:.55;
            cursor:not-allowed;
        }
        .historialIngresosTabla{overflow:auto;}
        .historialIngresosTabla table{width:100%;border-collapse:collapse;}
        .historialIngresosTabla th,
        .historialIngresosTabla td{padding:11px 10px;border-bottom:1px solid #eee;text-align:left;}
        .historialIngresosCantidad{font-weight:900;color:#2e7d32;}
        .historialIngresosFecha{white-space:nowrap;}
        @media (max-width:900px){
            .productosHeaderConIngresos{grid-template-columns:1fr;}
            .btnIngresosProductos,.btnAgregar{width:100%;}
            .ingresosProductosFormulario{grid-template-columns:1fr;}
        }
    `;

    document.head.appendChild(style);

}

function renderIngresosProductos(){

    asegurarEstilosIngresosProductos();
    productoIngresoSeleccionadoId = null;
    paginaActual = "IngresosProductos";

    titulo("Ingresos de productos");

    contenido().innerHTML = `
        <div class="ingresosProductosBarra">
            <button class="btnVolver" id="btnVolverProductosDesdeIngresos">← Volver a Productos</button>
            <strong>Registrar mercadería que ingresó al local</strong>
        </div>

        <div class="card" style="margin-bottom:20px">
            <div class="ingresosProductosFormulario">
                <div class="grupoInput ingresoBuscadorWrap">
                    <label>Producto</label>
                    <input
                        id="buscarProductoIngreso"
                        type="text"
                        placeholder="Buscar producto cargado..."
                        autocomplete="off">
                    <div id="sugerenciasIngresoProductos" class="sugerenciasIngresoProductos oculto"></div>
                </div>

                <div class="grupoInput">
                    <label>Cantidad de bolsas que ingresaron</label>
                    <input
                        id="cantidadIngresoProducto"
                        type="text"
                        inputmode="decimal"
                        autocomplete="off"
                        placeholder="Ej: 20"
                        oninput="limpiarNumero(this); actualizarPreviaDescuentoIngreso();">
                </div>

                <button
                    id="btnRegistrarIngresoProducto"
                    class="btnRegistrarIngresoProducto"
                    type="button"
                    disabled>
                    + Sumar al stock
                </button>
            </div>

            <div id="productoIngresoSeleccionadoUI"></div>
            <div id="previaDescuentoIngresoUI"></div>
        </div>

        <div class="card">
            <h2 style="margin-top:0">📋 Historial de ingresos de mercadería</h2>
            <p style="margin-top:4px;color:#666">Se guarda la fecha, el producto, la cantidad de bolsas y cómo quedó el stock.</p>
            <div id="historialIngresosProductosUI"></div>
        </div>
    `;

    const btnVolver = document.getElementById("btnVolverProductosDesdeIngresos");
    const buscar = document.getElementById("buscarProductoIngreso");
    const sugerencias = document.getElementById("sugerenciasIngresoProductos");
    const cantidad = document.getElementById("cantidadIngresoProducto");
    const btnRegistrar = document.getElementById("btnRegistrarIngresoProducto");

    btnVolver.onclick = ()=>{
        paginaActual = "Productos";
        titulo("Productos");
        renderProductos();
    };

    buscar.addEventListener("input", ()=> mostrarSugerenciasIngresoProducto(buscar.value));

    buscar.addEventListener("keydown", (e)=>{
        if(e.key === "Escape"){
            sugerencias.classList.add("oculto");
            return;
        }

        if(e.key !== "Enter") return;
        e.preventDefault();

        const resultados = obtenerProductosParaIngreso(buscar.value);
        if(resultados.length){
            seleccionarProductoIngreso(resultados[0].id);
        }
    });

    cantidad.addEventListener("keydown", (e)=>{
        if(e.key !== "Enter") return;
        e.preventDefault();
        registrarIngresoProducto();
    });

    btnRegistrar.onclick = registrarIngresoProducto;

    renderHistorialIngresosProductos();

    setTimeout(()=> buscar.focus(), 80);

}

function obtenerProductosParaIngreso(texto){

    const filtro = normalizarTextoIngresos(texto);

    const lista = [...(productos || [])]
        .sort((a,b)=> (a.nombre || "").localeCompare(b.nombre || ""));

    if(!filtro) return lista.slice(0, 20);

    return lista.filter(p =>
        normalizarTextoIngresos(p.nombre).includes(filtro)
        || normalizarTextoIngresos(p.categoria).includes(filtro)
        || normalizarTextoIngresos(p.id).includes(filtro)
    ).slice(0, 20);

}

function normalizarTextoIngresos(texto){

    return (texto || "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

}

function mostrarSugerenciasIngresoProducto(texto){

    const cont = document.getElementById("sugerenciasIngresoProductos");
    if(!cont) return;

    productoIngresoSeleccionadoId = null;
    actualizarProductoIngresoSeleccionadoUI();

    const lista = obtenerProductosParaIngreso(texto);

    if(!lista.length){
        cont.innerHTML = `<div class="sugerenciaIngresoProducto"><span>No se encontraron productos.</span></div>`;
        cont.classList.remove("oculto");
        return;
    }

    cont.innerHTML = lista.map(p => `
        <div class="sugerenciaIngresoProducto" onclick="seleccionarProductoIngreso('${p.id}')">
            <span>
                <strong>${p.nombre}</strong><br>
                <small>${p.categoria || "Sin categoría"}</small>
            </span>
            <span><strong>Stock: ${formatearStock(Number(p.stock || 0))}</strong></span>
        </div>
    `).join("");

    cont.classList.remove("oculto");

}

function seleccionarProductoIngreso(id){

    const producto = (productos || []).find(p => p.id === id);
    if(!producto) return;

    productoIngresoSeleccionadoId = id;

    const buscar = document.getElementById("buscarProductoIngreso");
    const sugerencias = document.getElementById("sugerenciasIngresoProductos");
    const cantidad = document.getElementById("cantidadIngresoProducto");

    if(buscar) buscar.value = producto.nombre;
    if(sugerencias) sugerencias.classList.add("oculto");

    actualizarProductoIngresoSeleccionadoUI();

    if(cantidad){
        cantidad.focus();
        cantidad.select();
    }

}

/* ==========================================
   DESCUENTO AUTOMÁTICO DE INSUMOS AL INGRESAR
   ------------------------------------------
   Si el producto que está ingresando tiene una
   receta cargada en "Mezclas" (ej: Maíz Quebrado
   se arma quebrando Maíz Entero, o Mezcla de
   Caballo se arma con sus ingredientes), sumar
   stock acá también descuenta esos insumos en la
   misma proporción que usa "Registrar producción".
========================================== */

function obtenerRecetaPorProductoSalida(idProducto){

    if(!idProducto) return null;

    return (mezclas || []).find(m =>
        m.productoSalida && m.productoSalida.id === idProducto
    ) || null;

}

function actualizarPreviaDescuentoIngreso(){

    const cont = document.getElementById("previaDescuentoIngresoUI");
    if(!cont) return;

    const producto = (productos || []).find(p => p.id === productoIngresoSeleccionadoId);
    const inputCantidad = document.getElementById("cantidadIngresoProducto");
    const cantidad = Number(inputCantidad ? inputCantidad.value : 0);

    if(!producto){
        cont.innerHTML = "";
        return;
    }

    const receta = obtenerRecetaPorProductoSalida(producto.id);

    if(!receta){
        cont.innerHTML = "";
        return;
    }

    if(!cantidad || cantidad <= 0){
        cont.innerHTML = `
            <div class="productoIngresoSeleccionado">
                <small>⚙️ Este producto tiene una receta en Mezclas: se va a descontar automáticamente de sus insumos.</small>
            </div>
        `;
        return;
    }

    const multiplicador = cantidad / Number(receta.bolsasPorLote || 10);

    cont.innerHTML = `
        <div class="productoIngresoSeleccionado">
            <div style="width:100%">
                <small>⚙️ Se va a descontar automáticamente (receta "${receta.nombre}"):</small><br>
                ${receta.ingredientes.map(i =>{

                    const aDescontar = i.cantidad * multiplicador;
                    const insumo = productos.find(p => p.id === i.idProducto);

                    const bolsasADescontar = i.unidad === "kg"
                        ? (insumo && Number(insumo.pesoBolsa) > 0 ? aDescontar / Number(insumo.pesoBolsa) : 0)
                        : aDescontar;

                    const sinStock = insumo && bolsasADescontar > Number(insumo.stock || 0);

                    return `<span style="display:inline-block;margin-right:14px">
                        ${formatearStock(aDescontar)} ${i.unidad === "kg" ? "kg" : "bolsas"} de ${i.nombre}
                        ${sinStock ? " ⚠ sin stock suficiente" : ""}
                    </span>`;

                }).join("")}
            </div>
        </div>
    `;

}

function actualizarProductoIngresoSeleccionadoUI(){

    const cont = document.getElementById("productoIngresoSeleccionadoUI");
    const btn = document.getElementById("btnRegistrarIngresoProducto");
    if(!cont) return;

    const producto = (productos || []).find(p => p.id === productoIngresoSeleccionadoId);

    if(!producto){
        cont.innerHTML = "";
        if(btn) btn.disabled = true;
        return;
    }

    cont.innerHTML = `
        <div class="productoIngresoSeleccionado">
            <div>
                <small>Producto seleccionado</small><br>
                <strong>${producto.nombre}</strong>
            </div>
            <div>
                Stock actual: <strong>${formatearStock(Number(producto.stock || 0))} bolsas</strong>
            </div>
        </div>
    `;

    if(btn) btn.disabled = false;

    actualizarPreviaDescuentoIngreso();

}

function registrarIngresoProducto(){

    const producto = (productos || []).find(p => p.id === productoIngresoSeleccionadoId);
    const inputCantidad = document.getElementById("cantidadIngresoProducto");

    if(!producto){
        notificacion("Primero seleccioná un producto.", "warning");
        return;
    }

    const cantidad = Number(inputCantidad ? inputCantidad.value : 0);

    if(!Number.isFinite(cantidad) || cantidad <= 0){
        notificacion("Ingresá una cantidad de bolsas mayor a 0.", "warning");
        if(inputCantidad) inputCantidad.focus();
        return;
    }

    const stockAnterior = Number(producto.stock || 0);
    const ahora = new Date();

    // Si el producto tiene una receta cargada en Mezclas (ej: Maíz Quebrado
    // se descuenta de Maíz Entero, o Mezcla de Caballo de sus ingredientes),
    // se descuentan los insumos en la misma proporción que "Registrar producción".
    const receta = obtenerRecetaPorProductoSalida(producto.id);

    let ingredientesUsadosTexto = "";

    if(receta){

        const multiplicador = cantidad / Number(receta.bolsasPorLote || 10);

        const detalle = [];

        for(const ing of receta.ingredientes){

            const insumo = productos.find(p => p.id === ing.idProducto);

            if(!insumo){
                notificacion("El insumo \"" + ing.nombre + "\" de la receta \"" + receta.nombre + "\" ya no existe en Productos.", "error");
                return;
            }

            const cantidadNecesaria = ing.cantidad * multiplicador;

            const bolsasADescontar = ing.unidad === "kg"
                ? (Number(insumo.pesoBolsa) > 0 ? cantidadNecesaria / Number(insumo.pesoBolsa) : 0)
                : cantidadNecesaria;

            if(bolsasADescontar > Number(insumo.stock || 0)){
                notificacion(
                    "No hay stock suficiente de " + insumo.nombre
                    + " para este ingreso. Disponible: " + formatearStock(insumo.stock) + " bolsas.",
                    "error"
                );
                return;
            }

            detalle.push({ insumo, cantidadNecesaria, unidad: ing.unidad, bolsasADescontar, nombre: ing.nombre });

        }

        detalle.forEach(det =>{
            det.insumo.stock = Number(det.insumo.stock || 0) - det.bolsasADescontar;
        });

        ingredientesUsadosTexto = detalle
            .map(det => formatearStock(det.cantidadNecesaria) + " " + (det.unidad === "kg" ? "kg" : "bolsas") + " de " + det.nombre)
            .join(", ");

        if(!receta.producciones) receta.producciones = [];

        receta.producciones.unshift({
            id: "PM" + Date.now(),
            fecha: ahora.toISOString(),
            fechaTexto: fechaHoraTexto(ahora),
            cantidad,
            ingredientesUsados: ingredientesUsadosTexto,
            usuario: (typeof usuarioActual !== "undefined" && usuarioActual) ? usuarioActual.nombre : null
        });

    }

    const stockNuevo = stockAnterior + cantidad;

    producto.stock = stockNuevo;

    historialIngresosProductos.push({
        id: "ING" + Date.now(),
        productoId: producto.id,
        productoNombre: producto.nombre,
        cantidad,
        stockAnterior,
        stockNuevo,
        ingredientesDescontados: ingredientesUsadosTexto || null,
        fecha: ahora.toISOString(),
        usuario: (typeof usuarioActual !== "undefined" && usuarioActual)
            ? {
                id: usuarioActual.id || "",
                nombre: usuarioActual.nombre || "",
                rol: usuarioActual.rol || ""
              }
            : null
    });

    guardarDatos("productos", ...(receta ? ["mezclas"] : []));
    guardarHistorialIngresosProductos();

    notificacion(
        "Ingreso registrado: " + formatearStock(cantidad)
        + " bolsas de " + producto.nombre + "."
        + (ingredientesUsadosTexto ? " Se descontó: " + ingredientesUsadosTexto + "." : "")
    );

    if(inputCantidad) inputCantidad.value = "";

    actualizarProductoIngresoSeleccionadoUI();
    renderHistorialIngresosProductos();

    const buscar = document.getElementById("buscarProductoIngreso");
    if(buscar){
        buscar.focus();
        buscar.select();
    }

}

function renderHistorialIngresosProductos(){

    const cont = document.getElementById("historialIngresosProductosUI");
    if(!cont) return;

    const lista = [...(historialIngresosProductos || [])]
        .sort((a,b)=> new Date(b.fecha || 0) - new Date(a.fecha || 0));

    if(!lista.length){
        cont.innerHTML = `<p class="tablaVacia">Todavía no hay ingresos de mercadería registrados.</p>`;
        return;
    }

    cont.innerHTML = `
        <div class="historialIngresosTabla">
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Producto</th>
                        <th>Ingresaron</th>
                        <th>Stock antes</th>
                        <th>Stock después</th>
                        <th>Insumos descontados</th>
                        <th>Usuario</th>
                    </tr>
                </thead>
                <tbody>
                    ${lista.map(ingreso => `
                        <tr>
                            <td class="historialIngresosFecha">${formatearFechaIngresoProducto(ingreso.fecha)}</td>
                            <td><strong>${ingreso.productoNombre || "Producto"}</strong></td>
                            <td class="historialIngresosCantidad">+${formatearStock(Number(ingreso.cantidad || 0))} bolsas</td>
                            <td>${formatearStock(Number(ingreso.stockAnterior || 0))}</td>
                            <td><strong>${formatearStock(Number(ingreso.stockNuevo || 0))}</strong></td>
                            <td>${ingreso.ingredientesDescontados || "—"}</td>
                            <td>${(ingreso.usuario && ingreso.usuario.nombre) || "—"}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;

}

function formatearFechaIngresoProducto(fecha){

    const d = new Date(fecha);
    if(Number.isNaN(d.getTime())) return "—";

    return d.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

}

function guardarHistorialIngresosProductos(){

    localStorage.setItem(
        "historialIngresosProductos",
        JSON.stringify(historialIngresosProductos)
    );

    if(window.FirebaseDB){
        window.FirebaseDB.guardarColeccion(
            "historialIngresosProductos",
            historialIngresosProductos
        );
    }

}

async function cargarHistorialIngresosProductos(){

    historialIngresosProductos = JSON.parse(
        localStorage.getItem("historialIngresosProductos") || "[]"
    );

    if(!window.FirebaseDB) return;

    const remoto = await window.FirebaseDB.leerColeccion("historialIngresosProductos");

    if(remoto === undefined){
        return;
    }

    if(remoto === null){
        window.FirebaseDB.guardarColeccion(
            "historialIngresosProductos",
            historialIngresosProductos
        );
    }else{
        historialIngresosProductos = Array.isArray(remoto) ? remoto : [];
        localStorage.setItem(
            "historialIngresosProductos",
            JSON.stringify(historialIngresosProductos)
        );
    }

    if(unsubscribeIngresosProductos){
        try{ unsubscribeIngresosProductos(); }catch(_e){}
    }

    unsubscribeIngresosProductos = window.FirebaseDB.escucharColeccion(
        "historialIngresosProductos",
        (remotoEnVivo)=>{
            historialIngresosProductos = Array.isArray(remotoEnVivo) ? remotoEnVivo : [];
            localStorage.setItem(
                "historialIngresosProductos",
                JSON.stringify(historialIngresosProductos)
            );

            if(document.getElementById("historialIngresosProductosUI")){
                renderHistorialIngresosProductos();
            }
        }
    );

}




/* ==========================================================
   INICIALIZACIÓN DE LAS FUNCIONES NUEVAS
========================================================== */

document.addEventListener("DOMContentLoaded", ()=>{

    asegurarEstilosIngresosProductos();

    // Firebase se inicializa antes de que se dispare DOMContentLoaded.
    // Se carga el historial propio de ingresos sin modificar las demás tablas.
    cargarHistorialIngresosProductos();

});
