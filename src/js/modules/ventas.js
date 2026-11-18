/* ==========================================
   VENTAS
========================================== */

let modoVenta = "bolsa";
let metodoPago = "efectivo";
let productoVenta = null;

// Índice resaltado (con las flechitas) en la lista de sugerencias del
// buscador de productos de Ventas. -1 = nada resaltado todavía.
let indiceSugerenciaVenta = -1;

// Caché de la configuración de Mercado Pago Point (token/dispositivo
// guardados en el proceso main de Electron). Se carga una vez al entrar
// a Ventas; "tieneToken" y "deviceId" deciden si se muestra el botón
// de cobro automático.
let mpConfigCache = { tieneToken: false, deviceId: "" };

// Cobro en curso contra el Point Smart (para el polling y para poder
// cancelarlo desde el modal de espera).
let ordenPointSmartActual = null;
let intervaloPointSmart = null;

// Monitor de transferencias/QR de Mercado Pago (no usa el Point: lee
// los últimos pagos acreditados en la cuenta por la API de Pagos).
// "transferenciaEsperada" es la venta en curso que está esperando una
// transferencia puntual; si es null el monitor solo avisa, no registra
// ninguna venta sola.
let intervaloTransferenciasMP = null;
let desdeMonitorTransferenciasMP = null;
let transferenciaEsperada = null;

// Búsqueda sin importar mayúsculas ni acentos ("maiz" encuentra "Maíz").
function normalizarBusqueda(texto){

    return (texto || "")
        .toString()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();

}

let estadoVenta = "paga";

function renderVentas(){

    contenido().innerHTML = `

        <div class="ventasSuperior">

            <div class="clienteVenta">

                <label>Cliente (opcional)</label>

                <input
                    id="buscarClienteVenta"
                    type="text"
                    placeholder="Buscar cliente..."
                    autocomplete="off">

                <div id="listaClientesVenta"></div>

                <div
                    id="clienteSeleccionadoVenta"
                    class="clienteSeleccionado oculto">

                    <span id="nombreClienteSeleccionado"></span>

                    <button
                        type="button"
                        class="btnQuitarCliente"
                        onclick="limpiarClienteVenta()">

                        ✕

                    </button>

                </div>
                <div class="saldoClienteVenta">

    Saldo actual:

    <strong id="saldoClienteVenta">

        $0

    </strong>

</div>
<div class="estadoVenta">

    <span>Estado</span>

    <button id="btnPaga" class="estadoActivo">

        PAGA

    </button>

    <button id="btnDebe">

        DEBE

    </button>

</div>
            </div>

            <div class="busquedaVenta">

                <label>Producto</label>

                <input
                    id="buscarVenta"
                    type="text"
                    placeholder="Buscar producto..."
                    autocomplete="off">

                <div id="listaProductosVenta"></div>

            </div>

            <div class="modoVenta">

                <button
                    id="modoBolsa"
                    class="modoActivo">

                    Bolsa

                </button>

                <button
                    id="modoKg">

                    Kg

                </button>

                <button
                    id="modoDinero">

                    $

                </button>

            </div>

        </div>

        <div class="tablaVenta">

            <table>

                <thead>

                    <tr>

                        <th>Producto</th>

                        <th>Cantidad</th>

                        <th>Unidad</th>

                        <th>Precio Unit.</th>

                        <th>Subtotal</th>

                        <th>Acción</th>

                    </tr>

                </thead>

                <tbody id="tablaVenta">

                </tbody>

            </table>

        </div>

        <div class="pieVenta">

            <div class="totalVenta">

                <small>TOTAL</small>

                <h2 id="totalVenta">$0</h2>

            </div>

            <div class="formasPago">

                <button
                    id="btnEfectivo"
                    class="activo">

                    Efectivo

                </button>

                <button
                    id="btnTransferencia">

                    Transferencia/QR

                </button>

                <button
                    id="btnTarjeta">

                    Tarjeta

                </button>

                <button
                    id="btnMixto">

                    Mixto

                </button>

                <div
                    id="pagoMixto"
                    class="pagoMixto">

                    <div>

                        <label>Efectivo</label>

                        <input
                            id="montoEfectivo"
                            type="text"
                            inputmode="decimal"
                            autocomplete="off"
                            oninput="limpiarNumero(this); renderAccionPointSmart()">

                    </div>

                    <div>

                        <label>Resto (transferencia/tarjeta)</label>

                        <input
                            id="montoTransferencia"
                            type="text"
                            inputmode="decimal"
                            autocomplete="off"
                            oninput="limpiarNumero(this); renderAccionPointSmart()">

                    </div>

                    <div>

                        <label>Medio del resto</label>

                        <select id="tipoElectronicoMixto" onchange="renderAccionPointSmart()">
                            <option value="transferencia">Transferencia/QR</option>
                            <option value="tarjeta">Tarjeta</option>
                        </select>

                    </div>

                </div>

                <div id="accionPointSmart" class="accionPointSmart"></div>

            </div>

            <button
                id="btnRegistrarVenta"
                class="btnGuardar">

                Registrar venta

            </button>

        </div>

    `;

    actualizarTablaVenta();
    actualizarClienteVentaUI();
    iniciarEventosVenta();

}

function iniciarEventosVenta(){

    const buscarVenta = document.getElementById("buscarVenta");
    const buscarCliente = document.getElementById("buscarClienteVenta");

    buscarVenta.addEventListener("input", buscarProductosVenta);

    buscarVenta.addEventListener("keydown", (e)=>{

        if(e.key === "ArrowDown" || e.key === "ArrowUp"){

            const items = document.querySelectorAll("#listaProductosVenta .itemBusquedaProducto");

            if(items.length === 0) return;

            e.preventDefault();

            const siguiente = indiceSugerenciaVenta + (e.key === "ArrowDown" ? 1 : -1);

            indiceSugerenciaVenta = Math.max(0, Math.min(items.length - 1, siguiente));

            resaltarSugerenciaVenta(items);

            return;

        }

        if(e.key !== "Enter") return;

        e.preventDefault();

        // Hay una sugerencia resaltada con las flechitas: esa es la que
        // se agrega, sin importar si hay otro match "mejor" en la lista.
        const items = document.querySelectorAll("#listaProductosVenta .itemBusquedaProducto");

        if(indiceSugerenciaVenta >= 0 && items[indiceSugerenciaVenta]){

            seleccionarProductoVenta(items[indiceSugerenciaVenta].dataset.id);

            return;

        }

        const texto = normalizarBusqueda(e.target.value);

        // Buscador vacío: se registra la venta directamente.
        if(texto === ""){

            registrarVenta();

            return;

        }

        const producto = productos.find(p=>

            normalizarBusqueda(p.nombre).includes(texto)

            || normalizarBusqueda(p.id).includes(texto)

        );

        if(producto){

            seleccionarProductoVenta(producto.id);

        }else{

            notificacion("No se encontró el producto.", "warning");

        }

    });

    buscarCliente.addEventListener("input", buscarClientesVenta);

    buscarCliente.addEventListener("keydown", (e)=>{

        if(e.key !== "Enter") return;

        const texto = e.target.value.toLowerCase();

        const cliente = clientes.find(c=>

            c.nombre.toLowerCase().includes(texto)

            || (c.telefono || "").includes(texto)

        );

        if(cliente){

            seleccionarClienteVenta(cliente.id);

        }

    });

    document.getElementById("btnRegistrarVenta").onclick = registrarVenta;
    document.getElementById("modoBolsa").onclick = () => cambiarModoVenta("bolsa");
    document.getElementById("modoKg").onclick = () => cambiarModoVenta("kg");
    document.getElementById("modoDinero").onclick = () => cambiarModoVenta("dinero");
    document.getElementById("btnEfectivo").onclick = () => cambiarMetodoPago("efectivo");
    document.getElementById("btnTransferencia").onclick = () => cambiarMetodoPago("transferencia");
    document.getElementById("btnTarjeta").onclick = () => cambiarMetodoPago("tarjeta");
    document.getElementById("btnMixto").onclick = () => cambiarMetodoPago("mixto");
    document.getElementById("btnPaga").onclick = () => cambiarEstadoVenta("paga");
    document.getElementById("btnDebe").onclick = () => cambiarEstadoVenta("debe"); 

    const montoEfectivo = document.getElementById("montoEfectivo");
    const montoTransferencia = document.getElementById("montoTransferencia");

    montoEfectivo.addEventListener("keydown", (e)=>{

        if(e.key !== "Enter") return;

        e.preventDefault();

        // Del primer monto se pasa al monto de la par.
        montoTransferencia.focus();
        montoTransferencia.select();

    });

    montoTransferencia.addEventListener("keydown", (e)=>{

        if(e.key !== "Enter") return;

        e.preventDefault();

        // Con ambos montos cargados, Enter registra la venta.
        registrarVenta();

    });

    if(!window.__enterVentaIniciado){

        document.addEventListener("keydown", manejarEnterGlobalVenta);

        window.__enterVentaIniciado = true;

    }

    cambiarModoVenta("bolsa");
    cambiarMetodoPago("efectivo");
    cambiarEstadoVenta("paga");
    cargarConfigMP();
}

// Trae del proceso main si ya hay un Access Token / dispositivo Point
// configurados, para decidir si se muestra el cobro automático.
async function cargarConfigMP(){

    if(!window.forralitasNative) return;

    try{

        mpConfigCache = await window.forralitasNative.mp.obtenerConfig();

    }catch{

        mpConfigCache = { tieneToken: false, deviceId: "" };

    }

    renderAccionPointSmart();

}

function manejarEnterGlobalVenta(e){

    if(e.key !== "Enter") return;

    if(paginaActual !== "Ventas") return;

    // Si hay un modal abierto, lo maneja el modal.
    if(document.querySelector(".modal:not(.oculto)")) return;

    const activo = document.activeElement;

    // Estos campos tienen su propio manejo de Enter.
    const propios = [
        "buscarVenta",
        "buscarClienteVenta",
        "montoEfectivo",
        "montoTransferencia"
    ];

    if(activo && propios.includes(activo.id)) return;

    // Los botones e inputs manejan Enter por su cuenta (evita doble acción).
    if(activo){

        const etiqueta = activo.tagName;

        if(etiqueta === "BUTTON"
            || etiqueta === "INPUT"
            || etiqueta === "TEXTAREA"
            || etiqueta === "SELECT") return;

    }

    // Buscador no seleccionado: Enter registra la venta.
    e.preventDefault();

    registrarVenta();

}

function cambiarModoVenta(modo){

    modoVenta = modo;

    document
        .querySelectorAll(".modoVenta button")
        .forEach(b => b.classList.remove("modoActivo"));

    if(modo === "bolsa"){

        document.getElementById("modoBolsa").classList.add("modoActivo");

    }

    if(modo === "kg"){

        document.getElementById("modoKg").classList.add("modoActivo");

    }

    if(modo === "dinero"){

        document.getElementById("modoDinero").classList.add("modoActivo");

    }

}

function cambiarMetodoPago(tipo){

    metodoPago = tipo;

    document.getElementById("btnEfectivo").classList.remove("activo");
    document.getElementById("btnTransferencia").classList.remove("activo");
    document.getElementById("btnTarjeta").classList.remove("activo");
    document.getElementById("btnMixto").classList.remove("activo");
    document.getElementById("pagoMixto").classList.remove("activo");

    if(tipo === "efectivo"){

        document.getElementById("btnEfectivo").classList.add("activo");

    }

    if(tipo === "transferencia"){

        document.getElementById("btnTransferencia").classList.add("activo");

    }

    if(tipo === "tarjeta"){

        document.getElementById("btnTarjeta").classList.add("activo");

    }

    if(tipo === "mixto"){

        document.getElementById("btnMixto").classList.add("activo");
        document.getElementById("pagoMixto").classList.add("activo");

        // Se abren los inputs y el cursor queda listo para escribir los montos.
        const montoEfectivo = document.getElementById("montoEfectivo");

        setTimeout(()=>{

            if(montoEfectivo){

                montoEfectivo.focus();
                montoEfectivo.select();

            }

        }, 50);

    }

    renderAccionPointSmart();

}
function cambiarEstadoVenta(tipo){

    estadoVenta = tipo;

    document.getElementById("btnPaga").classList.remove("estadoActivo");
    document.getElementById("btnDebe").classList.remove("estadoActivo");

    if(tipo === "paga"){

        document.getElementById("btnPaga").classList.add("estadoActivo");

    }else{

        document.getElementById("btnDebe").classList.add("estadoActivo");

    }

    renderAccionPointSmart();

}
/* ==========================================
   CLIENTES EN VENTA
========================================== */

function buscarClientesVenta(){

    const texto = document
        .getElementById("buscarClienteVenta")
        .value
        .toLowerCase();

    const lista = document.getElementById("listaClientesVenta");

    lista.innerHTML = "";

    if(texto === "") return;

    const encontrados = clientes.filter(cliente=>{

        return (

            cliente.nombre.toLowerCase().includes(texto)

            || (cliente.telefono || "").includes(texto)

        );

    });

    if(encontrados.length === 0){

        lista.innerHTML = `

            <div class="itemBusquedaVacio">

                No se encontraron clientes.

            </div>

        `;

        return;

    }

    encontrados.forEach(cliente=>{

        lista.innerHTML += `

            <div
                class="itemBusquedaProducto"
                onclick="seleccionarClienteVenta('${cliente.id}')">

                <strong>${cliente.nombre}</strong>

                <br>

                <small>

                    ${cliente.telefono || "Sin teléfono"}

                </small>

            </div>

        `;

    });

}

function seleccionarClienteVenta(id){

    clienteSeleccionado = clientes.find(c => c.id === id) || null;

    document.getElementById("buscarClienteVenta").value = "";
    document.getElementById("listaClientesVenta").innerHTML = "";

    actualizarClienteVentaUI();

    // Los productos ya cargados pasan a tener los precios de este cliente.
    mjRecalcularCarritoConPrecios();

}

function limpiarClienteVenta(){

    clienteSeleccionado = null;
    actualizarClienteVentaUI();

    mjRecalcularCarritoConPrecios();

}

function actualizarClienteVentaUI(){

    const contenedor = document.getElementById("clienteSeleccionadoVenta");
    const nombre = document.getElementById("nombreClienteSeleccionado");
    const saldo = document.getElementById("saldoClienteVenta");

    const saldoBox=document.querySelector(".saldoClienteVenta");
    const estado=document.querySelector(".estadoVenta");

    if(clienteSeleccionado){

        contenedor.classList.remove("oculto");

        if(saldoBox) saldoBox.style.display="block";
        if(estado) estado.style.display="flex";

        nombre.textContent="👤 "+clienteSeleccionado.nombre;

        saldo.textContent=dinero(clienteSeleccionado.saldo||0);

    }else{

        contenedor.classList.add("oculto");

        if(saldoBox) saldoBox.style.display="none";
        if(estado) estado.style.display="none";

        nombre.textContent="";
        saldo.textContent="$0";
    }

    renderAccionPointSmart();

}

/* ==========================================
   PRECIOS
========================================= */

function obtenerPreciosProducto(producto){

    const preciosClientes = obtenerTodosPreciosCliente();

    if(!clienteSeleccionado){

        return {
            precioBolsa: producto.precioBolsa,
            precioKg: producto.precioKg
        };

    }

    const especial = preciosClientes.find(p =>

        p.clienteId === clienteSeleccionado.id

        && p.productoId === producto.id

    );

    return {
        // Un precio especial vacío o en $0 no se usa: va el de lista
        // (antes ese producto se vendía a $0).
        precioBolsa: Number(especial?.precioBolsa) > 0 ? especial.precioBolsa : producto.precioBolsa,
        precioKg: Number(especial?.precioKg) > 0 ? especial.precioKg : producto.precioKg
    };

}

function calcularLineaVenta(producto, cantidad, modo){

    const precios = obtenerPreciosProducto(producto);

    let precio = 0;
    let subtotal = 0;
    let bolsas = 0;
    let kg = 0;

    if(modo === "bolsa"){

        precio = precios.precioBolsa;
        subtotal = cantidad * precios.precioBolsa;
        bolsas = cantidad;
        kg = cantidad * producto.pesoBolsa;

    }else if(modo === "kg"){

        precio = precios.precioKg;
        subtotal = cantidad * precios.precioKg;
        bolsas = cantidad / producto.pesoBolsa;
        kg = cantidad;

    }else{

        // Modo dinero: se ingresa el monto y se calculan los kg a pesar.
        precio = precios.precioKg;
        subtotal = cantidad;
        kg = precios.precioKg > 0 ? cantidad / precios.precioKg : 0;
        bolsas = producto.pesoBolsa > 0 ? kg / producto.pesoBolsa : 0;

    }

    return { precio, subtotal, bolsas, kg };

}

function formatearCantidadItem(item){

    if(item.modo === "dinero"){

        return Number(item.kg || 0).toFixed(2);

    }

    const valor = Number(item.cantidad);

    if(Number.isInteger(valor)) return valor;

    return valor.toFixed(2);

}

/* ==========================================
   TABLA VENTA
========================================= */

function actualizarTablaVenta(){

    const tbody = document.getElementById("tablaVenta");

    if(!tbody) return;

    tbody.innerHTML = "";

    let total = 0;

    if(carrito.length === 0){

        tbody.innerHTML = `

            <tr>

                <td colspan="6" class="tablaVacia">

                    Agregá productos para iniciar la venta.

                </td>

            </tr>

        `;

    }

    carrito.forEach((item, indice)=>{

        total += item.subtotal;

        tbody.innerHTML += `

            <tr>

                <td>${item.nombre}</td>

                <td>${formatearCantidadItem(item)}</td>

                <td>${unidadVenta(item.modo)}</td>

                <td>${dinero(item.precio)}</td>

                <td>${dinero(item.subtotal)}</td>

                <td>

                    <button
                        class="btnEliminar"
                        onclick="eliminarProductoVenta(${indice})">

                        🗑️

                    </button>

                </td>

            </tr>

        `;

    });

    const totalEl = document.getElementById("totalVenta");

    if(totalEl){

        totalEl.textContent = dinero(total);

    }

    renderAccionPointSmart();

}

function totalCarrito(){

    return carrito.reduce((acc, item) => acc + item.subtotal, 0);

}

function eliminarProductoVenta(indice){

    const item = carrito[indice];

    if(item){

        // Se devuelve el stock que se había descontado al cargarlo.
        const producto = productos.find(p => p.id === item.id);

        if(producto){

            producto.stock += item.bolsas;

        }

    }

    carrito.splice(indice, 1);

    guardarDatos("carrito", "productos");

    actualizarTablaVenta();

    if(paginaActual === "Productos"){

        actualizarTablaProductos();

    }

}

function notificarStockBajo(producto){

    if(producto.stock <= producto.stockMinimo){

        notificacion(

            "⚠ Stock bajo de " + producto.nombre + ": quedan "
            + formatearStock(producto.stock) + " bolsas (mínimo "
            + producto.stockMinimo + ").",

            "warning"

        );

    }

}

/* ==========================================
   BUSCAR PRODUCTOS
========================================= */

function buscarProductosVenta(){

    const texto = normalizarBusqueda(document.getElementById("buscarVenta").value);

    const lista = document.getElementById("listaProductosVenta");

    lista.innerHTML = "";

    // Cada vez que cambia el texto la lista es otra: se pierde lo que
    // estaba resaltado con las flechitas.
    indiceSugerenciaVenta = -1;

    if(texto === "") return;

    const encontrados = productos.filter(producto=>{

        return (

            normalizarBusqueda(producto.nombre).includes(texto)

            || normalizarBusqueda(producto.id).includes(texto)

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

        const precios = obtenerPreciosProducto(producto);

        lista.innerHTML += `

            <div
                class="itemBusquedaProducto"
                data-id="${producto.id}"
                onclick="seleccionarProductoVenta('${producto.id}')">

                <strong>${producto.nombre}</strong>

                <br>

                <small>

                    Stock: ${formatearStock(producto.stock)}

                    • Bolsa: ${dinero(precios.precioBolsa)}

                    • Suelto: ${dinero(precios.precioKg)}

                </small>

            </div>

        `;

    });

}

// Marca con la clase "activo" el ítem resaltado por las flechitas y lo
// mantiene visible dentro de la lista si hace falta hacer scroll.
function resaltarSugerenciaVenta(items){

    items.forEach((item, indice)=>{

        item.classList.toggle("activo", indice === indiceSugerenciaVenta);

    });

    const actual = items[indiceSugerenciaVenta];

    if(actual) actual.scrollIntoView({ block: "nearest" });

}

function seleccionarProductoVenta(id){

    agregarProductoVenta(id);

}

function agregarProductoVenta(id){

    productoVenta = productos.find(p => p.id === id);

    if(!productoVenta) return;

    if(productoVenta.stock <= 0){

        notificacion("Sin stock para " + productoVenta.nombre, "warning");

        return;

    }

    document.getElementById("buscarVenta").value = "";
    document.getElementById("listaProductosVenta").innerHTML = "";

    const input = document.getElementById("inputCantidad");

    input.value = "";

    if(modoVenta === "bolsa"){

        input.placeholder = "Cantidad de bolsas";

        input.step = "1";

    }

    if(modoVenta === "kg"){

        input.placeholder = "Cantidad de kilos";

        input.step = "0.01";

    }

    if(modoVenta === "dinero"){

        input.placeholder = "Monto en pesos";

        input.step = "0.01";

    }

    document.getElementById("tituloModalCantidad").textContent = productoVenta.nombre;

    actualizarPreviewCantidad();

    abrir("modalCantidad");

    setTimeout(()=> input.focus(), 100);

}

function actualizarPreviewCantidad(){

    const preview = document.getElementById("previewCantidad");

    if(!preview) return;

    if(!productoVenta || modoVenta !== "dinero"){

        preview.textContent = "";

        return;

    }

    const monto = Number(document.getElementById("inputCantidad").value);

    const precios = obtenerPreciosProducto(productoVenta);

    if(!monto || monto <= 0 || !(precios.precioKg > 0)){

        preview.textContent = "";

        return;

    }

    const kg = monto / precios.precioKg;

    preview.textContent = "≈ " + kg.toFixed(2) + " kg para pesar";

}

function confirmarCantidad(){

    // Se vuelve a buscar el producto: si mientras estaba abierto el cuadro
    // llegó un cambio de otra PC, la lista se reemplazó y el descuento de
    // stock tiene que hacerse sobre el registro actual (si no, se perdía).
    if(productoVenta) productoVenta = productos.find(p => p.id === productoVenta.id) || null;

    if(!productoVenta){

        notificacion("Seleccioná un producto.", "warning");

        return;

    }

    const cantidad = Number(document.getElementById("inputCantidad").value);

    if(!cantidad || cantidad <= 0){

        notificacion("Ingrese una cantidad válida.", "warning");

        return;

    }

    const linea = calcularLineaVenta(productoVenta, cantidad, modoVenta);

    if(linea.bolsas > productoVenta.stock){

        notificacion(

            "Stock insuficiente. Disponible: " + formatearStock(productoVenta.stock) + " bolsas.",

            "error"

        );

        return;

    }

    // Se descuenta el stock automáticamente al cargar el producto al carrito.
    productoVenta.stock -= linea.bolsas;

    const existente = carrito.find(item =>

        item.id === productoVenta.id && item.modo === modoVenta

    );

    if(existente){

        existente.cantidad += cantidad;

        const nuevaLinea = calcularLineaVenta(

            productoVenta,

            existente.cantidad,

            existente.modo

        );

        existente.precio = nuevaLinea.precio;
        existente.subtotal = nuevaLinea.subtotal;
        existente.bolsas = nuevaLinea.bolsas;
        existente.kg = nuevaLinea.kg;

    }else{

        carrito.push({

            id: productoVenta.id,

            nombre: productoVenta.nombre,

            cantidad,

            precio: linea.precio,

            modo: modoVenta,

            subtotal: linea.subtotal,

            bolsas: linea.bolsas,

            kg: linea.kg

        });

    }

    guardarDatos("carrito", "productos");

    const productoAfectado = productoVenta;

    cerrarModalCantidad();
    actualizarTablaVenta();

    if(paginaActual === "Productos"){

        actualizarTablaProductos();

    }

    notificarStockBajo(productoAfectado);

    enfocarBuscadorVenta();

}

function enfocarBuscadorVenta(){

    const buscar = document.getElementById("buscarVenta");

    if(buscar){

        buscar.value = "";
        document.getElementById("listaProductosVenta").innerHTML = "";
        buscar.focus();

    }

}

/* ==========================================
   COBRO CON MERCADO PAGO POINT
   ------------------------------------------
   Manda el monto al Point Smart vinculado y
   espera (con polling) a que el cliente pague
   para registrar la venta sola. Si no hay
   credenciales configuradas, o la app no corre
   dentro de Electron, esta sección simplemente
   no muestra ningún botón.
========================================= */

function mpDisponible(){

    return Boolean(window.forralitasNative) && mpConfigCache.tieneToken && mpConfigCache.deviceId;

}

// Recargo por pagar con tarjeta de crédito: se suma al total del carrito
// antes de mandar el cobro al Point Smart. El débito no tiene recargo.
// El porcentaje se configura en Configuración > Negocio > Ventas.
function montoConRecargoCredito(total){

    return Math.round(total * (1 + porcentajeRecargoCredito() / 100) * 100) / 100;

}

// La detección de transferencias/QR no usa el Point, así que alcanza con
// tener el Access Token guardado (no hace falta dispositivo vinculado).
function mpTransferenciasDisponible(){

    return Boolean(window.forralitasNative)
        && mpConfigCache.tieneToken
        && configuracionSistema?.negocio?.detectarTransferenciasMP !== false;

}

function renderAccionPointSmart(){

    const cont = document.getElementById("accionPointSmart");

    if(!cont) return;

    // Si la venta es "fiado" (debe), no se cobra nada ahora.
    if(clienteSeleccionado && estadoVenta === "debe"){

        cont.innerHTML = "";

        return;

    }

    // El Point solo se usa para cobrar con tarjeta (débito/crédito). Las
    // ventas en efectivo o transferencia se registran directo, sin pasar
    // por el dispositivo: el Point igual va a imprimir su ticket al
    // confirmar la venta (ver ticket.js).
    const total = totalCarrito();

    if(metodoPago === "tarjeta" && total > 0){

        if(!mpDisponible()){

            cont.innerHTML = "";

            return;

        }

        const totalCredito = montoConRecargoCredito(total);

        cont.innerHTML = `
            <div class="accionesTarjetaPoint">
                <button type="button" class="btnGuardar" onclick="iniciarCobroPointSmart('debito', ${total})">
                    📟 Débito ${dinero(total)}
                </button>
                <button type="button" class="btnGuardar" onclick="iniciarCobroPointSmart('credito', ${totalCredito})">
                    📟 Crédito ${dinero(totalCredito)} (+${porcentajeRecargoCredito()}%)
                </button>
            </div>
        `;

        return;

    }

    // Transferencia/QR: no pasa por el Point. Con el token de Mercado Pago
    // configurado, "Registrar venta" ya deja la venta esperando a que la
    // transferencia impacte sola (ver registrarVenta/revisarTransferenciasMP);
    // acá solo se avisa de eso, no hace falta un botón aparte.
    if(metodoPago === "transferencia" && total > 0){

        cont.innerHTML = mpTransferenciasDisponible()
            ? `<p class="notaAccionPago">🔔 Al registrar, se espera a que la transferencia impacte en Mercado Pago.</p>`
            : "";

        return;

    }

    if(metodoPago === "mixto"){

        const montoElectronico = Number(document.getElementById("montoTransferencia")?.value) || 0;
        const tipo = document.getElementById("tipoElectronicoMixto")?.value || "transferencia";

        if(montoElectronico <= 0){

            cont.innerHTML = "";

            return;

        }

        if(tipo === "tarjeta" && mpDisponible()){

            cont.innerHTML = `
                <button type="button" class="btnGuardar" onclick="iniciarCobroPointSmart('tarjeta', ${montoElectronico}, true)">
                    📟 Cobrar ${dinero(montoElectronico)} (resto) con Point Smart
                </button>
            `;

            return;

        }

        if(tipo === "transferencia" && mpTransferenciasDisponible()){

            cont.innerHTML = `<p class="notaAccionPago">🔔 Al registrar, se espera a que la transferencia del resto impacte en Mercado Pago.</p>`;

            return;

        }

        cont.innerHTML = "";

        return;

    }

    cont.innerHTML = "";

}

async function iniciarCobroPointSmart(tipo, monto, esMixto){

    if(!(monto > 0)){

        notificacion("Monto inválido para cobrar.", "warning");

        return;

    }

    const referencia = "FR" + Date.now();

    document.getElementById("montoPointSmart").textContent = dinero(monto);
    document.getElementById("textoPointSmart").textContent = "Esperando a que el cliente pague en el dispositivo...";

    abrir("modalPointSmart");

    try{

        const resultado = await window.forralitasNative.mp.crearCobro({ monto, tipo, referencia });

        ordenPointSmartActual = resultado.orderId;

    }catch(error){

        cerrarModalPointSmart();

        notificacion("No se pudo iniciar el cobro: " + error.message, "error");

        return;

    }

    intervaloPointSmart = setInterval(async ()=>{

        if(!ordenPointSmartActual) return;

        try{

            const estado = await window.forralitasNative.mp.consultarCobro(ordenPointSmartActual);

            if(estado.aprobado){

                const orden = ordenPointSmartActual;

                detenerPollingPointSmart();
                cerrar("modalPointSmart");

                confirmarVentaPorPointSmart(tipo, monto, esMixto, estado.paymentId, orden);

            }else if(estado.rechazado){

                detenerPollingPointSmart();
                cerrar("modalPointSmart");

                notificacion("El cobro no se completó en el Point Smart (" + estado.status + ").", "warning");

            }

        }catch{

            // Error de red puntual al consultar: se reintenta en el próximo tick.

        }

    }, 2500);

}

function detenerPollingPointSmart(){

    if(intervaloPointSmart){

        clearInterval(intervaloPointSmart);
        intervaloPointSmart = null;

    }

    ordenPointSmartActual = null;

}

function cerrarModalPointSmart(){

    cerrar("modalPointSmart");

    detenerPollingPointSmart();

}

async function cancelarCobroPointSmart(){

    const orden = ordenPointSmartActual;

    cerrarModalPointSmart();

    if(orden && window.forralitasNative){

        try{ await window.forralitasNative.mp.cancelarCobro(orden); }catch{}

    }

    notificacion("Cobro cancelado.", "warning");

}

function confirmarVentaPorPointSmart(tipo, monto, esMixto, paymentId, orderId){

    let pago = { efectivo: 0, transferencia: 0, tarjeta: 0 };

    let metodoPagoFinal = "tarjeta";

    if(esMixto){

        pago.efectivo = Number(document.getElementById("montoEfectivo")?.value) || 0;
        metodoPagoFinal = "mixto";

    }

    pago.tarjeta = monto;

    // Con crédito (sin mixto) el monto cobrado ya incluye el recargo por
    // crédito, así que la venta registrada queda por ese total: es la plata
    // que realmente entró a la caja.
    const totalOverride = (!esMixto && tipo === "credito") ? monto : undefined;

    finalizarVenta(metodoPagoFinal, pago, {

        pagoMP: { orderId, paymentId, tipo },
        mensaje: "Pago aprobado en el Point Smart. Venta registrada.",
        totalOverride

    });

}

/* ==========================================
   TRANSFERENCIAS / QR DE MERCADO PAGO
   ------------------------------------------
   No hay (ni puede haber, sin un servidor con
   dirección pública) un webhook que Mercado Pago
   le avise directo a esta PC cuando entra una
   transferencia. En cambio, cada pocos segundos
   se consultan los últimos pagos acreditados en
   la cuenta (ver mp:buscar-pagos-recientes) y:

   - Si hay una venta esperando una transferencia
     puntual (ver iniciarEsperaTransferenciaMP) y
     el monto coincide, la venta se registra sola.
   - Cualquier otro pago nuevo (recibido fuera de
     una espera activa) solo dispara un aviso, para
     no inventar ventas que no se cargaron en la app.
========================================= */

// Se llama una sola vez, al loguearse (ver app.js > iniciarAppLogueada),
// para que avise de transferencias sin importar en qué pantalla se esté.
function iniciarMonitorTransferenciasMP(){

    if(intervaloTransferenciasMP) return;

    cargarConfigMP();

    intervaloTransferenciasMP = setInterval(revisarTransferenciasMP, 7000);

}

async function revisarTransferenciasMP(){

    if(!window.forralitasNative) return;

    if(configuracionSistema?.negocio?.detectarTransferenciasMP === false) return;

    if(!mpConfigCache.tieneToken) return;

    const desde = desdeMonitorTransferenciasMP
        || new Date(Date.now() - 2 * 60 * 1000).toISOString();

    let pagos;

    try{

        pagos = await window.forralitasNative.mp.buscarPagosRecientes({ desde });

    }catch{

        // Sin internet o token inválido: se reintenta en el próximo ciclo.
        return;

    }

    // Pequeño solapamiento hacia atrás para no perder pagos por diferencias
    // de reloj/latencia entre esta consulta y la próxima.
    desdeMonitorTransferenciasMP = new Date(Date.now() - 20 * 1000).toISOString();

    const nuevos = (pagos || []).filter(pago =>

        !historialVentas.some(v => v.pagoMP && String(v.pagoMP.paymentId) === pago.id)

    );

    nuevos.forEach(pago =>{

        if(transferenciaEsperada && Math.abs(pago.monto - transferenciaEsperada.monto) < 1){

            const esperada = transferenciaEsperada;

            transferenciaEsperada = null;

            cerrarModalEsperaTransferencia(true);

            confirmarVentaPorTransferenciaMP(pago, esperada.esMixto);

        }else{

            notificacion("💰 Transferencia recibida: " + dinero(pago.monto) + " (Mercado Pago)", "success");

        }

    });

}

function iniciarEsperaTransferenciaMP(monto, esMixto){

    if(!(monto > 0)){

        notificacion("Monto inválido para esperar.", "warning");

        return;

    }

    transferenciaEsperada = { monto, esMixto };

    document.getElementById("montoEsperaTransferencia").textContent = dinero(monto);

    document.getElementById("textoEsperaTransferencia").textContent =
        "Esperando a que se acredite la transferencia en Mercado Pago...";

    abrir("modalEsperaTransferencia");

}

function cerrarModalEsperaTransferencia(ventaConfirmada){

    cerrar("modalEsperaTransferencia");

    if(!ventaConfirmada) transferenciaEsperada = null;

}

function cancelarEsperaTransferenciaMP(){

    cerrarModalEsperaTransferencia(false);

    notificacion("Se dejó de esperar la transferencia. Si ya se acreditó, va a avisar igual.", "warning");

}

// Salida de emergencia por si la detección falla (sin internet, demora,
// etc.) o el cajero prefiere confiar en el cliente sin esperar: registra
// la venta igual, pero sin el paymentId real de Mercado Pago.
function confirmarSinEsperarTransferenciaMP(){

    if(!transferenciaEsperada) return;

    const esperada = transferenciaEsperada;

    transferenciaEsperada = null;

    cerrar("modalEsperaTransferencia");

    let pago = { efectivo: 0, transferencia: 0, tarjeta: 0 };

    let metodoPagoFinal = "transferencia";

    if(esperada.esMixto){

        pago.efectivo = Number(document.getElementById("montoEfectivo")?.value) || 0;

        metodoPagoFinal = "mixto";

    }

    pago.transferencia = esperada.monto;

    finalizarVenta(metodoPagoFinal, pago, {

        mensaje: "Venta registrada sin esperar la confirmación de Mercado Pago."

    });

}

function confirmarVentaPorTransferenciaMP(pago, esMixto){

    let pagoObj = { efectivo: 0, transferencia: 0, tarjeta: 0 };

    let metodoPagoFinal = "transferencia";

    if(esMixto){

        pagoObj.efectivo = Number(document.getElementById("montoEfectivo")?.value) || 0;

        metodoPagoFinal = "mixto";

    }

    pagoObj.transferencia = pago.monto;

    finalizarVenta(metodoPagoFinal, pagoObj, {

        pagoMP: { paymentId: pago.id, tipo: "transferencia" },
        mensaje: "✅ Transferencia acreditada (" + dinero(pago.monto) + "). Venta registrada."

    });

}

/* ==========================================
   REGISTRAR VENTA
========================================= */

// Arma el objeto venta, lo guarda en el historial, descuenta saldo de
// cliente si corresponde, limpia el carrito/formulario e imprime el
// ticket. La usan tanto el botón manual "Registrar venta" como el
// cobro automático por Point Smart, para no duplicar esta lógica.
function finalizarVenta(metodoPagoFinal, pago, opciones = {}){

    // El recargo por tarjeta de crédito (ver montoConRecargoCredito) hace
    // que la plata cobrada sea mayor al total "de góndola" del carrito;
    // en ese caso la venta queda registrada por lo que realmente se cobró.
    const total = opciones.totalOverride ?? totalCarrito();

    const venta = {

        id: "V" + Date.now(),

        fecha: new Date().toISOString(),

        fechaTexto: fechaHoraTexto(new Date()),

        cliente: clienteSeleccionado

            ? {
                id: clienteSeleccionado.id,
                nombre: clienteSeleccionado.nombre
            }

            : null,

        vendedor: usuarioActual

            ? {
                usuario: usuarioActual.usuario,
                nombre: usuarioActual.nombre
            }

            : null,

        productos: carrito.map(item => ({ ...item })),

        total,

        metodoPago: metodoPagoFinal,

        pago,

        // Solo las ventas "debe" llevan seguimiento de saldo pendiente;
        // las demás quedan cobradas de una al momento de la venta.
        saldoPendiente: (clienteSeleccionado && estadoVenta === "debe") ? total : 0,

        pagada: !(clienteSeleccionado && estadoVenta === "debe")

    };

    if(opciones.pagoMP) venta.pagoMP = opciones.pagoMP;

    historialVentas.unshift(venta);

    let saldoClienteActualizado = false;

    if(clienteSeleccionado && estadoVenta === "debe"){

        const cliente = clientes.find(c => c.id === clienteSeleccionado.id);

        if(cliente){

            cliente.saldo = Number(cliente.saldo || 0) + total;

            clienteSeleccionado.saldo = cliente.saldo;

            saldoClienteActualizado = true;

        }

    }

    carrito = [];
    clienteSeleccionado = null;

    guardarDatos(
        "historialVentas",
        "carrito",
        ...(saldoClienteActualizado ? ["clientes"] : [])
    );
    actualizarTablaVenta();
    actualizarClienteVentaUI();

    const montoEfectivo = document.getElementById("montoEfectivo");
    const montoTransferencia = document.getElementById("montoTransferencia");

    if(montoEfectivo) montoEfectivo.value = "";
    if(montoTransferencia) montoTransferencia.value = "";

    cambiarMetodoPago("efectivo");

    notificacion(opciones.mensaje || "Venta registrada correctamente.");

    imprimirTicketVenta(venta);

    return venta;

}

function registrarVenta(){

    if(carrito.length === 0){

        notificacion("No hay productos en la venta.", "warning");

        return;

    }

    const total = totalCarrito();

    let pago = {
        efectivo: 0,
        transferencia: 0,
        tarjeta: 0
    };

    const esFiado = clienteSeleccionado && estadoVenta === "debe";

    // Si la venta se marca como "DEBE", no se registra plata cobrada
    // (ni efectivo ni transferencia/tarjeta): el dinero todavía no
    // entró a la caja, así que en los reportes no debe sumar como si
    // estuviera.
    if(esFiado){

        // pago queda en 0 a propósito

    }else if(metodoPago === "efectivo"){

        pago.efectivo = total;

    }else if(metodoPago === "transferencia"){

        // Con el Access Token de Mercado Pago configurado, "Registrar
        // venta" no carga la venta al toque: la deja esperando a que la
        // transferencia realmente impacte en la cuenta (ver
        // confirmarVentaPorTransferenciaMP). Sin token configurado sigue
        // funcionando como antes, al toque y de confianza.
        if(mpTransferenciasDisponible() && total > 0){

            iniciarEsperaTransferenciaMP(total, false);

            return;

        }

        pago.transferencia = total;

    }else if(metodoPago === "tarjeta"){

        pago.tarjeta = total;

    }else{

        pago.efectivo = Number(document.getElementById("montoEfectivo").value) || 0;

        const montoElectronico = Number(document.getElementById("montoTransferencia").value) || 0;
        const tipoElectronico = document.getElementById("tipoElectronicoMixto")?.value || "transferencia";

        pago[tipoElectronico] = montoElectronico;

        const suma = pago.efectivo + pago.transferencia + pago.tarjeta;

        if(Math.abs(suma - total) > 0.01){

            notificacion(

                "Los montos del pago mixto deben sumar " + dinero(total) + ".",

                "warning"

            );

            return;

        }

        if(tipoElectronico === "transferencia" && mpTransferenciasDisponible() && montoElectronico > 0){

            iniciarEsperaTransferenciaMP(montoElectronico, true);

            return;

        }

    }

    // El estado "debe" siempre queda registrado como método de pago
    // "debe", sin importar qué botón (efectivo/transferencia/tarjeta/
    // mixto) haya quedado seleccionado antes, para que se distinga
    // bien en el historial y no se cuente como plata cobrada en los
    // reportes.
    const metodoPagoFinal = (clienteSeleccionado && estadoVenta === "debe")
        ? "debe"
        : metodoPago;

    // El stock ya se descontó al cargar cada producto al carrito.
    finalizarVenta(metodoPagoFinal, pago);

}
