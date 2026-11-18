/* ==========================================
   TICKETS DE VENTA
   ------------------------------------------
   Genera el HTML del ticket y lo manda a
   imprimir por el proceso main de Electron
   (ver electron/impresion.js). Si la app corre
   fuera de Electron (ej. "npm run dev" en el
   navegador) o no hay impresora configurada,
   simplemente no hace nada.
========================================== */

const NOMBRES_METODO_PAGO = {

    efectivo: "Efectivo",
    transferencia: "Transferencia / QR",
    tarjeta: "Tarjeta",
    mixto: "Mixto",
    debe: "Fiado (debe)"

};

function nombreMetodoPago(venta) {

    return NOMBRES_METODO_PAGO[venta.metodoPago] || venta.metodoPago;

}

function lineasDesglosePago(venta) {

    if (venta.metodoPago !== "mixto") return "";

    const pago = venta.pago || {};

    const partes = [];

    if (pago.efectivo) partes.push("Efectivo: " + dinero(pago.efectivo));
    if (pago.transferencia) partes.push("Transferencia/QR: " + dinero(pago.transferencia));
    if (pago.tarjeta) partes.push("Tarjeta: " + dinero(pago.tarjeta));

    return partes.map(p => `<div class="ticketLinea ticketChica">${p}</div>`).join("");

}

// Líneas de cabecera con los datos del negocio (Configuración > Negocio).
function lineasCabeceraNegocio() {

    const d = datosNegocio();

    const lineas = [];

    if (d.cuit) lineas.push("CUIT " + d.cuit + (d.condicionIva ? " - " + d.condicionIva : ""));
    else if (d.condicionIva) lineas.push(d.condicionIva);

    if (d.direccion) lineas.push(d.direccion);
    if (d.telefono) lineas.push("Tel: " + d.telefono);

    return lineas;

}

function generarTicketHTML(venta) {

    const filas = (venta.productos || []).map(item => `

        <div class="ticketProducto">
            <div class="ticketProductoNombre">${escaparHtml(item.nombre)}</div>
            <div class="ticketProductoDetalle">
                <span>${formatearCantidadItem(item)} ${unidadVenta(item.modo)}</span>
                <span>${dinero(item.subtotal)}</span>
            </div>
        </div>

    `).join("");

    return `

        <!doctype html>
        <html>
        <head>
        <meta charset="utf-8">
        <style>

            @page { margin: 4mm; }

            body {
                font-family: "Courier New", monospace;
                font-size: 12px;
                width: 280px;
                margin: 0;
                color: #000;
            }

            .ticketCentro { text-align: center; }
            .ticketTitulo { font-size: 15px; font-weight: bold; }
            .ticketChica { font-size: 11px; }
            .ticketSeparador { border-top: 1px dashed #000; margin: 6px 0; }
            .ticketProducto { margin-bottom: 4px; }
            .ticketProductoDetalle { display: flex; justify-content: space-between; }
            .ticketTotalFila { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
            .ticketLinea { margin: 2px 0; }

        </style>
        </head>
        <body>

            <div class="ticketCentro">
                <div class="ticketTitulo">${escaparHtml(nombreNegocio())}</div>
                ${lineasCabeceraNegocio().map(l => `<div class="ticketChica">${escaparHtml(l)}</div>`).join("")}
                <div class="ticketChica">${venta.fechaTexto}</div>
                <div class="ticketChica">Ticket ${venta.id}</div>
            </div>

            <div class="ticketSeparador"></div>

            ${filas}

            <div class="ticketSeparador"></div>

            <div class="ticketTotalFila">
                <span>TOTAL</span>
                <span>${dinero(venta.total)}</span>
            </div>

            <div class="ticketLinea">Pago: ${nombreMetodoPago(venta)}</div>

            ${lineasDesglosePago(venta)}

            ${venta.cliente ? `<div class="ticketLinea ticketChica">Cliente: ${escaparHtml(venta.cliente.nombre)}</div>` : ""}

            ${venta.vendedor ? `<div class="ticketLinea ticketChica">Atendió: ${escaparHtml(venta.vendedor.nombre)}</div>` : ""}

            <div class="ticketSeparador"></div>

            ${datosNegocio().pieTicket ? `<div class="ticketCentro ticketChica">${escaparHtml(datosNegocio().pieTicket)}</div>` : ""}

            <div class="ticketCentro ticketChica">Documento no válido como factura</div>

        </body>
        </html>

    `;

}

// Etiquetas de formato que entiende la Terminals API del Point (negrita,
// letra grande, centrado, salto de línea). No es HTML: es texto plano con
// estas marcas, y exige entre 100 y 4096 caracteres en total.
function escaparTextoPoint(texto) {

    return String(texto ?? "").replace(/[{}]/g, "");

}

function generarTicketContenidoPoint(venta) {

    const partes = [];

    partes.push("{center}{w}" + escaparTextoPoint(nombreNegocio()) + "{/w}{/center}{br}");

    lineasCabeceraNegocio().forEach(linea => {

        partes.push("{center}" + escaparTextoPoint(linea) + "{/center}{br}");

    });

    partes.push("{center}" + escaparTextoPoint(venta.fechaTexto) + "{/center}{br}");
    partes.push("{center}Ticket " + escaparTextoPoint(venta.id) + "{/center}{br}");
    partes.push("--------------------------------{br}");

    (venta.productos || []).forEach(item => {

        const detalle = formatearCantidadItem(item) + " " + unidadVenta(item.modo);

        partes.push(escaparTextoPoint(item.nombre) + "{br}");
        partes.push(escaparTextoPoint(detalle) + "  " + dinero(item.subtotal) + "{br}");

    });

    partes.push("--------------------------------{br}");
    partes.push("{b}TOTAL  " + dinero(venta.total) + "{/b}{br}");
    partes.push("Pago: " + escaparTextoPoint(nombreMetodoPago(venta)) + "{br}");

    if (venta.metodoPago === "mixto") {

        const pago = venta.pago || {};

        if (pago.efectivo) partes.push("Efectivo: " + dinero(pago.efectivo) + "{br}");
        if (pago.transferencia) partes.push("Transferencia/QR: " + dinero(pago.transferencia) + "{br}");
        if (pago.tarjeta) partes.push("Tarjeta: " + dinero(pago.tarjeta) + "{br}");

    }

    if (venta.cliente) partes.push("Cliente: " + escaparTextoPoint(venta.cliente.nombre) + "{br}");

    if (venta.vendedor) partes.push("Vendedor: " + escaparTextoPoint(venta.vendedor.nombre) + "{br}");

    partes.push("--------------------------------{br}");
    if (datosNegocio().pieTicket) partes.push("{center}" + escaparTextoPoint(datosNegocio().pieTicket) + "{/center}{br}");

    partes.push("{center}No valido como factura{/center}{br}");

    let contenido = partes.join("");

    // El Point exige un mínimo de 100 caracteres de contenido.
    while (contenido.length < 100) contenido += "{br}";

    // Y un máximo de 4096 (ventas con muchos productos podrían superarlo).
    if (contenido.length > 4096) contenido = contenido.slice(0, 4096);

    return contenido;

}

// Intenta imprimir en el Point (sirve para cualquier método de pago: el
// Point se usa como impresora de tickets, cobre o no cobre él mismo).
// Devuelve true si se mandó bien, para no duplicar con la impresora local.
async function imprimirTicketEnPoint(venta) {

    try {

        const config = await window.forralitasNative.mp.obtenerConfig();

        if (!config.tieneToken || !config.deviceId) return false;

        await window.forralitasNative.mp.imprimirTicket({

            contenido: generarTicketContenidoPoint(venta),
            referencia: "TICKET-" + venta.id

        });

        return true;

    } catch (error) {

        notificacion("No se pudo imprimir el ticket en el Point: " + error.message, "warning");

        return false;

    }

}

async function imprimirTicketVenta(venta) {

    if (!window.forralitasNative) return;

    if (!configuracionSistema?.negocio?.imprimirTicketAutomatico) return;

    const impresoEnPoint = await imprimirTicketEnPoint(venta);

    if (impresoEnPoint) return;

    try {

        await window.forralitasNative.impresora.imprimirTicket(generarTicketHTML(venta));

    } catch (error) {

        notificacion("No se pudo imprimir el ticket: " + error.message, "warning");

    }

}

/* ==========================================
   COMANDA (SIN PRECIOS)
   ------------------------------------------
   Para el chico que carga el pedido: fecha,
   vendedor y los productos/cantidades de la
   venta, sin ningún precio.
========================================== */

function generarComandaHTML(venta) {

    const filas = (venta.productos || []).map(item => `

        <div class="ticketProducto">
            <div class="ticketProductoNombre">${item.nombre}</div>
            <div class="ticketProductoDetalle">
                <span>${formatearCantidadItem(item)} ${unidadVenta(item.modo)}</span>
            </div>
        </div>

    `).join("");

    return `

        <!doctype html>
        <html>
        <head>
        <meta charset="utf-8">
        <style>

            @page { margin: 4mm; }

            body {
                font-family: "Courier New", monospace;
                font-size: 12px;
                width: 280px;
                margin: 0;
                color: #000;
            }

            .ticketCentro { text-align: center; }
            .ticketTitulo { font-size: 15px; font-weight: bold; }
            .ticketChica { font-size: 11px; }
            .ticketSeparador { border-top: 1px dashed #000; margin: 6px 0; }
            .ticketProducto { margin-bottom: 4px; }
            .ticketProductoDetalle { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; }
            .ticketLinea { margin: 2px 0; }

        </style>
        </head>
        <body>

            <div class="ticketCentro">
                <div class="ticketTitulo">COMANDA</div>
                <div class="ticketChica">${venta.fechaTexto}</div>
                <div class="ticketChica">Venta ${venta.id}</div>
            </div>

            <div class="ticketSeparador"></div>

            ${filas}

            <div class="ticketSeparador"></div>

            ${venta.vendedor ? `<div class="ticketLinea">Vendedor: ${venta.vendedor.nombre}</div>` : ""}

            ${venta.cliente ? `<div class="ticketLinea ticketChica">Cliente: ${venta.cliente.nombre}</div>` : ""}

        </body>
        </html>

    `;

}

// Misma idea que generarTicketContenidoPoint pero sin precios ni total,
// para el Point (como pasa con la impresora local, la comanda es "para
// el chico que carga el pedido").
function generarComandaContenidoPoint(venta) {

    const partes = [];

    partes.push("{center}{w}COMANDA{/w}{/center}{br}");
    partes.push("{center}" + escaparTextoPoint(venta.fechaTexto) + "{/center}{br}");
    partes.push("{center}Venta " + escaparTextoPoint(venta.id) + "{/center}{br}");
    partes.push("--------------------------------{br}");

    (venta.productos || []).forEach(item => {

        const detalle = formatearCantidadItem(item) + " " + unidadVenta(item.modo);

        partes.push(escaparTextoPoint(item.nombre) + "{br}");
        partes.push(escaparTextoPoint(detalle) + "{br}");

    });

    partes.push("--------------------------------{br}");

    if (venta.vendedor) partes.push("Vendedor: " + escaparTextoPoint(venta.vendedor.nombre) + "{br}");

    if (venta.cliente) partes.push("Cliente: " + escaparTextoPoint(venta.cliente.nombre) + "{br}");

    let contenido = partes.join("");

    // El Point exige un mínimo de 100 caracteres de contenido.
    while (contenido.length < 100) contenido += "{br}";

    // Y un máximo de 4096 (ventas con muchos productos podrían superarlo).
    if (contenido.length > 4096) contenido = contenido.slice(0, 4096);

    return contenido;

}

async function imprimirComandaEnPoint(venta) {

    try {

        const config = await window.forralitasNative.mp.obtenerConfig();

        if (!config.tieneToken || !config.deviceId) return false;

        await window.forralitasNative.mp.imprimirTicket({

            contenido: generarComandaContenidoPoint(venta),
            referencia: "COMANDA-" + venta.id

        });

        return true;

    } catch (error) {

        notificacion("No se pudo imprimir la comanda en el Point: " + error.message, "warning");

        return false;

    }

}

async function imprimirComandaVenta(venta) {

    if (!venta) return;

    if (!window.forralitasNative) {

        notificacion("La impresión solo funciona en la aplicación de escritorio.", "warning");

        return;

    }

    try {

        const impresoEnPoint = await imprimirComandaEnPoint(venta);

        if (impresoEnPoint) {

            notificacion("Comanda enviada al Point.");

            return;

        }

        await window.forralitasNative.impresora.imprimirTicket(generarComandaHTML(venta));

        notificacion("Comanda enviada a la impresora.");

    } catch (error) {

        notificacion("No se pudo imprimir la comanda: " + error.message, "warning");

    }

}

/* ==========================================
   REIMPRESIÓN DE TICKET PARA EL CLIENTE
   ------------------------------------------
   Copia del ticket de venta (el original ya se
   imprimió solo al cobrar). Se ofrece desde el
   Historial para cuando el cliente pide su copia.
========================================== */

async function imprimirTicketClienteVenta(venta) {

    if (!venta) return;

    if (!window.forralitasNative) {

        notificacion("La impresión solo funciona en la aplicación de escritorio.", "warning");

        return;

    }

    try {

        const impresoEnPoint = await imprimirTicketEnPoint(venta);

        if (impresoEnPoint) {

            notificacion("Ticket enviado al Point.");

            return;

        }

        await window.forralitasNative.impresora.imprimirTicket(generarTicketHTML(venta));

        notificacion("Ticket enviado a la impresora.");

    } catch (error) {

        notificacion("No se pudo imprimir el ticket: " + error.message, "warning");

    }

}

async function imprimirTicketDePrueba() {

    if (!window.forralitasNative) {

        notificacion("La impresión solo funciona en la aplicación de escritorio.", "warning");

        return;

    }

    const ventaDePrueba = {

        id: "PRUEBA",
        fechaTexto: fechaHoraTexto(new Date()),
        productos: [
            { nombre: "Producto de prueba", cantidad: 1, modo: "bolsa", subtotal: 1000 }
        ],
        total: 1000,
        metodoPago: "efectivo",
        pago: { efectivo: 1000, transferencia: 0 },
        cliente: null,
        vendedor: usuarioActual

    };

    try {

        const impresoEnPoint = await imprimirTicketEnPoint(ventaDePrueba);

        if (impresoEnPoint) {

            notificacion("Ticket de prueba enviado al Point.");

            return;

        }

        await window.forralitasNative.impresora.imprimirTicket(generarTicketHTML(ventaDePrueba));

        notificacion("Ticket de prueba enviado a la impresora.");

    } catch (error) {

        notificacion("No se pudo imprimir: " + error.message, "warning");

    }

}
