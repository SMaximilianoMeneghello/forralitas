/* ==========================================
   PRODUCTOS
========================================== */

let productoEditandoId = null;
let filtroProductos = "";

function renderProductos(){

    contenido().innerHTML = `

        <div class="productosHeader">

            <div class="buscadorTabla">
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

    if(btnAgregar) btnAgregar.onclick = abrirModalNuevoProducto;

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

    guardarDatos();

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

            guardarDatos();

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
