/* ==========================================
   DETALLE DE MEZCLA (PRODUCCIÓN)
========================================== */

let mezclaDetalleActualId = null;

function verDetalleMezcla(id){

    mezclaDetalleActualId = id;

    abrirPantallaMezclaDetalle();

    renderMezclaDetalle(id);

}

function abrirPantallaMezclaDetalle(){

    const app = document.getElementById("appPrincipal");

    const pantalla = document.getElementById("pantallaMezclaDetalle");

    if(app) app.classList.add("oculto");

    if(pantalla) pantalla.classList.remove("oculto");

}

function cerrarPantallaMezclaDetalle(){

    const app = document.getElementById("appPrincipal");

    const pantalla = document.getElementById("pantallaMezclaDetalle");

    if(app && app.classList.contains("oculto")){

        app.classList.remove("oculto");

    }

    if(pantalla) pantalla.classList.add("oculto");

}

function renderMezclaDetalle(id){

    const mezcla = mezclas.find(m => m.id === id);

    if(!mezcla){

        document.getElementById("contenidoMezclaDetalle").innerHTML = `
            <div class="card"><p>Mezcla no encontrada.</p></div>
        `;

        return;

    }

    if(!mezcla.producciones) mezcla.producciones = [];

    document.getElementById("tituloMezclaDetalle").textContent = mezcla.nombre;

    const resumenIngredientes = mezcla.ingredientes.map(i => `
        <div class="datoCliente">
            <span class="labelDato">${i.nombre}</span>
            <span class="valorDato">${formatearStock(i.cantidad)} ${i.unidad === "kg" ? "kg" : "bolsas"} por lote</span>
        </div>
    `).join("");

    const totalProducido = mezcla.producciones.reduce((acc, p) => acc + Number(p.cantidad || 0), 0);

    document.getElementById("contenidoMezclaDetalle").innerHTML = `

        <div class="detalleClienteGrid">

            <div class="columnaClienteIzquierda">

                <div class="card datosClienteCard">

                    <h2>Receta</h2>

                    <div class="datoCliente">
                        <span class="labelDato">Producto de salida</span>
                        <span class="valorDato">${mezcla.productoSalida.nombre}</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Un lote rinde</span>
                        <span class="valorDato">${formatearStock(mezcla.bolsasPorLote || 10)} bolsas</span>
                    </div>

                    <div class="datoCliente">
                        <span class="labelDato">Total producido hasta ahora</span>
                        <span class="valorDato">${formatearStock(totalProducido)} bolsas</span>
                    </div>

                    ${mezcla.notas ? `
                        <div class="datoCliente">
                            <span class="labelDato">Notas</span>
                            <span class="valorDato">${mezcla.notas}</span>
                        </div>
                    ` : ""}

                    <hr style="margin:14px 0;border:none;border-top:1px solid #eee">

                    <p class="labelDato" style="margin-bottom:8px">Ingredientes por lote</p>

                    ${resumenIngredientes}

                    <div class="accionesDetalleCliente">

                        <button id="btnProducirMezcla" class="btnRegistrarPago">
                            🏭 Registrar producción
                        </button>

                    </div>

                </div>

            </div>

            <div class="card historialClienteCard">

                <h2>Historial de producción</h2>

                <div class="historialClienteLista">
                    ${renderHistorialProduccionMezcla(mezcla)}
                </div>

            </div>

        </div>

    `;

    document.getElementById("btnProducirMezcla").onclick = ()=> abrirModalProduccionMezcla(mezcla.id);

}

function renderHistorialProduccionMezcla(mezcla){

    const producciones = mezcla.producciones || [];

    if(producciones.length === 0){

        return `<div class="cardVentaHistorial"><p class="tablaVacia">Todavía no se registró ninguna producción.</p></div>`;

    }

    return [...producciones]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .map(p => `
            <div class="cardVentaHistorial">
                <div class="cabeceraVentaHistorial">
                    <div>
                        <span class="fechaVenta">🗓️ ${p.fechaTexto}</span>
                        ${p.usuario ? `<span class="vendedorVenta">👤 ${p.usuario}</span>` : ""}
                    </div>
                </div>
                <div class="datosVentaHistorial">
                    <span>Se descontó: ${p.ingredientesUsados}</span>
                </div>
                <div class="totalVentaHistorial">
                    +${formatearStock(p.cantidad)} bolsas de ${mezcla.productoSalida.nombre}
                </div>
            </div>
        `).join("");

}

/* ==========================================
   MODAL REGISTRAR PRODUCCIÓN
========================================== */

let mezclaProduccionActualId = null;

function abrirModalProduccionMezcla(id){

    mezclaProduccionActualId = id;

    const mezcla = mezclas.find(m => m.id === id);

    if(!mezcla) return;

    document.getElementById("cantidadProduccionMezcla").value = mezcla.bolsasPorLote || 10;

    document.getElementById("cantidadProduccionMezcla").oninput = actualizarPreviaProduccionMezcla;

    actualizarPreviaProduccionMezcla();

    abrir("modalProduccionMezcla");

}

function actualizarPreviaProduccionMezcla(){

    const mezcla = mezclas.find(m => m.id === mezclaProduccionActualId);

    if(!mezcla) return;

    const cantidad = Number(document.getElementById("cantidadProduccionMezcla").value) || 0;

    const multiplicador = cantidad / Number(mezcla.bolsasPorLote || 10);

    const cont = document.getElementById("previaIngredientesProduccion");

    if(cantidad <= 0){

        cont.innerHTML = "";

        return;

    }

    cont.innerHTML = `
        <p class="labelDato" style="margin-bottom:8px">Esto va a descontar:</p>
        ${mezcla.ingredientes.map(i =>{

            const aDescontar = i.cantidad * multiplicador;

            const producto = productos.find(p => p.id === i.idProducto);

            const sinStock = producto && (i.unidad === "kg"
                ? (Number(producto.pesoBolsa) > 0 ? aDescontar / Number(producto.pesoBolsa) : 0)
                : aDescontar) > Number(producto.stock || 0);

            return `
                <div class="datoCliente">
                    <span class="labelDato">${i.nombre}</span>
                    <span class="valorDato ${sinStock ? "saldoDeuda" : ""}">
                        ${formatearStock(aDescontar)} ${i.unidad === "kg" ? "kg" : "bolsas"}
                        ${sinStock ? " ⚠ sin stock suficiente" : ""}
                    </span>
                </div>
            `;

        }).join("")}
    `;

}

function guardarProduccionMezcla(){

    const mezcla = mezclas.find(m => m.id === mezclaProduccionActualId);

    if(!mezcla) return;

    const cantidad = Number(document.getElementById("cantidadProduccionMezcla").value) || 0;

    if(cantidad <= 0){

        notificacion("Ingresá cuántas bolsas salieron.", "warning");

        return;

    }

    const multiplicador = cantidad / Number(mezcla.bolsasPorLote || 10);

    // Se valida el stock de TODOS los ingredientes antes de descontar
    // ninguno, para no dejar todo a mitad de camino.
    const detalle = [];

    for(const ing of mezcla.ingredientes){

        const producto = productos.find(p => p.id === ing.idProducto);

        if(!producto){

            notificacion("El ingrediente \"" + ing.nombre + "\" ya no existe en Productos.", "error");

            return;

        }

        const cantidadNecesaria = ing.cantidad * multiplicador;

        const bolsasADescontar = ing.unidad === "kg"
            ? (Number(producto.pesoBolsa) > 0 ? cantidadNecesaria / Number(producto.pesoBolsa) : 0)
            : cantidadNecesaria;

        if(bolsasADescontar > Number(producto.stock || 0)){

            notificacion(

                "No hay stock suficiente de " + producto.nombre
                + ". Disponible: " + formatearStock(producto.stock) + " bolsas.",

                "error"

            );

            return;

        }

        detalle.push({ producto, cantidadNecesaria, unidad: ing.unidad, bolsasADescontar, nombre: ing.nombre });

    }

    detalle.forEach(det =>{

        det.producto.stock = Number(det.producto.stock || 0) - det.bolsasADescontar;

    });

    const productoSalida = productos.find(p => p.id === mezcla.productoSalida.id);

    if(productoSalida){

        productoSalida.stock = Number(productoSalida.stock || 0) + cantidad;

    }

    const ingredientesUsados = detalle
        .map(det => formatearStock(det.cantidadNecesaria) + " " + (det.unidad === "kg" ? "kg" : "bolsas") + " de " + det.nombre)
        .join(", ");

    if(!mezcla.producciones) mezcla.producciones = [];

    mezcla.producciones.unshift({

        id: "PM" + Date.now(),
        fecha: new Date().toISOString(),
        fechaTexto: fechaHoraTexto(new Date()),
        cantidad,
        ingredientesUsados,
        usuario: usuarioActual ? usuarioActual.nombre : null

    });

    guardarDatos("productos", "mezclas");

    cerrar("modalProduccionMezcla");

    renderMezclaDetalle(mezcla.id);

    actualizarTablaMezclas();

    notificacion("Producción registrada. Se actualizó el stock.");

}
