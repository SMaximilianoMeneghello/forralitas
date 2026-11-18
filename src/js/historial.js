/* ==========================================
   HISTORIAL DE VENTAS
========================================== */

function renderHistorial(){

    const opcionesEmpleados = obtenerListaEmpleadosParaFiltro()
        .map(nombre => `<option value="${nombre}">${nombre}</option>`)
        .join("");

    contenido().innerHTML = `

        <div class="historialVentas">

            <div class="historialBuscador">

                <div class="historialFiltrosFecha">

                    <div class="grupoInput">
                        <label>Desde</label>
                        <input type="date" id="fechaDesdeHistorial">
                    </div>

                    <div class="grupoInput">
                        <label>Hasta</label>
                        <input type="date" id="fechaHastaHistorial">
                    </div>

                    <div class="grupoInput">
                        <label>Desde la hora</label>
                        <select id="horaDesdeHistorial">
                            <option value="">Cualquier hora</option>
                            ${Array.from({ length: 24 }, (_, h) =>
                                `<option value="${h}">${String(h).padStart(2,"0")}:00</option>`
                            ).join("")}
                        </select>
                    </div>

                    <div class="grupoInput">
                        <label>Empleado</label>
                        <select id="empleadoHistorial">
                            <option value="">Todos los empleados</option>
                            ${opcionesEmpleados}
                        </select>
                    </div>

                </div>

                <div class="historialFiltrosBuscar">

                    <div class="grupoInput grupoInputBuscarTexto">
                        <label>Buscar</label>
                        <input
                            type="text"
                            id="buscarTextoHistorial"
                            placeholder="Cliente o producto..."
                            autocomplete="off">
                    </div>

                    <div class="historialAcciones">

                        <button class="btnBuscar" id="btnBuscarHistorial">
                            Buscar
                        </button>

                        <button class="btnHoy" id="btnHoyHistorial">Hoy</button>

                        <button class="btnTodas" id="btnTodasHistorial">Todas</button>

                    </div>

                </div>

            </div>

            <div id="listaHistorialVentas"></div>

        </div>

    `;

   document.getElementById("btnBuscarHistorial").onclick = buscarHistorial;

document.getElementById("btnHoyHistorial").onclick = filtrarHoyHistorial;

document.getElementById("btnTodasHistorial").onclick = filtrarTodasHistorial;

document.getElementById("buscarTextoHistorial").addEventListener("keydown", (e)=>{

    if(e.key === "Enter") buscarHistorial();

});

filtrarTodasHistorial();

}

/* ==========================================
   LISTA DE EMPLEADOS PARA EL FILTRO
   (nombres de vendedores que ya registraron
   alguna venta, más los usuarios cargados)
========================================== */

// "Maxi (Administrador)" es el mismo Maxi (solo el login admin) y Derna
// ya no se usa como filtro: se ocultan de la lista a pedido.
const EMPLEADOS_OCULTOS_FILTRO = ["Derna", "Maxi (Administrador)"];

function obtenerListaEmpleadosParaFiltro(){

    const nombres = new Set();

    (historialVentas || []).forEach(v =>{

        if(v.vendedor && v.vendedor.nombre) nombres.add(v.vendedor.nombre);

    });

    (typeof usuarios !== "undefined" ? usuarios : []).forEach(u =>{

        if(u.nombre) nombres.add(u.nombre);

    });

    EMPLEADOS_OCULTOS_FILTRO.forEach(nombre => nombres.delete(nombre));

    return Array.from(nombres).sort((a,b)=> a.localeCompare(b));

}

/* ==========================================
   TEXTO METODO DE PAGO
========================================== */

function textoMetodoPago(venta){

    if(!venta || !venta.metodoPago) return "—";

    if(venta.metodoPago === "debe"){

        // Compatibilidad con ventas viejas que no tenían saldoPendiente:
        // si nunca se registró como pagada, se toma como que debe el total.
        const pendiente = venta.saldoPendiente !== undefined
            ? Number(venta.saldoPendiente)
            : Number(venta.total || 0);

        const pagada = venta.pagada === true || pendiente <= 0.01;

        if(pagada){

            return `<span style="color:var(--verde);font-weight:800">✔ PAGADO</span>`;

        }

        return `<span style="color:var(--rojo);font-weight:800">DEBE ${dinero(pendiente)}</span>`;

    }

    if(venta.metodoPago === "efectivo") return "Efectivo";

    if(venta.metodoPago === "transferencia") return "Transferencia";

    if(venta.metodoPago === "mixto"){

        return "Mixto (E: " + dinero((venta.pago && venta.pago.efectivo) || 0)
            + " · T: " + dinero((venta.pago && venta.pago.transferencia) || 0) + ")";

    }

    return venta.metodoPago;

}

/* ==========================================
   FILTRAR
========================================== */

function filtrarHoyHistorial(){

    const hoy = fechaLocalISO(new Date());

    document.getElementById("fechaDesdeHistorial").value = hoy;

    document.getElementById("fechaHastaHistorial").value = hoy;

    document.getElementById("buscarTextoHistorial").value = "";

    document.getElementById("horaDesdeHistorial").value = "";

    document.getElementById("empleadoHistorial").value = "";

    renderListaHistorial(hoy, hoy, "", "", "");

}

function filtrarTodasHistorial(){

    document.getElementById("fechaDesdeHistorial").value = "";

    document.getElementById("fechaHastaHistorial").value = "";

    document.getElementById("buscarTextoHistorial").value = "";

    document.getElementById("horaDesdeHistorial").value = "";

    document.getElementById("empleadoHistorial").value = "";

    renderListaHistorial(null, null, "", "", "");

}
function buscarHistorial(){

    const desde =
        document.getElementById("fechaDesdeHistorial").value;

    const hasta =
        document.getElementById("fechaHastaHistorial").value;

    const texto =
        document.getElementById("buscarTextoHistorial").value.trim().toLowerCase();

    const horaDesde =
        document.getElementById("horaDesdeHistorial").value;

    const empleado =
        document.getElementById("empleadoHistorial").value;

    renderListaHistorial(
        desde || null,
        hasta || null,
        texto,
        horaDesde,
        empleado
    );

}
function renderListaHistorial(desde, hasta, texto = "", horaDesde = "", empleado = ""){

    const cont = document.getElementById("listaHistorialVentas");

    if(!cont) return;

    let ventas = [...historialVentas].sort((a,b)=>
        new Date(b.fecha) - new Date(a.fecha)
    );

    if(desde || hasta){

        ventas = ventas.filter(v =>{

            const f = fechaLocalISO(v.fecha);

            if(desde && f < desde) return false;

            if(hasta && f > hasta) return false;

            return true;

        });

    }

    if(horaDesde !== "" && horaDesde !== null && horaDesde !== undefined){

        const horaMinima = Number(horaDesde);

        ventas = ventas.filter(v => horaDeFecha(v.fecha) >= horaMinima);

    }

    if(empleado){

        ventas = ventas.filter(v =>
            (v.vendedor && v.vendedor.nombre) === empleado
        );

    }

    if(texto){

        ventas = ventas.filter(v =>{

            const nombreCliente = ((v.cliente && v.cliente.nombre) || "consumidor final").toLowerCase();

            const tieneProducto = (v.productos || []).some(item =>
                (item.nombre || "").toLowerCase().includes(texto)
            );

            return nombreCliente.includes(texto) || tieneProducto;

        });

    }

    if(ventas.length === 0){

        cont.innerHTML = `
            <div class="card">
                <p class="tablaVacia">
                    No hay ventas registradas con esos filtros.
                </p>
            </div>
        `;

        return;

    }

    // Se dibujan de a 50 (con 2.800 ventas, dibujar todas juntas hacía
    // que la pantalla tardara mucho en abrir).
    historialFiltrado = ventas;

    historialVisibles = HISTORIAL_POR_PAGINA;

    dibujarHistorialVisible();

}

const HISTORIAL_POR_PAGINA = 50;

let historialFiltrado = [];

let historialVisibles = HISTORIAL_POR_PAGINA;

function dibujarHistorialVisible(){

    const cont = document.getElementById("listaHistorialVentas");

    if(!cont) return;

    const visibles = historialFiltrado.slice(0, historialVisibles);

    const quedan = historialFiltrado.length - visibles.length;

    cont.innerHTML = visibles.map(htmlVentaHistorial).join("")
        + (quedan > 0
            ? `<div class="card" style="text-align:center">
                   <p style="margin-bottom:10px">Mostrando ${visibles.length} de ${historialFiltrado.length} ventas.</p>
                   <button class="btnBuscar" onclick="verMasHistorial()">Ver ${Math.min(quedan, HISTORIAL_POR_PAGINA)} más</button>
               </div>`
            : "");

}

function verMasHistorial(){

    historialVisibles += HISTORIAL_POR_PAGINA;

    dibujarHistorialVisible();

}

function htmlVentaHistorial(venta){

        const filas = venta.productos.map(item => `
            <tr>
                <td>${item.nombre}</td>
                <td>${formatearCantidadItem(item)}</td>
                <td>${unidadVenta(item.modo)}</td>
                <td>${dinero(item.precio)}</td>
                <td>${dinero(item.subtotal)}</td>
            </tr>
        `).join("");

        const cliente = (venta.cliente && venta.cliente.nombre)
            ? venta.cliente.nombre
            : "Consumidor Final";

        const vendedor = (venta.vendedor && venta.vendedor.nombre)
            ? venta.vendedor.nombre
            : "—";

        return `
            <div class="cardVentaHistorial">
                <div class="cardVentaCabecera">
                    <div class="infoClienteVenta">
                        <h3>${cliente}</h3>
                        <small>${venta.fechaTexto}</small>
                    </div>
                    <div class="accionesCabeceraVenta">
                        <button
                            class="btnComanda"
                            title="Imprimir comanda (sin precios, para armar el pedido)"
                            onclick="imprimirComandaVentaPorId('${venta.id}')">
                            🧾 Comanda
                        </button>
                        <button
                            class="btnTicketCliente"
                            title="Imprimir una copia del ticket para el cliente"
                            onclick="imprimirTicketClienteVentaPorId('${venta.id}')">
                            🎫 Ticket cliente
                        </button>
                    </div>
                    <small class="infoVendedorVenta">👤 ${vendedor}</small>
                </div>
                <div class="cardVentaInfo">
                    <span class="badgePago">${textoMetodoPago(venta)}</span>
                </div>
                <table class="tablaVentaHistorial">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Unidad</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
                <div class="totalVenta">
                    <span>TOTAL</span>
                    <strong>${dinero(venta.total)}</strong>
                    <button
                        class="btnEliminarVenta"
                        title="Eliminar venta"
                        onclick="eliminarVentaHistorial('${venta.id}')">
                        🗑️
                    </button>
                </div>
            </div>
        `;


}

/* ==========================================
   COMANDA / TICKET CLIENTE
========================================== */

function imprimirComandaVentaPorId(id){

    const venta = historialVentas.find(v => v.id === id);

    if(!venta){

        notificacion("No se encontró esa venta.", "warning");

        return;

    }

    imprimirComandaVenta(venta);

}

function imprimirTicketClienteVentaPorId(id){

    const venta = historialVentas.find(v => v.id === id);

    if(!venta){

        notificacion("No se encontró esa venta.", "warning");

        return;

    }

    imprimirTicketClienteVenta(venta);

}

/* ==========================================
   ELIMINAR VENTA
========================================== */

function eliminarVentaHistorial(id){

    const venta = historialVentas.find(v => v.id === id);

    if(!venta) return;

    confirmar(

        "¿Eliminar la venta del "
        + (venta.fechaTexto || "fecha desconocida")
        + " por " + dinero(venta.total) + "?",

        ()=>{

            historialVentas = historialVentas.filter(v => v.id !== id);

            // Se devuelve al stock lo que se había descontado al cargar
            // cada producto de la venta (ver ventas.js > confirmarCantidad).
            (venta.productos || []).forEach(item =>{

                const producto = productos.find(p => p.id === item.id);

                if(producto){

                    producto.stock = Number(producto.stock || 0) + Number(item.bolsas || 0);

                }

            });

            registrarEliminacion(

                "Venta",

                "Venta eliminada · "
                + ((venta.cliente && venta.cliente.nombre) ? venta.cliente.nombre : "Consumidor Final")
                + " · " + dinero(venta.total),

                venta

            );

            guardarDatos("historialVentas", "productos");

            if(paginaActual === "Productos"){

                actualizarTablaProductos();

            }

            const desde = document.getElementById("fechaDesdeHistorial")?.value || null;

            const hasta = document.getElementById("fechaHastaHistorial")?.value || null;

            const texto = document.getElementById("buscarTextoHistorial")?.value.trim().toLowerCase() || "";

            const horaDesde = document.getElementById("horaDesdeHistorial")?.value || "";

            const empleado = document.getElementById("empleadoHistorial")?.value || "";

            renderListaHistorial(desde, hasta, texto, horaDesde, empleado);

            notificacion("Venta eliminada del historial.", "error");

        }

    );

}
