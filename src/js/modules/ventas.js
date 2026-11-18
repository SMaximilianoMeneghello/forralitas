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
                    <strong id="saldoClienteVenta">$0</strong>
                </div>

                <div class="estadoVenta">
                    <span>Estado</span>
                    <button id="btnPaga" class="estadoActivo">PAGA</button>
                    <button id="btnDebe">DEBE</button>
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
                <button id="modoBolsa" class="modoActivo">Bolsa</button>
                <button id="modoKg">Kg</button>
                <button id="modoDinero">$</button>
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

                <tbody id="tablaVenta"></tbody>

            </table>

        </div>

        <div class="pieVenta">

            <div class="totalVenta">
                <small>TOTAL</small>
                <h2 id="totalVenta">$0</h2>
            </div>

            <div class="formasPago">

                <button id="btnEfectivo" class="activo">Efectivo</button>
                <button id="btnTransferencia">Transferencia</button>
                <button id="btnMixto">Mixto</button>

                <div id="pagoMixto" class="pagoMixto">

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

            <button id="btnRegistrarVenta" class="btnGuardar">
                Registrar venta
            </button>

        </div>

    `;

    actualizarTablaVenta();
    actualizarClienteVentaUI();
    iniciarEventosVenta();

}

/* Llega un cambio de otra PC mientras se está vendiendo: se
   actualizan los datos sin tocar lo que el vendedor ya eligió
   (modo, forma de pago, PAGA/DEBE, montos escritos). */
function refrescarVentas(){

    if(!document.getElementById("tablaVenta")) return;

    actualizarTablaVenta();

    actualizarClienteVentaUI();

    const buscar = document.getElementById("buscarVenta");

    if(buscar && buscar.value.trim() !== "") buscarProductosVenta();

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

        const producto = productos.find(p => coincideProducto(p, texto));

        if(producto){

            seleccionarProductoVenta(producto.id);

        }else{

            notificacion("No se encontró el producto.", "warning");

        }

    });

    buscarCliente.addEventListener("input", buscarClientesVenta);

    buscarCliente.addEventListener("keydown", (e)=>{

        if(e.key !== "Enter") return;

        const texto = e.target.value.trim().toLowerCase();

        if(texto === "") return;

        const cliente = clientes.find(c => coincideCliente(c, texto));

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

function coincideProducto(p, texto){

    return (p.nombre || "").toLowerCase().includes(texto)
        || (p.id || "").toLowerCase().includes(texto);

}

function coincideCliente(c, texto){

    return (c.nombre || "").toLowerCase().includes(texto)
        || (c.telefono || "").toLowerCase().includes(texto);

}

function manejarEnterGlobalVenta(e){

    if(e.key !== "Enter") return;

    if(paginaActual !== "Ventas") return;

    if(!document.getElementById("btnRegistrarVenta")) return;

    // Si hay un modal abierto, lo maneja el modal.
    if(document.querySelector(".modal:not(.oculto)")) return;

    const activo = document.activeElement;

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

    const ids = { bolsa: "modoBolsa", kg: "modoKg", dinero: "modoDinero" };

    const boton = document.getElementById(ids[modo]);

    if(boton) boton.classList.add("modoActivo");

}

function cambiarMetodoPago(tipo){

    metodoPago = tipo;

    document.getElementById("btnEfectivo").classList.toggle("activo", tipo === "efectivo");
    document.getElementById("btnTransferencia").classList.toggle("activo", tipo === "transferencia");
    document.getElementById("btnMixto").classList.toggle("activo", tipo === "mixto");
    document.getElementById("pagoMixto").classList.toggle("activo", tipo === "mixto");

    if(tipo === "mixto"){

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

    document.getElementById("btnPaga").classList.toggle("estadoActivo", tipo === "paga");
    document.getElementById("btnDebe").classList.toggle("estadoActivo", tipo !== "paga");

}

/* ==========================================
   CLIENTES EN VENTA
========================================== */

function buscarClientesVenta(){

    const texto = document
        .getElementById("buscarClienteVenta")
        .value
        .trim()
        .toLowerCase();

    const lista = document.getElementById("listaClientesVenta");

    lista.innerHTML = "";

    if(texto === "") return;

    const encontrados = clientes.filter(c => coincideCliente(c, texto));

    if(encontrados.length === 0){

        lista.innerHTML = `
            <div class="itemBusquedaVacio">
                No se encontraron clientes.
            </div>
        `;

        return;

    }

    lista.innerHTML = encontrados.slice(0, 30).map(cliente => `
        <div
            class="itemBusquedaProducto"
            onclick="seleccionarClienteVenta('${esc(cliente.id)}')">
            <strong>${esc(cliente.nombre)}</strong>
            <br>
            <small>${esc(cliente.telefono || "Sin teléfono")}</small>
        </div>
    `).join("");

}

function seleccionarClienteVenta(id){

    clienteSeleccionado = clientes.find(c => c.id === id) || null;

    document.getElementById("buscarClienteVenta").value = "";
    document.getElementById("listaClientesVenta").innerHTML = "";

    actualizarClienteVentaUI();

    recalcularCarritoConPrecios();

}

function limpiarClienteVenta(){

    clienteSeleccionado = null;

    actualizarClienteVentaUI();

    cambiarEstadoVenta("paga");

    recalcularCarritoConPrecios();

}

function actualizarClienteVentaUI(){

    const contenedor = document.getElementById("clienteSeleccionadoVenta");
    const nombre = document.getElementById("nombreClienteSeleccionado");
    const saldo = document.getElementById("saldoClienteVenta");

    if(!contenedor || !nombre || !saldo) return;

    const saldoBox = document.querySelector(".saldoClienteVenta");
    const estado = document.querySelector(".estadoVenta");

    if(clienteSeleccionado){

        contenedor.classList.remove("oculto");

        if(saldoBox) saldoBox.style.display = "block";
        if(estado) estado.style.display = "flex";

        nombre.textContent = "👤 " + clienteSeleccionado.nombre;

        saldo.textContent = dinero(clienteSeleccionado.saldo || 0);

    }else{

        contenedor.classList.add("oculto");

        if(saldoBox) saldoBox.style.display = "none";
        if(estado) estado.style.display = "none";

        nombre.textContent = "";
        saldo.textContent = "$0";

    }

}

/* ==========================================
   PRECIOS
========================================= */

/* Precio que le corresponde a un cliente (si tiene un precio
   especial cargado para ese producto) o el precio de lista. */
function preciosProductoPara(producto, clienteId){

    let especial = null;

    if(clienteId){

        especial = obtenerTodosPreciosCliente().find(p =>
            p.clienteId === clienteId && p.productoId === producto.id
        ) || null;

    }

    const elegir = (propio, general) =>
        (propio !== undefined && propio !== null && Number(propio) > 0) ? Number(propio) : Number(general || 0);

    return {
        precioBolsa: elegir(especial ? especial.precioBolsa : null, producto.precioBolsa),
        precioKg: elegir(especial ? especial.precioKg : null, producto.precioKg)
    };

}

function obtenerPreciosProducto(producto){

    return preciosProductoPara(producto, clienteSeleccionado ? clienteSeleccionado.id : null);

}

/* Calcula una línea de venta. "precios" = { precioBolsa, precioKg }
   y "pesoBolsa" = kilos que trae una bolsa del producto. */
function calcularLinea(precios, pesoBolsa, cantidad, modo){

    const peso = Number(pesoBolsa || 0);

    let precio = 0;
    let subtotal = 0;
    let bolsas = 0;
    let kg = 0;

    if(modo === "bolsa"){

        precio = precios.precioBolsa;
        subtotal = cantidad * precios.precioBolsa;
        bolsas = cantidad;
        kg = cantidad * peso;

    }else if(modo === "kg"){

        precio = precios.precioKg;
        subtotal = cantidad * precios.precioKg;
        bolsas = peso > 0 ? cantidad / peso : 0;
        kg = cantidad;

    }else{

        // Modo dinero: se ingresa el monto y se calculan los kg a pesar.
        precio = precios.precioKg;
        subtotal = cantidad;
        kg = precios.precioKg > 0 ? cantidad / precios.precioKg : 0;
        bolsas = peso > 0 ? kg / peso : 0;

    }

    return {
        precio: Number(precio || 0),
        subtotal: redondear(subtotal, 2),
        bolsas: redondear(bolsas),
        kg: redondear(kg)
    };

}

function calcularLineaVenta(producto, cantidad, modo){

    return calcularLinea(obtenerPreciosProducto(producto), producto.pesoBolsa, cantidad, modo);

}

function formatearCantidadItem(item){

    if(item.modo === "dinero"){

        return Number(item.kg || 0).toFixed(2);

    }

    const valor = Number(item.cantidad);

    if(Number.isInteger(valor)) return valor;

    return valor.toFixed(2);

}

/* Al elegir o quitar el cliente, los productos ya cargados pasan
   a tener el precio que le corresponde (lista o especial). */
function recalcularCarritoConPrecios(){

    let cambio = false;

    carrito.forEach(item =>{

        const producto = productos.find(p => p.id === item.id);

        if(!producto) return;

        const linea = calcularLineaVenta(producto, item.cantidad, item.modo);

        // En modo "$" el monto no cambia, pero sí los kilos a pesar:
        // se ajusta el stock por la diferencia.
        const diferenciaBolsas = redondear(linea.bolsas - Number(item.bolsas || 0));

        if(diferenciaBolsas !== 0){

            producto.stock = redondear(Number(producto.stock || 0) - diferenciaBolsas);

        }

        if(linea.precio !== item.precio || linea.subtotal !== item.subtotal || diferenciaBolsas !== 0){

            item.precio = linea.precio;
            item.subtotal = linea.subtotal;
            item.bolsas = linea.bolsas;
            item.kg = linea.kg;

            cambio = true;

        }

    });

    if(cambio){

        guardarDatos("productos");

        actualizarTablaVenta();

    }

}

/* ==========================================
   TABLA VENTA
========================================= */

function actualizarTablaVenta(){

    const tbody = document.getElementById("tablaVenta");

    if(!tbody) return;

    let total = 0;

    if(carrito.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="tablaVacia">
                    Agregá productos para iniciar la venta.
                </td>
            </tr>
        `;

    }else{

        tbody.innerHTML = carrito.map((item, indice)=>{

            total += item.subtotal;

            return `
                <tr>
                    <td>${esc(item.nombre)}</td>
                    <td>${formatearCantidadItem(item)}</td>
                    <td>${unidadVenta(item.modo)}</td>
                    <td>${dinero(item.precio)}</td>
                    <td>${dinero(item.subtotal)}</td>
                    <td>
                        <button
                            class="btnEliminar"
                            title="Quitar de la venta"
                            onclick="eliminarProductoVenta(${indice})">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;

        }).join("");

    }

    const totalEl = document.getElementById("totalVenta");

    if(totalEl){

        totalEl.textContent = dinero(total);

    }

}

function eliminarProductoVenta(indice){

    const item = carrito[indice];

    if(!item) return;

    const quitar = ()=>{

        // Se devuelve el stock que se había descontado al cargarlo.
        const producto = productos.find(p => p.id === item.id);

        if(producto){

            producto.stock = redondear(Number(producto.stock || 0) + Number(item.bolsas || 0));

        }

        carrito = carrito.filter(x => x !== item);

        guardarDatos("productos");

        actualizarTablaVenta();

    };

    if(configuracionSistema.ventas.confirmarEliminar){

        confirmar("¿Quitar " + item.nombre + " de la venta?", quitar);

    }else{

        quitar();

    }

}

function stockMinimoDe(producto){

    const propio = Number(producto.stockMinimo || 0);

    if(propio > 0) return propio;

    return Number(configuracionSistema.inventario.stockMinimo || 0);

}

function notificarStockBajo(producto){

    if(!configuracionSistema.inventario.alertas) return;

    const minimo = stockMinimoDe(producto);

    if(Number(producto.stock || 0) <= minimo){

        notificacion(
            "⚠ Stock bajo de " + producto.nombre + ": quedan "
            + formatearStock(producto.stock) + " bolsas (mínimo "
            + minimo + ").",
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
        .trim()
        .toLowerCase();

    const lista = document.getElementById("listaProductosVenta");

    lista.innerHTML = "";

    if(texto === "") return;

    const encontrados = productos.filter(p => coincideProducto(p, texto));

    if(encontrados.length === 0){

        lista.innerHTML = `
            <div class="itemBusquedaVacio">
                No se encontraron productos.
            </div>
        `;

        return;

    }

    lista.innerHTML = encontrados.slice(0, 40).map(producto=>{

        const precios = obtenerPreciosProducto(producto);

        return `
            <div
                class="itemBusquedaProducto"
                onclick="seleccionarProductoVenta('${esc(producto.id)}')">
                <strong>${esc(producto.nombre)}</strong>
                <br>
                <small>
                    Stock: ${formatearStock(producto.stock)}
                    • Bolsa: ${dinero(precios.precioBolsa)}
                    • Kg: ${dinero(precios.precioKg)}
                </small>
            </div>
        `;

    }).join("");

}

function seleccionarProductoVenta(id){

    agregarProductoVenta(id);

}

function agregarProductoVenta(id){

    productoVenta = productos.find(p => p.id === id);

    if(!productoVenta) return;

    if(Number(productoVenta.stock || 0) <= 0){

        notificacion("Sin stock para " + productoVenta.nombre, "warning");

        productoVenta = null;

        return;

    }

    const precios = obtenerPreciosProducto(productoVenta);

    if(modoVenta === "bolsa" && !(precios.precioBolsa > 0)){

        notificacion(productoVenta.nombre + " no tiene precio por bolsa cargado.", "warning");

        productoVenta = null;

        return;

    }

    if(modoVenta !== "bolsa" && !(precios.precioKg > 0)){

        notificacion(productoVenta.nombre + " no tiene precio por kilo cargado.", "warning");

        productoVenta = null;

        return;

    }

    document.getElementById("buscarVenta").value = "";
    document.getElementById("listaProductosVenta").innerHTML = "";

    const input = document.getElementById("inputCantidad");

    input.value = "";

    const ayudas = {
        bolsa: "Cantidad de bolsas",
        kg: "Cantidad de kilos",
        dinero: "Monto en pesos"
    };

    input.placeholder = ayudas[modoVenta];

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

    const monto = numeroDe("inputCantidad");

    const precios = obtenerPreciosProducto(productoVenta);

    if(!monto || monto <= 0 || !(precios.precioKg > 0)){

        preview.textContent = "";

        return;

    }

    const kg = monto / precios.precioKg;

    preview.textContent = "≈ " + kg.toFixed(2) + " kg para pesar";

}

function confirmarCantidad(){

    // Se vuelve a buscar el producto: si mientras estaba abierto el
    // cuadro llegó un cambio de otra PC, la lista se reemplazó y hay que
    // descontar el stock sobre el registro actual (si no, se perdía).
    if(productoVenta) productoVenta = productos.find(p => p.id === productoVenta.id) || null;

    if(!productoVenta){

        notificacion("Seleccioná un producto.", "warning");

        return;

    }

    const cantidad = numeroDe("inputCantidad");

    if(!cantidad || cantidad <= 0){

        notificacion("Ingrese una cantidad válida.", "warning");

        return;

    }

    const linea = calcularLineaVenta(productoVenta, cantidad, modoVenta);

    if(linea.bolsas > Number(productoVenta.stock || 0) + 0.0001){

        notificacion(
            "Stock insuficiente. Disponible: " + formatearStock(productoVenta.stock) + " bolsas.",
            "error"
        );

        return;

    }

    // Se descuenta el stock automáticamente al cargar el producto al carrito.
    productoVenta.stock = redondear(Number(productoVenta.stock || 0) - linea.bolsas);

    const existente = carrito.find(item =>
        item.id === productoVenta.id && item.modo === modoVenta
    );

    if(existente){

        existente.cantidad = redondear(existente.cantidad + cantidad);

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

    guardarDatos("productos");

    const productoAfectado = productoVenta;

    cerrarModalCantidad();
    actualizarTablaVenta();

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

function siguienteNumeroVenta(){

    let mayor = 0;

    historialVentas.forEach(v =>{

        if(Number(v.numero) > mayor) mayor = Number(v.numero);

    });

    return Math.max(mayor, historialVentas.length) + 1;

}

function registrarVenta(){

    if(carrito.length === 0){

        notificacion("No hay productos en la venta.", "warning");

        return;

    }

    const esDebe = !!clienteSeleccionado && estadoVenta === "debe";

    const total = redondear(carrito.reduce((acc, item) => acc + Number(item.subtotal || 0), 0), 2);

    const pago = { efectivo: 0, transferencia: 0 };

    // Si la venta se marca como "DEBE", no se registra plata cobrada
    // (ni efectivo ni transferencia): el dinero todavía no entró a la
    // caja, así que en los reportes no debe sumar como si estuviera.
    if(esDebe){

        // pago queda en 0/0 a propósito

    }else if(metodoPago === "efectivo"){

        pago.efectivo = total;

    }else if(metodoPago === "transferencia"){

        pago.transferencia = total;

    }else{

        pago.efectivo = numeroDe("montoEfectivo");
        pago.transferencia = numeroDe("montoTransferencia");

        if(Math.abs(pago.efectivo + pago.transferencia - total) > 0.01){

            notificacion(
                "Los montos del pago mixto deben sumar " + dinero(total) + ".",
                "warning"
            );

            return;

        }

    }

    if(configuracionSistema.ventas.confirmarVenta && !registrarVenta.confirmada){

        confirmar("¿Registrar la venta por " + dinero(total) + (esDebe ? " como DEBE" : "") + "?", ()=>{

            registrarVenta.confirmada = true;

            try{ registrarVenta(); }finally{ registrarVenta.confirmada = false; }

        });

        return;

    }

    const ahora = new Date();

    // Cada producto guarda también cuánto hay que "separar" y cuánto
    // costó, para que los reportes viejos no cambien si después se
    // modifica el producto.
    const items = carrito.map(item =>{

        const copia = { ...item };

        const producto = productos.find(p => p.id === item.id);

        if(producto){

            if(Number(producto.separarPorBolsa) > 0){

                copia.separar = Number(producto.separarPorBolsa);
                copia.grupoSeparar = producto.grupoSeparar || producto.nombre;

            }

            if(Number(producto.costoBolsa) > 0) copia.costo = Number(producto.costoBolsa);

        }

        return copia;

    });

    const venta = {

        id: nuevoId("V"),

        numero: siguienteNumeroVenta(),

        fecha: ahora.toISOString(),

        fechaTexto: fechaHoraTexto(ahora),

        cliente: clienteSeleccionado
            ? { id: clienteSeleccionado.id, nombre: clienteSeleccionado.nombre }
            : null,

        vendedor: usuarioActual
            ? { usuario: usuarioActual.usuario, nombre: usuarioActual.nombre }
            : null,

        productos: items,

        total,

        // El estado "debe" siempre queda registrado como método de pago
        // "debe", sin importar qué botón (efectivo/transferencia/mixto)
        // haya quedado seleccionado antes.
        metodoPago: esDebe ? "debe" : metodoPago,

        pago,

        // Solo las ventas "debe" llevan seguimiento de saldo pendiente.
        saldoPendiente: esDebe ? total : 0,

        pagada: !esDebe

    };

    historialVentas.unshift(venta);

    if(esDebe){

        const cliente = clientes.find(c => c.id === clienteSeleccionado.id);

        if(cliente){

            cliente.saldo = redondear(Number(cliente.saldo || 0) + total, 2);

        }

    }

    carrito = [];
    clienteSeleccionado = null;

    guardarDatos("historialVentas", "clientes");

    actualizarTablaVenta();
    actualizarClienteVentaUI();

    limpiar("montoEfectivo", "montoTransferencia");

    cambiarMetodoPago("efectivo");
    cambiarEstadoVenta("paga");

    notificacion("Venta N.º " + venta.numero + " registrada correctamente.");

    if(configuracionSistema.ventas.sonidoVenta) reproducirSonidoVenta();

    enviarAvisoGalpon(venta);

    if(configuracionSistema.ventas.imprimirAlVender) imprimirComprobanteVenta(venta.id);

    enfocarBuscadorVenta();

}

/* ==========================================
   AVISO A LA PANTALLA DEL GALPÓN
   (pantalla-galpon/index.html muestra en una
   tele qué hay que preparar para cada venta)
========================================== */

function enviarAvisoGalpon(venta){

    if(!adaptadorActual || !configuracionSistema.ventas.avisoGalpon) return;

    const items = (venta.productos || []).map(item =>{

        if(item.modo === "bolsa"){

            return formatearCantidadItem(item) + (Number(item.cantidad) === 1 ? " bolsa" : " bolsas") + " · " + item.nombre;

        }

        return Number(item.kg || 0).toFixed(2) + " kg · " + item.nombre;

    });

    adaptadorActual.escribir("avisoGalpon", {
        datos: {
            numero: venta.numero,
            items,
            hora: venta.fechaTexto.slice(-5),
            id: venta.id
        },
        actualizado: Date.now()
    }).catch(e => console.warn("[Galpón] No se pudo enviar el aviso:", e && e.message));

}
