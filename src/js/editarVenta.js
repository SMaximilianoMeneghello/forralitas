/* ==========================================
   EDITAR UNA VENTA (SOLO ADMINISTRADOR)
   ------------------------------------------
   Desde el Historial, el botón ✏️ abre la
   venta para corregirla: fecha, cliente,
   productos, cantidades, precios y forma de
   pago. Al guardar:
   - el stock se ajusta según lo que cambió;
   - el saldo del cliente se ajusta si la
     venta es o deja de ser fiada (DEBE);
   - los pagos que el cliente ya hizo de esa
     venta se respetan.
   Nada cambia hasta apretar "Guardar cambios".
========================================== */

let ventaEditando = null;

function evEsc(valor){

    return String(valor === null || valor === undefined ? "" : valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}

function evNumero(id){

    const el = document.getElementById(id);

    return el ? (Number(String(el.value).replace(",", ".")) || 0) : 0;

}

function evRedondear(n, decimales = 4){

    const f = Math.pow(10, decimales);

    return Math.round((Number(n) || 0) * f) / f;

}

function evFechaInput(fecha){

    const d = new Date(fecha);

    if(isNaN(d.getTime())) return "";

    return fechaLocalISO(d) + "T"
        + String(d.getHours()).padStart(2, "0") + ":"
        + String(d.getMinutes()).padStart(2, "0");

}

/* ---------- Modal (se crea una sola vez) ---------- */

function evCrearModal(){

    if(document.getElementById("modalEditarVenta")) return;

    const div = document.createElement("div");

    div.id = "modalEditarVenta";
    div.className = "modal oculto";

    div.innerHTML = `
        <div class="modalContenido modalEditarVentaContenido">

            <h2 id="tituloEditarVenta">Editar venta</h2>

            <div class="evFila">
                <div class="grupoInput">
                    <label>Fecha y hora</label>
                    <input id="evFecha" type="datetime-local">
                </div>
                <div class="grupoInput">
                    <label>Cliente</label>
                    <select id="evCliente"></select>
                </div>
            </div>

            <div class="evTabla">
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio</th>
                            <th>Subtotal</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="evItems"></tbody>
                </table>
            </div>

            <div class="evAgregar">
                <select id="evProducto"></select>
                <select id="evModo">
                    <option value="bolsa">Bolsas</option>
                    <option value="kg">Kg</option>
                    <option value="dinero">$ (monto)</option>
                </select>
                <input id="evCantidad" type="text" inputmode="decimal" autocomplete="off" placeholder="Cantidad" oninput="limpiarNumero(this)">
                <button type="button" class="btnCancelar" id="evBtnAgregar">+ Agregar</button>
            </div>

            <div class="evTotal">TOTAL: <strong id="evTotal">$0</strong></div>

            <div class="evFila">
                <div class="grupoInput">
                    <label>Forma de pago</label>
                    <select id="evMetodo">
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="mixto">Mixto</option>
                        <option value="debe">DEBE (fiado)</option>
                    </select>
                </div>
                <div class="grupoInput oculto" id="evMixto">
                    <label>Efectivo / Transferencia / Tarjeta</label>
                    <div class="evTresCampos">
                        <input id="evEfectivo" type="text" inputmode="decimal" autocomplete="off" placeholder="Efectivo" oninput="limpiarNumero(this)">
                        <input id="evTransferencia" type="text" inputmode="decimal" autocomplete="off" placeholder="Transf." oninput="limpiarNumero(this)">
                        <input id="evTarjeta" type="text" inputmode="decimal" autocomplete="off" placeholder="Tarjeta" oninput="limpiarNumero(this)">
                    </div>
                </div>
            </div>

            <p id="evNota" class="evNota"></p>

            <label class="evCheck">
                <input id="evAjustarStock" type="checkbox" checked>
                Ajustar el stock según los cambios de productos y cantidades
            </label>

            <div class="accionesModal">
                <button id="evGuardar" class="btnGuardar">Guardar cambios</button>
                <button id="evCancelar" class="btnCancelar">Cancelar</button>
            </div>

        </div>
    `;

    // Va antes del cuadro de confirmación, así ese aviso queda por encima
    // de la ventana de edición y se puede tocar "Aceptar".
    const confirmacion = document.getElementById("modalConfirmacion");

    if(confirmacion && confirmacion.parentNode === document.body) document.body.insertBefore(div, confirmacion);
    else document.body.appendChild(div);

    document.getElementById("evCancelar").onclick = () =>{ cerrar("modalEditarVenta"); ventaEditando = null; };
    document.getElementById("evGuardar").onclick = guardarVentaEditada;
    document.getElementById("evBtnAgregar").onclick = evAgregarItem;
    document.getElementById("evMetodo").onchange = evActualizarPago;
    document.getElementById("evCliente").onchange = evActualizarPago;

}

/* ---------- Datos de la venta ---------- */

function evPagosDeVenta(venta){

    if(!venta || !venta.cliente) return [];

    const cliente = clientes.find(c => c.id === venta.cliente.id);

    if(!cliente) return [];

    return (cliente.pagos || []).filter(p => p.ventaId === venta.id);

}

function evPendiente(venta){

    if(!venta || venta.metodoPago !== "debe") return 0;

    const p = pendienteVenta(venta);

    return p > 0.01 ? p : 0;

}

function evAjustarStock(venta, signo){

    (venta.productos || []).forEach(item =>{

        const producto = productos.find(p => p.id === item.id);

        if(producto){

            producto.stock = evRedondear(Number(producto.stock || 0) + signo * Number(item.bolsas || 0));

        }

    });

}

function evPesoBolsa(item){

    const producto = productos.find(p => p.id === item.id);

    if(producto && Number(producto.pesoBolsa) > 0) return Number(producto.pesoBolsa);

    if(Number(item.bolsas) > 0 && Number(item.kg) > 0) return Number(item.kg) / Number(item.bolsas);

    return 0;

}

function evRecalcularItem(item){

    const cantidad = Number(item.cantidad || 0);
    const precio = Number(item.precio || 0);
    const peso = evPesoBolsa(item);

    if(item.modo === "bolsa"){

        item.subtotal = evRedondear(cantidad * precio, 2);
        item.bolsas = cantidad;
        item.kg = evRedondear(cantidad * peso);

    }else if(item.modo === "kg"){

        item.subtotal = evRedondear(cantidad * precio, 2);
        item.kg = cantidad;
        item.bolsas = peso > 0 ? evRedondear(cantidad / peso) : 0;

    }else{

        // Modo $: la cantidad es el monto; los kilos salen del precio por kg.
        item.subtotal = evRedondear(cantidad, 2);
        item.kg = precio > 0 ? evRedondear(cantidad / precio) : 0;
        item.bolsas = peso > 0 ? evRedondear(item.kg / peso) : 0;

    }

}

function evTotal(){

    return evRedondear((ventaEditando.productos || []).reduce((acc, i) => acc + Number(i.subtotal || 0), 0), 2);

}

/* ---------- Abrir ---------- */

function editarVenta(id){

    if(!esAdmin()){

        notificacion("Solo el administrador puede editar ventas.", "warning");

        return;

    }

    const venta = historialVentas.find(v => v.id === id);

    if(!venta) return;

    evCrearModal();

    ventaEditando = JSON.parse(JSON.stringify(venta));

    if(!Array.isArray(ventaEditando.productos)) ventaEditando.productos = [];

    document.getElementById("tituloEditarVenta").textContent = "Editar venta del " + (venta.fechaTexto || "");

    document.getElementById("evFecha").value = evFechaInput(venta.fecha);

    const idCliente = venta.cliente ? venta.cliente.id : "";

    let opciones = `<option value="">Consumidor Final</option>`;

    [...clientes]
        .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
        .forEach(c =>{ opciones += `<option value="${evEsc(c.id)}">${evEsc(c.nombre)}</option>`; });

    if(idCliente && !clientes.some(c => c.id === idCliente)){

        opciones += `<option value="${evEsc(idCliente)}">${evEsc(venta.cliente.nombre)} (eliminado)</option>`;

    }

    const selCliente = document.getElementById("evCliente");

    selCliente.innerHTML = opciones;
    selCliente.value = idCliente;

    const metodo = ["efectivo", "transferencia", "tarjeta", "mixto", "debe"].includes(venta.metodoPago)
        ? venta.metodoPago
        : "efectivo";

    document.getElementById("evMetodo").value = metodo;

    const pago = venta.pago || {};

    document.getElementById("evEfectivo").value = pago.efectivo || "";
    document.getElementById("evTransferencia").value = pago.transferencia || "";
    document.getElementById("evTarjeta").value = pago.tarjeta || "";

    document.getElementById("evAjustarStock").checked = true;

    document.getElementById("evProducto").innerHTML =
        `<option value="">Elegir producto para agregar…</option>`
        + [...productos]
            .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
            .map(p => `<option value="${evEsc(p.id)}">${evEsc(p.nombre)}</option>`)
            .join("");

    document.getElementById("evModo").value = "bolsa";
    document.getElementById("evCantidad").value = "";

    evDibujarItems();

    abrir("modalEditarVenta");

}

/* ---------- Productos de la venta ---------- */

function evDibujarItems(){

    const tbody = document.getElementById("evItems");

    const unidad = { bolsa: "bolsas", kg: "kg", dinero: "$ (monto)" };

    if(ventaEditando.productos.length === 0){

        tbody.innerHTML = `<tr><td colspan="5" class="tablaVacia">La venta no tiene productos: agregá al menos uno.</td></tr>`;

    }else{

        tbody.innerHTML = ventaEditando.productos.map((item, i) => `
            <tr>
                <td>
                    ${evEsc(item.nombre)}
                    ${item.modo === "dinero" ? `<br><small>≈ ${Number(item.kg || 0).toFixed(2)} kg</small>` : ""}
                </td>
                <td>
                    <input type="text" inputmode="decimal" autocomplete="off" class="evInputChico"
                        value="${evEsc(item.cantidad)}"
                        oninput="limpiarNumero(this)"
                        onchange="evCambiarItem(${i}, 'cantidad', this.value)">
                    <small>${unidad[item.modo] || ""}</small>
                </td>
                <td>
                    <input type="text" inputmode="decimal" autocomplete="off" class="evInputChico"
                        value="${evEsc(item.precio)}"
                        oninput="limpiarNumero(this)"
                        onchange="evCambiarItem(${i}, 'precio', this.value)">
                    <small>${item.modo === "bolsa" ? "por bolsa" : "por kg"}</small>
                </td>
                <td><strong>${dinero(item.subtotal)}</strong></td>
                <td>
                    <button class="btnEliminarVenta" title="Quitar producto" onclick="evQuitarItem(${i})">🗑️</button>
                </td>
            </tr>
        `).join("");

    }

    document.getElementById("evTotal").textContent = dinero(evTotal());

    evActualizarPago();

}

function evCambiarItem(indice, campo, valor){

    const item = ventaEditando.productos[indice];

    if(!item) return;

    item[campo] = Number(String(valor).replace(",", ".")) || 0;

    evRecalcularItem(item);

    evDibujarItems();

}

function evQuitarItem(indice){

    ventaEditando.productos.splice(indice, 1);

    evDibujarItems();

}

function evAgregarItem(){

    const producto = productos.find(p => p.id === document.getElementById("evProducto").value);

    const modo = document.getElementById("evModo").value;

    const cantidad = evNumero("evCantidad");

    if(!producto){

        notificacion("Elegí un producto para agregar.", "warning");

        return;

    }

    if(cantidad <= 0){

        notificacion("Ingresá la cantidad.", "warning");

        return;

    }

    // Precio del cliente elegido (si tiene uno especial) o el de lista.
    const clienteId = document.getElementById("evCliente").value;

    const especial = clienteId
        ? obtenerTodosPreciosCliente().find(p => p.clienteId === clienteId && p.productoId === producto.id)
        : null;

    const precioBolsa = especial?.precioBolsa ?? producto.precioBolsa;
    const precioKg = especial?.precioKg ?? producto.precioKg;

    const item = {
        id: producto.id,
        nombre: producto.nombre,
        cantidad,
        precio: Number(modo === "bolsa" ? precioBolsa : precioKg) || 0,
        modo
    };

    evRecalcularItem(item);

    ventaEditando.productos.push(item);

    document.getElementById("evCantidad").value = "";

    evDibujarItems();

}

/* ---------- Forma de pago ---------- */

function evActualizarPago(){

    const metodo = document.getElementById("evMetodo").value;

    document.getElementById("evMixto").classList.toggle("oculto", metodo !== "mixto");

    const nota = document.getElementById("evNota");

    const original = historialVentas.find(v => v.id === ventaEditando.id);

    const pagos = original ? evPagosDeVenta(original) : [];

    const pagado = pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0);

    const clienteId = document.getElementById("evCliente").value;

    const mismoCliente = !!(original && original.cliente && original.cliente.id === clienteId);

    if(metodo === "debe" && !clienteId){

        nota.textContent = "Para dejarla como DEBE hay que elegir un cliente.";

    }else if(pagos.length && (metodo !== "debe" || !mismoCliente)){

        nota.textContent = "Esta venta tiene " + pagos.length + " pago(s) del cliente por " + dinero(pagado)
            + ". Con este cambio esos pagos se eliminan.";

    }else if(metodo === "debe"){

        const queda = Math.max(0, evTotal() - (mismoCliente ? pagado : 0));

        nota.textContent = (mismoCliente && pagado > 0 ? "Ya pagó " + dinero(pagado) + ". " : "")
            + "Queda debiendo " + dinero(queda) + ".";

    }else{

        nota.textContent = "";

    }

}

/* ---------- Guardar ---------- */

function guardarVentaEditada(){

    if(!esAdmin() || !ventaEditando) return;

    const original = historialVentas.find(v => v.id === ventaEditando.id);

    if(!original){

        notificacion("Esa venta ya no existe (la eliminaron desde otra computadora).", "error");

        cerrar("modalEditarVenta");

        return;

    }

    const items = ventaEditando.productos;

    if(items.length === 0){

        notificacion("La venta tiene que tener al menos un producto. Si querés anularla, eliminala con 🗑️.", "warning");

        return;

    }

    if(items.some(i => !(Number(i.cantidad) > 0))){

        notificacion("Hay productos con cantidad en cero.", "warning");

        return;

    }

    const fechaValor = document.getElementById("evFecha").value;

    const fecha = fechaValor ? new Date(fechaValor) : new Date(original.fecha);

    if(isNaN(fecha.getTime())){

        notificacion("La fecha no es válida.", "warning");

        return;

    }

    const metodo = document.getElementById("evMetodo").value;
    const clienteId = document.getElementById("evCliente").value;
    const ajustarStock = document.getElementById("evAjustarStock").checked;

    const total = evTotal();

    const clienteNuevo = clienteId ? clientes.find(c => c.id === clienteId) : null;

    if(metodo === "debe" && !clienteNuevo){

        notificacion("Para dejarla como DEBE hay que elegir un cliente.", "warning");

        return;

    }

    const pago = { efectivo: 0, transferencia: 0, tarjeta: 0 };

    if(metodo === "efectivo") pago.efectivo = total;
    if(metodo === "transferencia") pago.transferencia = total;
    if(metodo === "tarjeta") pago.tarjeta = total;

    if(metodo === "mixto"){

        pago.efectivo = evNumero("evEfectivo");
        pago.transferencia = evNumero("evTransferencia");
        pago.tarjeta = evNumero("evTarjeta");

        if(Math.abs(pago.efectivo + pago.transferencia + pago.tarjeta - total) > 0.01){

            notificacion("Los montos del pago mixto deben sumar " + dinero(total) + ".", "warning");

            return;

        }

    }

    const pagosPrevios = evPagosDeVenta(original);

    const mismoCliente = !!original.cliente && original.cliente.id === clienteId;

    const conservaPagos = metodo === "debe" && mismoCliente;

    const pagado = conservaPagos
        ? pagosPrevios.reduce((acc, p) => acc + Number(p.monto || 0), 0)
        : 0;

    if(conservaPagos && pagado > total + 0.01){

        notificacion(
            "El cliente ya pagó " + dinero(pagado) + " de esta venta: el total no puede quedar por debajo de eso.",
            "warning"
        );

        return;

    }

    const aplicar = () =>{

        // 1) Se deshace lo que había provocado la venta original.
        if(ajustarStock) evAjustarStock(original, +1);

        const clienteViejo = original.cliente ? clientes.find(c => c.id === original.cliente.id) : null;

        if(clienteViejo){

            const pendienteViejo = evPendiente(original);

            if(pendienteViejo > 0){

                clienteViejo.saldo = evRedondear(Math.max(0, Number(clienteViejo.saldo || 0) - pendienteViejo), 2);

            }

            if(!conservaPagos && pagosPrevios.length){

                clienteViejo.pagos = (clienteViejo.pagos || []).filter(p => p.ventaId !== original.id);

            }

        }

        // 2) Se aplican los datos nuevos.
        original.fecha = fecha.toISOString();
        original.fechaTexto = fechaHoraTexto(fecha);

        original.cliente = clienteNuevo
            ? { id: clienteNuevo.id, nombre: clienteNuevo.nombre }
            : (clienteId && original.cliente && original.cliente.id === clienteId ? original.cliente : null);

        original.productos = JSON.parse(JSON.stringify(items));
        original.total = total;
        original.metodoPago = metodo;
        original.pago = pago;

        if(metodo === "debe"){

            original.saldoPendiente = evRedondear(Math.max(0, total - pagado), 2);
            original.pagada = original.saldoPendiente <= 0.01;

            clienteNuevo.saldo = evRedondear(Number(clienteNuevo.saldo || 0) + original.saldoPendiente, 2);

            (clienteNuevo.pagos || []).forEach(p =>{

                if(p.ventaId === original.id) p.ventaFechaTexto = original.fechaTexto;

            });

        }else{

            original.saldoPendiente = 0;
            original.pagada = true;

        }

        original.editada = {
            por: usuarioActual ? usuarioActual.nombre : "",
            fecha: new Date().toISOString(),
            fechaTexto: fechaHoraTexto(new Date())
        };

        if(ajustarStock) evAjustarStock(original, -1);

        guardarDatos("historialVentas", "productos", "clientes");

        cerrar("modalEditarVenta");

        ventaEditando = null;

        evRefrescarPantallas();

        notificacion("Venta actualizada.");

    };

    if(!conservaPagos && pagosPrevios.length){

        confirmar(
            "Esta venta tiene " + pagosPrevios.length + " pago(s) del cliente que se van a eliminar con este cambio. ¿Continuar?",
            aplicar
        );

    }else{

        aplicar();

    }

}

function evRefrescarPantallas(){

    if(paginaActual === "Historial" && document.getElementById("listaHistorialVentas")){

        const desde = document.getElementById("fechaDesdeHistorial")?.value || null;
        const hasta = document.getElementById("fechaHastaHistorial")?.value || null;
        const texto = document.getElementById("buscarTextoHistorial")?.value.trim().toLowerCase() || "";
        const horaDesde = document.getElementById("horaDesdeHistorial")?.value || "";
        const empleado = document.getElementById("empleadoHistorial")?.value || "";

        renderListaHistorial(desde, hasta, texto, horaDesde, empleado);

    }

    const detalle = document.getElementById("pantallaClienteDetalle");

    if(detalle && !detalle.classList.contains("oculto") && typeof clienteDetalleActualId !== "undefined" && clienteDetalleActualId){

        renderClienteDetalle(clienteDetalleActualId);

    }

    if(paginaActual === "Productos" && typeof actualizarTablaProductos === "function") actualizarTablaProductos();

}
