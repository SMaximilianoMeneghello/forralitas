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

                <div class="grupoInput grupoInputBuscarTexto">
                    <label>Buscar</label>
                    <input
                        type="text"
                        id="buscarTextoHistorial"
                        placeholder="Cliente o producto..."
                        autocomplete="off">
                </div>

                <button class="btnBuscar" id="btnBuscarHistorial">
                    Buscar
                </button>

                <button class="btnHoy" id="btnHoyHistorial">Hoy</button>

                <button class="btnTodas" id="btnTodasHistorial">Todas</button>

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

function obtenerListaEmpleadosParaFiltro(){

    const nombres = new Set();

    (historialVentas || []).forEach(v =>{

        if(v.vendedor && v.vendedor.nombre) nombres.add(v.vendedor.nombre);

    });

    (typeof usuarios !== "undefined" ? usuarios : []).forEach(u =>{

        if(u.nombre) nombres.add(u.nombre);

    });

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

    cont.innerHTML = ventas.map(venta =>{

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
                    <div>
                        <h3>${cliente}</h3>
                        <small>${venta.fechaTexto}</small>
                    </div>
                    <small>👤 ${vendedor}</small>
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

    }).join("");

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

            registrarEliminacion(

                "Venta",

                "Venta eliminada · "
                + ((venta.cliente && venta.cliente.nombre) ? venta.cliente.nombre : "Consumidor Final")
                + " · " + dinero(venta.total),

                venta

            );

            guardarDatos();

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
