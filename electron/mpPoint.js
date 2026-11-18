import { obtenerAccessToken, obtenerDeviceId } from "./mpConfig.js";

/* ==========================================
   MERCADO PAGO - POINT (ORDERS API)
   ------------------------------------------
   Todo lo que habla con la API de Mercado Pago
   vive en este único archivo: si al probar con
   el Point Smart real hay que ajustar algún
   nombre de campo del JSON, se corrige solo acá.

   Documentación:
   - Dispositivos: GET /point/integration-api/devices
   - Crear cobro:  POST /v1/orders (type: "point")
   - Consultar:    GET /v1/orders/{id}
========================================== */

const BASE_URL = "https://api.mercadopago.com";

async function llamarApi(ruta, opciones = {}) {

    const token = obtenerAccessToken();

    if (!token) {

        throw new Error("No hay un Access Token de Mercado Pago configurado.");

    }

    const respuesta = await fetch(BASE_URL + ruta, {

        ...opciones,

        headers: {

            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "X-Idempotency-Key": opciones.idempotencyKey || cryptoRandomId(),
            ...(opciones.headers || {})

        }

    });

    const texto = await respuesta.text();

    let datos = null;

    try { datos = texto ? JSON.parse(texto) : null; } catch { datos = texto; }

    if (!respuesta.ok) {

        const mensaje = (datos && (datos.message || datos.error)) || texto || ("Error HTTP " + respuesta.status);

        throw new Error(mensaje);

    }

    return datos;

}

function cryptoRandomId() {

    return "fr" + Date.now() + Math.random().toString(16).slice(2);

}

export async function listarDispositivos() {

    const datos = await llamarApi("/point/integration-api/devices", { method: "GET" });

    const dispositivos = (datos && datos.devices) || [];

    return dispositivos.map(d => ({

        deviceId: d.id,
        nombre: d.pos_id || d.id,
        operando: d.operating_mode

    }));

}

// El Point solo recibe cobros/impresiones por API si está en modo "PDV".
// En modo "STANDALONE" (el que suele traer de fábrica) las llamadas a
// /v1/orders o /terminals/v1/actions nunca le llegan al aparato, y eso
// es justo lo que se ve desde la app como "no manda la señal".
async function verificarModoPDV(deviceId) {

    const dispositivos = await listarDispositivos();

    const dispositivo = dispositivos.find(d => d.deviceId === deviceId);

    if (!dispositivo) {

        throw new Error("El dispositivo Point configurado ya no aparece vinculado a esta cuenta. Volvé a buscarlo en Configuración.");

    }

    if (dispositivo.operando !== "PDV") {

        throw new Error(
            "El Point está en modo Standalone y no puede recibir cobros ni tickets por la app. " +
            "Ponelo en modo PDV desde Configuración (botón \"Activar modo PDV\") y reiniciá el dispositivo."
        );

    }

}

// Cambia el modo de operación del Point a "PDV" (integración por API).
// Mercado Pago exige reiniciar el dispositivo a mano para que el cambio
// tenga efecto, así que esto no cobra ni imprime nada por sí solo.
export async function configurarModoPDV() {

    const deviceId = obtenerDeviceId();

    if (!deviceId) {

        throw new Error("No hay un dispositivo Point configurado.");

    }

    await llamarApi("/point/integration-api/devices/" + deviceId, {

        method: "PATCH",
        body: JSON.stringify({ operating_mode: "PDV" })

    });

    return { operatingMode: "PDV" };

}

// "tipo": "transferencia" (QR / billetera / débito interoperable),
// "debito" o "credito" (tarjeta con el lector físico, distinguiendo el
// tipo de plástico). Si Mercado Pago no distingue el medio por
// adelantado, el dispositivo le pregunta al cliente en pantalla.
function tipoAPaymentMethod(tipo) {

    if (tipo === "credito" || tipo === "tarjeta") return { default_type: "credit_card" };

    if (tipo === "debito") return { default_type: "debit_card" };

    return undefined;

}

export async function crearCobro({ monto, tipo, referencia }) {

    const deviceId = obtenerDeviceId();

    if (!deviceId) {

        throw new Error("No hay un dispositivo Point configurado.");

    }

    await verificarModoPDV(deviceId);

    const body = {

        type: "point",
        external_reference: referencia,
        transactions: {
            payments: [
                // Mercado Pago espera el monto como string con dos decimales.
                { amount: Number(monto).toFixed(2) }
            ]
        },
        config: {
            point: {
                terminal_id: deviceId,
                // El comprobante propio de MP queda apagado: el ticket que
                // se imprime en el Point es el de FORRALITAS (ver mp:imprimir-ticket).
                print_on_terminal: "no_ticket"
            },
            ...(tipoAPaymentMethod(tipo) ? { payment_method: tipoAPaymentMethod(tipo) } : {})
        }

    };

    const datos = await llamarApi("/v1/orders", {

        method: "POST",
        body: JSON.stringify(body)

    });

    return { orderId: datos.id, status: datos.status };

}

export async function consultarCobro(orderId) {

    const datos = await llamarApi("/v1/orders/" + orderId, { method: "GET" });

    const pago = (datos.transactions && datos.transactions.payments && datos.transactions.payments[0]) || null;

    return {

        status: datos.status,
        aprobado: datos.status === "processed" || datos.status === "finished",
        rechazado: datos.status === "error" || datos.status === "canceled",
        paymentId: pago ? pago.id : null

    };

}

export async function cancelarCobro(orderId) {

    await llamarApi("/v1/orders/" + orderId + "/cancel", { method: "POST" });

    return { cancelado: true };

}

/* ==========================================
   EL POINT COMO IMPRESORA DE TICKETS
   ------------------------------------------
   Esto no cobra nada: solo le manda al Point la
   orden de imprimir el ticket de la venta (sea
   efectivo, transferencia o tarjeta), usando la
   Terminals API. El contenido ya viene armado
   con las etiquetas de formato de Mercado Pago
   (ver generarTicketContenidoPoint en ticket.js).
========================================== */

/* ==========================================
   TRANSFERENCIAS / QR RECIBIDAS
   ------------------------------------------
   No existe (todavía) un webhook público al que
   Mercado Pago le pueda avisar, porque la app
   corre en la PC del local y no en un servidor
   con dirección pública. Así que en vez de
   esperar el aviso, el renderer consulta cada
   pocos segundos los últimos pagos acreditados
   en la cuenta (Payments Search API) y detecta
   ahí las transferencias/pagos con QR nuevos.

   Se filtran los pagos con tarjeta (los cobros
   por Point ya se registran solos por su propio
   camino en crearCobro/consultarCobro) para no
   mezclar los dos flujos.
========================================== */

const TIPOS_TARJETA = ["credit_card", "debit_card", "prepaid_card"];

export async function buscarPagosRecientes({ desde }) {

    const inicio = desde || new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const parametros = new URLSearchParams({

        sort: "date_created",
        criteria: "desc",
        range: "date_created",
        begin_date: inicio,
        end_date: new Date().toISOString(),
        limit: "30"

    });

    const datos = await llamarApi("/v1/payments/search?" + parametros.toString(), { method: "GET" });

    const resultados = (datos && datos.results) || [];

    return resultados

        .filter(p =>

            p.status === "approved"

            && !TIPOS_TARJETA.includes(p.payment_type_id)

        )

        .map(p => ({

            id: String(p.id),
            monto: Number(p.transaction_amount),
            fecha: p.date_created,
            tipoOperacion: p.operation_type,
            tipoPago: p.payment_type_id

        }));

}

export async function imprimirEnTerminal({ contenido, referencia }) {

    const deviceId = obtenerDeviceId();

    if (!deviceId) {

        throw new Error("No hay un dispositivo Point configurado.");

    }

    if (!contenido) {

        throw new Error("No hay contenido de ticket para imprimir.");

    }

    await verificarModoPDV(deviceId);

    const body = {

        type: "print",
        external_reference: referencia || cryptoRandomId(),
        config: {
            point: {
                terminal_id: deviceId,
                subtype: "custom"
            }
        },
        content: contenido

    };

    const datos = await llamarApi("/terminals/v1/actions", {

        method: "POST",
        body: JSON.stringify(body)

    });

    return { accionId: datos.id, status: datos.status };

}
