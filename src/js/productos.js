/* ==========================================
   PRODUCTOS
========================================== */

let productoEditandoId = null;
let stockAlAbrirProducto = null;
let filtroProductos = "";

function renderProductos(){

    const editar = puede("editarProductos");

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

            <label class="filtroCheck">
                <input type="checkbox" id="soloStockBajo"> Solo con poco stock
            </label>

            <button id="btnExportarProductos" class="btnSecundario">⬇ Exportar a Excel</button>

            ${editar ? `<button id="btnAgregarProducto" class="btnAgregar">+ Agregar producto</button>` : ""}

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
                            ${editar ? "<th>Acciones</th>" : ""}
                        </tr>
                    </thead>

                    <tbody id="tablaProductosBody"></tbody>

                </table>

            </div>

        </div>

    `;

    const btnAgregar = document.getElementById("btnAgregarProducto");

    if(btnAgregar) btnAgregar.onclick = abrirModalNuevoProducto;

    document.getElementById("btnExportarProductos").onclick = exportarProductosCSV;

    document.getElementById("soloStockBajo").addEventListener("change", actualizarTablaProductos);

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

function productoConStockBajo(producto){

    return Number(producto.stock || 0) <= stockMinimoDe(producto);

}

function productosFiltrados(){

    const soloBajo = !!(document.getElementById("soloStockBajo") || {}).checked;

    let lista = !filtroProductos
        ? productos
        : productos.filter(p =>
            (p.nombre || "").toLowerCase().includes(filtroProductos)
            || (p.categoria || "").toLowerCase().includes(filtroProductos)
        );

    if(soloBajo) lista = lista.filter(productoConStockBajo);

    return lista;

}

function actualizarTablaProductos(){

    const tbody = document.getElementById("tablaProductosBody");

    if(!tbody) return;

    const editar = puede("editarProductos");

    const columnas = editar ? 7 : 6;

    if(productos.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="${columnas}" class="tablaVacia">
                    Todavía no hay productos cargados.
                </td>
            </tr>
        `;

        return;

    }

    const listaFiltrada = productosFiltrados();

    if(listaFiltrada.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="${columnas}" class="tablaVacia">
                    No se encontraron productos${filtroProductos ? ` para "${esc(filtroProductos)}"` : ""}.
                </td>
            </tr>
        `;

        return;

    }

    tbody.innerHTML = listaFiltrada.map(producto =>{

        const stockHtml = productoConStockBajo(producto)
            ? `<span class="stockBajo">${formatearStock(producto.stock)}</span>`
            : formatearStock(producto.stock);

        return `
            <tr>
                <td><strong>${esc(producto.nombre)}</strong></td>
                <td>${esc(producto.categoria || "—")}</td>
                <td>${esc(producto.pesoBolsa || 0)} kg</td>
                <td>${dinero(producto.precioBolsa)}</td>
                <td>${dinero(producto.precioKg)}</td>
                <td>${stockHtml}</td>
                ${editar ? `
                <td class="accionesTabla">
                    <button
                        class="btnAccion btnEditar"
                        title="Editar"
                        onclick="editarProducto('${esc(producto.id)}')">
                        ✏️
                    </button>
                    <button
                        class="btnAccion btnBorrar"
                        title="Eliminar"
                        onclick="eliminarProducto('${esc(producto.id)}')">
                        🗑️
                    </button>
                </td>
                ` : ""}
            </tr>
        `;

    }).join("");

}

function exportarProductosCSV(){

    const filas = [["Nombre", "Categoría", "Peso por bolsa (kg)", "Precio bolsa", "Precio kg", "Stock (bolsas)", "Stock mínimo"]];

    productosFiltrados().forEach(p =>{

        filas.push([
            p.nombre,
            p.categoria || "",
            Number(p.pesoBolsa || 0),
            Number(p.precioBolsa || 0),
            Number(p.precioKg || 0),
            Number(p.stock || 0),
            Number(p.stockMinimo || 0)
        ]);

    });

    descargarArchivo("Productos_" + fechaLocalISO(new Date()) + ".csv", generarCSV(filas), "text/csv;charset=utf-8");

    notificacion("Lista de productos exportada.");

}

const CAMPOS_MODAL_PRODUCTO = [
    "nombreProducto",
    "categoriaProducto",
    "pesoBolsa",
    "precioBolsaProducto",
    "precioKgProducto",
    "stockProducto",
    "stockMinimoProducto",
    "costoBolsaProducto",
    "separarProducto",
    "grupoSepararProducto"
];

function mostrarCamposAdminProducto(){

    // Costo y "separar" son datos internos del negocio: solo el admin.
    document.getElementById("camposAdminProducto").classList.toggle("oculto", !esAdmin());

}

function abrirModalNuevoProducto(){

    if(!puede("editarProductos")){ avisarSinPermiso(); return; }

    productoEditandoId = null;

    document.getElementById("tituloModalProducto").textContent = "Nuevo Producto";

    limpiar(...CAMPOS_MODAL_PRODUCTO);

    mostrarCamposAdminProducto();

    abrir("modalProducto");

    setTimeout(()=> document.getElementById("nombreProducto").focus(), 100);

}

function editarProducto(id){

    if(!puede("editarProductos")){ avisarSinPermiso(); return; }

    const producto = productos.find(p => p.id === id);

    if(!producto) return;

    productoEditandoId = id;

    document.getElementById("tituloModalProducto").textContent = "Editar Producto";

    const poner = (idCampo, valor) =>{

        document.getElementById(idCampo).value = (valor === undefined || valor === null) ? "" : valor;

    };

    poner("nombreProducto", producto.nombre);
    poner("categoriaProducto", producto.categoria);
    poner("pesoBolsa", producto.pesoBolsa || "");
    poner("precioBolsaProducto", producto.precioBolsa || "");
    poner("precioKgProducto", producto.precioKg || "");
    poner("stockProducto", producto.stock !== undefined ? formatearStock(producto.stock) : "");

    stockAlAbrirProducto = numeroDe("stockProducto");
    poner("stockMinimoProducto", producto.stockMinimo || "");
    poner("costoBolsaProducto", producto.costoBolsa || "");
    poner("separarProducto", producto.separarPorBolsa || "");
    poner("grupoSepararProducto", producto.grupoSeparar || "");

    mostrarCamposAdminProducto();

    abrir("modalProducto");

}

function guardarProducto(){

    if(!puede("editarProductos")){ avisarSinPermiso(); return; }

    const nombre = document.getElementById("nombreProducto").value.trim();

    if(!nombre){

        notificacion("El nombre del producto es obligatorio.", "warning");

        return;

    }

    const repetido = productos.find(p =>
        p.id !== productoEditandoId
        && normalizarNombreProducto(p.nombre) === normalizarNombreProducto(nombre)
    );

    if(repetido){

        notificacion("Ya existe un producto llamado \"" + repetido.nombre + "\".", "warning");

        return;

    }

    const datos = {
        nombre,
        categoria: document.getElementById("categoriaProducto").value.trim(),
        pesoBolsa: numeroDe("pesoBolsa"),
        precioBolsa: numeroDe("precioBolsaProducto"),
        precioKg: numeroDe("precioKgProducto"),
        stock: numeroDe("stockProducto"),
        stockMinimo: numeroDe("stockMinimoProducto")
    };

    if(esAdmin()){

        datos.costoBolsa = numeroDe("costoBolsaProducto");
        datos.separarPorBolsa = numeroDe("separarProducto");
        datos.grupoSeparar = document.getElementById("grupoSepararProducto").value.trim();

    }

    if(productoEditandoId){

        const producto = productos.find(p => p.id === productoEditandoId);

        if(producto){

            // Si mientras se editaba se vendió este producto en otra caja, el
            // stock que figura en el formulario quedó viejo: solo se cambia
            // si la persona realmente tocó el campo.
            if(datos.stock === stockAlAbrirProducto) delete datos.stock;

            Object.assign(producto, datos);

            notificacion("Producto actualizado.");

        }

    }else{

        productos.push({ id: nuevoId("P"), ...datos });

        notificacion("Producto agregado correctamente.");

    }

    guardarDatos("productos");

    cerrarModalProducto();

    actualizarTablaProductos();

    productoEditandoId = null;

}

function eliminarProducto(id){

    if(!puede("editarProductos")){ avisarSinPermiso(); return; }

    const producto = productos.find(p => p.id === id);

    if(!producto) return;

    if(carrito.some(item => item.id === id)){

        notificacion("Ese producto está cargado en la venta en curso. Quitalo de la venta primero.", "warning");

        return;

    }

    const enMezclas = mezclas.filter(m =>
        (m.productoSalida && m.productoSalida.id === id)
        || (m.ingredientes || []).some(i => i.idProducto === id)
    );

    const aviso = enMezclas.length
        ? " Ojo: se usa en la(s) mezcla(s) " + enMezclas.map(m => m.nombre).join(", ") + "."
        : "";

    confirmar(
        "¿Eliminar el producto " + producto.nombre + "?" + aviso,
        ()=>{

            productos = productos.filter(p => p.id !== id);

            registrarEliminacion(
                "Producto",
                "Producto " + producto.nombre
                + " · Stock: " + formatearStock(producto.stock),
                producto
            );

            guardarDatos("productos", "eliminaciones");

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
