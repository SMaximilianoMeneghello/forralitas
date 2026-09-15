/* ==========================================
   VENTAS
========================================== */

let modoVenta = "bolsa";
let metodoPago = "efectivo";
let productoVenta = null;

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

                    Transferencia

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
                            oninput="limpiarNumero(this)">

                    </div>

                    <div>

                        <label>Transferencia</label>

                        <input
                            id="montoTransferencia"
                            type="text"
                            inputmode="decimal"
                            autocomplete="off"
                            oninput="limpiarNumero(this)">

                    </div>

                </div>

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

        if(e.key !== "Enter") return;

        e.preventDefault();

        const texto = e.target.value.trim().toLowerCase();

        // Buscador vacío: se registra la venta directamente.
        if(texto === ""){

            registrarVenta();

            return;

        }

        const producto = productos.find(p=>

            p.nombre.toLowerCase().includes(texto)

            || (p.id || "").toLowerCase().includes(texto)

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
    document.getElementById("btnMixto").classList.remove("activo");
    document.getElementById("pagoMixto").classList.remove("activo");

    if(tipo === "efectivo"){

        document.getElementById("btnEfectivo").classList.add("activo");

    }

    if(tipo === "transferencia"){

        document.getElementById("btnTransferencia").classList.add("activo");

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

}

function limpiarClienteVenta(){

    clienteSeleccionado = null;
    actualizarClienteVentaUI();

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
        precioBolsa: especial?.precioBolsa ?? producto.precioBolsa,
        precioKg: especial?.precioKg ?? producto.precioKg
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

    guardarDatos();

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

    const texto = document
        .getElementById("buscarVenta")
        .value
        .toLowerCase();

    const lista = document.getElementById("listaProductosVenta");

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

        const precios = obtenerPreciosProducto(producto);

        lista.innerHTML += `

            <div
                class="itemBusquedaProducto"
                onclick="seleccionarProductoVenta('${producto.id}')">

                <strong>${producto.nombre}</strong>

                <br>

                <small>

                    ${producto.id}

                    • Stock: ${formatearStock(producto.stock)}

                    • Bolsa: ${dinero(precios.precioBolsa)}

                </small>

            </div>

        `;

    });

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

    guardarDatos();

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
   REGISTRAR VENTA
========================================= */

function registrarVenta(){

    if(carrito.length === 0){

        notificacion("No hay productos en la venta.", "warning");

        return;

    }

    let total = 0;

    carrito.forEach(item => total += item.subtotal);

    let pago = {
        efectivo: 0,
        transferencia: 0
    };

    // Si la venta se marca como "DEBE", no se registra plata cobrada
    // (ni efectivo ni transferencia): el dinero todavía no entró a la
    // caja, así que en los reportes no debe sumar como si estuviera.
    if(clienteSeleccionado && estadoVenta === "debe"){

        // pago queda en 0/0 a propósito

    }else if(metodoPago === "efectivo"){

        pago.efectivo = total;

    }else if(metodoPago === "transferencia"){

        pago.transferencia = total;

    }else{

        pago.efectivo = Number(document.getElementById("montoEfectivo").value) || 0;
        pago.transferencia = Number(document.getElementById("montoTransferencia").value) || 0;

        const suma = pago.efectivo + pago.transferencia;

        if(Math.abs(suma - total) > 0.01){

            notificacion(

                "Los montos del pago mixto deben sumar " + dinero(total) + ".",

                "warning"

            );

            return;

        }

    }

    // El estado "debe" siempre queda registrado como método de pago
    // "debe", sin importar qué botón (efectivo/transferencia/mixto)
    // haya quedado seleccionado antes, para que se distinga bien en
    // el historial y no se cuente como plata cobrada en los reportes.
    const metodoPagoFinal = (clienteSeleccionado && estadoVenta === "debe")
        ? "debe"
        : metodoPago;

    // El stock ya se descontó al cargar cada producto al carrito.

    historialVentas.unshift({

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

    });

  if(clienteSeleccionado && estadoVenta === "debe"){

    const cliente = clientes.find(c => c.id === clienteSeleccionado.id);

    if(cliente){

        cliente.saldo = Number(cliente.saldo || 0) + total;

        clienteSeleccionado.saldo = cliente.saldo;

    }

}

    carrito = [];
    clienteSeleccionado = null;

    guardarDatos();
    actualizarTablaVenta();
    actualizarClienteVentaUI();

    const montoEfectivo = document.getElementById("montoEfectivo");
    const montoTransferencia = document.getElementById("montoTransferencia");

    if(montoEfectivo) montoEfectivo.value = "";
    if(montoTransferencia) montoTransferencia.value = "";

    cambiarMetodoPago("efectivo");

    notificacion("Venta registrada correctamente.");

}
