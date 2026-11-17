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

    mostrarPantallaDetalle("pantallaMezclaDetalle");

}

function cerrarPantallaMezclaDetalle(){

    ocultarPantallaDetalle("pantallaMezclaDetalle");

    if(paginaActual === "Mezclas") actualizarTablaMezclas();

}

function unidadIngrediente(unidad){

    return unidad === "kg" ? "kg" : "bolsas";

}

function renderMezclaDetalle(id){

    const mezcla = mezclas.find(m => m.id === id);

    if(!mezcla){

        document.getElementById("tituloMezclaDetalle").textContent = "Mezcla";

        document.getElementById("contenidoMezclaDetalle").innerHTML = `
            <div class="card"><p>Mezcla no encontrada (puede que la hayan eliminado).</p></div>
        `;

        return;

    }

    if(!mezcla.producciones) mezcla.producciones = [];

    const ingredientes = mezcla.ingredientes || [];

    const nombreSalida = (mezcla.productoSalida && mezcla.productoSalida.nombre) || "—";

    document.getElementById("tituloMezclaDetalle").textContent = mezcla.nombre || "Mezcla";

    const resumenIngredientes = ingredientes.map(i => `
        <div class="datoCliente">
            <span class="labelDato">${esc(i.nombre)}</span>
            <span class="valorDato">${formatearStock(i.cantidad)} ${unidadIngrediente(i.unidad)} por lote</span>
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
                        <span class="valorDato">${esc(nombreSalida)}</span>
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
                            <span class="valorDato">${esc(mezcla.notas)}</span>
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

    const nombreSalida = (mezcla.productoSalida && mezcla.productoSalida.nombre) || "";

    if(producciones.length === 0){

        return `<div class="cardVentaHistorial"><p class="tablaVacia">Todavía no se registró ninguna producción.</p></div>`;

    }

    return [...producciones]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .map(p => `
            <div class="cardVentaHistorial">
                <div class="cabeceraVentaHistorial">
                    <div>
                        <span class="fechaVenta">🗓️ ${esc(p.fechaTexto)}</span>
                        ${p.usuario ? `<span class="vendedorVenta">👤 ${esc(p.usuario)}</span>` : ""}
                    </div>
                    ${esAdmin() ? `
                        <span class="accionesVenta">
                            <button class="btnAccion btnBorrar" title="Anular esta producción (devuelve el stock)"
                                onclick="eliminarProduccionMezcla('${esc(mezcla.id)}', '${esc(p.id)}')">🗑️</button>
                        </span>
                    ` : ""}
                </div>
                <div class="datosVentaHistorial">
                    <span>Se descontó: ${esc(p.ingredientesUsados)}</span>
                </div>
                <div class="totalVentaHistorial">
                    +${formatearStock(p.cantidad)} bolsas de ${esc(nombreSalida)}
                </div>
            </div>
        `).join("");

}

/* ==========================================
   MODAL REGISTRAR PRODUCCIÓN
========================================== */

let mezclaProduccionActualId = null;

/* Cuánto hay que descontar de cada ingrediente para producir
   "cantidad" bolsas. Devuelve null si falta algún producto. */
function calcularConsumoMezcla(mezcla, cantidad){

    const multiplicador = cantidad / Number(mezcla.bolsasPorLote || 10);

    const detalle = [];

    for(const ing of (mezcla.ingredientes || [])){

        const producto = productos.find(p => p.id === ing.idProducto);

        const cantidadNecesaria = redondear(Number(ing.cantidad || 0) * multiplicador);

        const bolsas = !producto
            ? 0
            : (ing.unidad === "kg"
                ? (Number(producto.pesoBolsa) > 0 ? cantidadNecesaria / Number(producto.pesoBolsa) : 0)
                : cantidadNecesaria);

        detalle.push({
            producto: producto || null,
            idProducto: ing.idProducto,
            nombre: ing.nombre,
            unidad: ing.unidad,
            cantidadNecesaria,
            bolsas: redondear(bolsas)
        });

    }

    return detalle;

}

function abrirModalProduccionMezcla(id){

    if(!puede("mezclas")){ avisarSinPermiso(); return; }

    mezclaProduccionActualId = id;

    const mezcla = mezclas.find(m => m.id === id);

    if(!mezcla) return;

    const input = document.getElementById("cantidadProduccionMezcla");

    input.value = mezcla.bolsasPorLote || 10;

    input.oninput = ()=>{

        limpiarNumero(input);

        actualizarPreviaProduccionMezcla();

    };

    actualizarPreviaProduccionMezcla();

    abrir("modalProduccionMezcla");

}

function actualizarPreviaProduccionMezcla(){

    const mezcla = mezclas.find(m => m.id === mezclaProduccionActualId);

    if(!mezcla) return;

    const cantidad = numeroDe("cantidadProduccionMezcla");

    const cont = document.getElementById("previaIngredientesProduccion");

    if(cantidad <= 0){

        cont.innerHTML = "";

        return;

    }

    cont.innerHTML = `
        <p class="labelDato" style="margin-bottom:8px">Esto va a descontar:</p>
        ${calcularConsumoMezcla(mezcla, cantidad).map(det =>{

            const falta = !det.producto
                ? " ⚠ el producto ya no existe"
                : (det.bolsas > Number(det.producto.stock || 0) + 0.0001 ? " ⚠ sin stock suficiente" : "");

            return `
                <div class="datoCliente">
                    <span class="labelDato">${esc(det.nombre)}</span>
                    <span class="valorDato ${falta ? "saldoDeuda" : ""}">
                        ${formatearStock(det.cantidadNecesaria)} ${unidadIngrediente(det.unidad)}${falta}
                    </span>
                </div>
            `;

        }).join("")}
    `;

}

function guardarProduccionMezcla(){

    if(!puede("mezclas")){ avisarSinPermiso(); return; }

    const mezcla = mezclas.find(m => m.id === mezclaProduccionActualId);

    if(!mezcla) return;

    const cantidad = numeroDe("cantidadProduccionMezcla");

    if(cantidad <= 0){

        notificacion("Ingresá cuántas bolsas salieron.", "warning");

        return;

    }

    const productoSalida = mezcla.productoSalida
        ? productos.find(p => p.id === mezcla.productoSalida.id)
        : null;

    if(!productoSalida){

        notificacion("El producto de salida de esta receta ya no existe en Productos. Editá la receta y elegilo de nuevo.", "error");

        return;

    }

    // Se valida el stock de TODOS los ingredientes antes de descontar
    // ninguno, para no dejar todo a mitad de camino.
    const detalle = calcularConsumoMezcla(mezcla, cantidad);

    for(const det of detalle){

        if(!det.producto){

            notificacion("El ingrediente \"" + det.nombre + "\" ya no existe en Productos.", "error");

            return;

        }

        if(det.bolsas > Number(det.producto.stock || 0) + 0.0001){

            notificacion(
                "No hay stock suficiente de " + det.producto.nombre
                + ". Disponible: " + formatearStock(det.producto.stock) + " bolsas.",
                "error"
            );

            return;

        }

    }

    detalle.forEach(det =>{

        det.producto.stock = redondear(Number(det.producto.stock || 0) - det.bolsas);

    });

    productoSalida.stock = redondear(Number(productoSalida.stock || 0) + cantidad);

    const ingredientesUsados = detalle
        .map(det => formatearStock(det.cantidadNecesaria) + " " + unidadIngrediente(det.unidad) + " de " + det.nombre)
        .join(", ");

    if(!mezcla.producciones) mezcla.producciones = [];

    const ahora = new Date();

    mezcla.producciones.unshift({

        id: nuevoId("PM"),
        fecha: ahora.toISOString(),
        fechaTexto: fechaHoraTexto(ahora),
        cantidad,
        ingredientesUsados,
        usuario: usuarioActual ? usuarioActual.nombre : null,

        // Se guarda exactamente qué stock se movió, para poder anularla.
        salidaId: productoSalida.id,
        consumo: detalle.map(det => ({ idProducto: det.idProducto, bolsas: det.bolsas }))

    });

    guardarDatos("mezclas", "productos");

    cerrar("modalProduccionMezcla");

    renderMezclaDetalle(mezcla.id);

    notificacion("Producción registrada. Se actualizó el stock.");

}

/* ==========================================
   ANULAR UNA PRODUCCIÓN (SOLO ADMIN)
   Devuelve el stock de los ingredientes y
   descuenta las bolsas producidas.
========================================== */

function eliminarProduccionMezcla(mezclaId, produccionId){

    if(!soloAdmin()) return;

    const mezcla = mezclas.find(m => m.id === mezclaId);

    const produccion = mezcla ? (mezcla.producciones || []).find(p => p.id === produccionId) : null;

    if(!produccion) return;

    // Las producciones cargadas con versiones anteriores no guardaban
    // el detalle: se calcula con la receta actual.
    const consumo = Array.isArray(produccion.consumo)
        ? produccion.consumo
        : calcularConsumoMezcla(mezcla, Number(produccion.cantidad || 0))
            .map(det => ({ idProducto: det.idProducto, bolsas: det.bolsas }));

    const salidaId = produccion.salidaId || (mezcla.productoSalida && mezcla.productoSalida.id);

    confirmar(
        "¿Anular la producción del " + produccion.fechaTexto + " (" + formatearStock(produccion.cantidad) + " bolsas)? "
        + "Se devuelve el stock de los ingredientes y se descuentan las bolsas producidas"
        + (Array.isArray(produccion.consumo) ? "." : " (calculado con la receta actual)."),
        ()=>{

            consumo.forEach(c =>{

                const producto = productos.find(p => p.id === c.idProducto);

                if(producto) producto.stock = redondear(Number(producto.stock || 0) + Number(c.bolsas || 0));

            });

            const salida = productos.find(p => p.id === salidaId);

            if(salida) salida.stock = redondear(Number(salida.stock || 0) - Number(produccion.cantidad || 0));

            mezcla.producciones = mezcla.producciones.filter(p => p.id !== produccionId);

            registrarEliminacion(
                "Producción de mezcla",
                "Producción de " + (mezcla.nombre || "") + " · " + formatearStock(produccion.cantidad) + " bolsas · " + produccion.fechaTexto,
                produccion
            );

            guardarDatos("mezclas", "productos", "eliminaciones");

            renderMezclaDetalle(mezcla.id);

            notificacion("Producción anulada. Se devolvió el stock.", "error");

        }
    );

}
