/* ==========================================
   PRECIOS PERSONALIZADOS POR CLIENTE
========================================== */

let clientePreciosActualId = null;

let productoPrecioEditandoId = null;

// Caché en memoria de los precios personalizados por cliente, sincronizada
// con Firebase. Arranca con lo que había en localStorage como respaldo.
let preciosClientesCache = JSON.parse(localStorage.getItem("preciosClientes")) || [];

async function inicializarPreciosClientesFirebase(){

    if(!window.FirebaseDB) return;

    const remoto = await window.FirebaseDB.leerColeccion("preciosClientes");

    if(remoto === undefined) return; // sin conexión: seguimos con lo local

    if(remoto === null){

        window.FirebaseDB.guardarColeccion("preciosClientes", preciosClientesCache);

    }else{

        preciosClientesCache = remoto;

        localStorage.setItem("preciosClientes", JSON.stringify(remoto));

    }

    window.FirebaseDB.escucharColeccion("preciosClientes", (remoto) =>{

        preciosClientesCache = remoto;

        localStorage.setItem("preciosClientes", JSON.stringify(remoto));

        refrescarPantallaActual();

    });

}

function obtenerTodosPreciosCliente(){

    return preciosClientesCache;

}

function guardarTodosPreciosCliente(lista){

    preciosClientesCache = lista;

    localStorage.setItem("preciosClientes", JSON.stringify(lista));

    if(window.FirebaseDB) window.FirebaseDB.guardarColeccion("preciosClientes", lista);

}

function obtenerPreciosCliente(clienteId){

    return obtenerTodosPreciosCliente().filter(p => p.clienteId === clienteId);

}

function eliminarPreciosCliente(clienteId){

    const lista = obtenerTodosPreciosCliente().filter(p => p.clienteId !== clienteId);

    guardarTodosPreciosCliente(lista);

}

/* ==========================================
   ABRIR PANTALLA DE PRECIOS
========================================== */

function abrirPantallaPreciosClienteDetalle(clienteId){

    clientePreciosActualId = clienteId;

    const cliente = clientes.find(c => c.id === clienteId);

    if(!cliente) return;

    document.getElementById("tituloPreciosCliente").textContent =

        "Precios de " + cliente.nombre;

    abrirPantallaPreciosCliente();

    renderPantallaPreciosCliente();

}

function renderPantallaPreciosCliente(){

    const cont = document.getElementById("contenidoPreciosCliente");

    if(!cont) return;

    cont.innerHTML = `

        <div class="preciosClienteLayout">

            <div class="card">

                <h2>Buscar producto para asignar precio</h2>

                <p class="notaPrecios">
                    Buscá un producto y al seleccionarlo abrí el modal para
                    cargarle un precio personalizado a este cliente.
                </p>

                <input
                    id="buscarProductoPrecio"
                    type="text"
                    placeholder="Buscar producto..."
                    autocomplete="off">

                <div id="listaProductosPrecio" class="listaBusqueda"></div>

            </div>

            <div class="card">

                <h2>Precios registrados</h2>

                <input
                    id="buscarPrecioRegistrado"
                    type="text"
                    placeholder="Buscar en los precios cargados..."
                    autocomplete="off">

                <div id="listaPreciosRegistrados" class="listaPreciosRegistrados"></div>

            </div>

        </div>

    `;

    const inputBusqueda = document.getElementById("buscarProductoPrecio");

    if(inputBusqueda){

        inputBusqueda.addEventListener("input", buscarProductoPrecio);

        inputBusqueda.addEventListener("keydown", (e)=>{

            if(e.key !== "Enter") return;

            e.preventDefault();

            const texto = e.target.value.trim().toLowerCase();

            if(texto === "") return;

            const producto = productos.find(p=>

                p.nombre.toLowerCase().includes(texto)

                || (p.id || "").toLowerCase().includes(texto)

            );

            if(producto){

                seleccionarProductoPrecio(producto.id);

            }else{

                notificacion("No se encontró el producto.", "warning");

            }

        });

    }

    const inputBusquedaRegistrados = document.getElementById("buscarPrecioRegistrado");

    if(inputBusquedaRegistrados){

        inputBusquedaRegistrados.addEventListener("input", renderListaPreciosRegistrados);

    }

    renderListaPreciosRegistrados();

}

/* ==========================================
   BUSCAR PRODUCTOS
========================================== */

function buscarProductoPrecio(){

    const texto = document
        .getElementById("buscarProductoPrecio")
        .value
        .toLowerCase();

    const lista = document.getElementById("listaProductosPrecio");

    if(!lista) return;

    lista.innerHTML = "";

    if(texto === "") return;

    const encontrados = productos.filter(producto=>{

        return (

            producto.nombre.toLowerCase().includes(texto)

            || (producto.id || "").toLowerCase().includes(texto)

        );

    });

    if(encontrados.length === 0){

        lista.innerHTML = `
            <div class="itemBusquedaVacio">
                No se encontraron productos.
            </div>
        `;

        return;

    }

    encontrados.forEach(producto=>{

        lista.innerHTML += `

            <div
                class="itemBusquedaProducto"
                onclick="seleccionarProductoPrecio('${producto.id}')">

                <strong>${producto.nombre}</strong>

                <br>

                <small>

                    ${producto.id}

                    • Bolsa: ${dinero(producto.precioBolsa)}

                    • Kg: ${dinero(producto.precioKg)}
                </small>

            </div>

        `;

    });

}

function seleccionarProductoPrecio(id){

    const producto = productos.find(p => p.id === id);

    if(!producto) return;

    document.getElementById("buscarProductoPrecio").value = "";

    document.getElementById("listaProductosPrecio").innerHTML = "";

    productoPrecioEditandoId = id;

    document.getElementById("nombrePrecioProducto").value = producto.nombre;

    const existente = obtenerPreciosCliente(clientePreciosActualId)
        .find(p => p.productoId === id);

    document.getElementById("precioBolsaCliente").value =

        existente ? existente.precioBolsa : producto.precioBolsa;

    document.getElementById("precioKgCliente").value =

        existente ? existente.precioKg : producto.precioKg;

    abrir("modalPrecioCliente");

    setTimeout(()=> document.getElementById("precioBolsaCliente").focus(), 100);

}

/* ==========================================
   GUARDAR PRECIO PERSONALIZADO
========================================== */

function guardarPrecioCliente(){

    if(!clientePreciosActualId || !productoPrecioEditandoId){

        notificacion("No hay producto seleccionado.", "warning");

        return;

    }

    const precioBolsa = Number(document.getElementById("precioBolsaCliente").value) || 0;

    const precioKg = Number(document.getElementById("precioKgCliente").value) || 0;

    if(precioBolsa <= 0 && precioKg <= 0){

        notificacion("Cargá al menos un precio válido.", "warning");

        return;

    }

    const lista = obtenerTodosPreciosCliente();

    const indice = lista.findIndex(p =>

        p.clienteId === clientePreciosActualId

        && p.productoId === productoPrecioEditandoId

    );

    if(indice >= 0){

        lista[indice].precioBolsa = precioBolsa;

        lista[indice].precioKg = precioKg;

    }else{

        lista.push({

            id: "PC" + Date.now(),

            clienteId: clientePreciosActualId,

            productoId: productoPrecioEditandoId,

            precioBolsa,

            precioKg

        });

    }

    guardarTodosPreciosCliente(lista);

    cerrarModalPrecioCliente();

    renderListaPreciosRegistrados();

    productoPrecioEditandoId = null;

    notificacion("Precio personalizado guardado.");

}

/* ==========================================
   LISTA DE PRECIOS REGISTRADOS
========================================== */

function renderListaPreciosRegistrados(){

    const cont = document.getElementById("listaPreciosRegistrados");

    if(!cont) return;

    const texto = (document.getElementById("buscarPrecioRegistrado")?.value || "")
        .toLowerCase();

    let precios = obtenerPreciosCliente(clientePreciosActualId);

    if(texto !== ""){

        precios = precios.filter(p =>{

            const producto = productos.find(prod => prod.id === p.productoId);

            const nombre = producto ? producto.nombre.toLowerCase() : "";

            const id = (p.productoId || "").toLowerCase();

            return nombre.includes(texto) || id.includes(texto);

        });

    }

    if(precios.length === 0){

        cont.innerHTML = `
            <div class="itemBusquedaVacio">
                ${texto !== ""
                    ? "No se encontraron precios con ese criterio."
                    : "Todavía no hay precios personalizados cargados."}
            </div>
        `;

        return;

    }

    cont.innerHTML = precios.map(p =>{

        const producto = productos.find(prod => prod.id === p.productoId);

        const nombre = producto ? producto.nombre : "(Producto eliminado)";

        return `
            <div class="itemPrecioRegistrado">
                <div class="datoPrecioRegistrado">
                    <strong>${nombre}</strong>
                    <small>${p.productoId}</small>
                </div>
                <div class="valoresPrecioRegistrado">
                    <span>Bolsa: ${dinero(p.precioBolsa)}</span>
                    <span>Kg: ${dinero(p.precioKg)}</span>
                </div>
                <div class="accionesPrecioRegistrado">
                    <button
                        class="btnAccion btnEditar"
                        title="Editar precio"
                        onclick="editarPrecioRegistrado('${p.productoId}')">
                        ✏️
                    </button>
                    <button
                        class="btnAccion btnBorrar"
                        title="Eliminar precio"
                        onclick="eliminarPrecioRegistrado('${p.productoId}')">
                        🗑️
                    </button>
                </div>
            </div>
        `;

    }).join("");

}

function editarPrecioRegistrado(productoId){

    seleccionarProductoPrecio(productoId);

}

function eliminarPrecioRegistrado(productoId){

    const producto = productos.find(p => p.id === productoId);

    confirmar(

        "¿Eliminar el precio personalizado de "
        + (producto ? producto.nombre : "este producto") + "?",

        ()=>{

            const lista = obtenerTodosPreciosCliente().filter(p =>

                !(p.clienteId === clientePreciosActualId

                  && p.productoId === productoId)

            );

            guardarTodosPreciosCliente(lista);

            renderListaPreciosRegistrados();

            notificacion("Precio personalizado eliminado.", "error");

        }

    );

}
