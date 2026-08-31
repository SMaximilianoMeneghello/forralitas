/* ==========================================
   UI - MODALES Y NOTIFICACIONES
========================================== */

let confirmacionCallback = null;

/* ==========================================
   CAMPOS NUMÉRICOS "LIBRES"
   (sin flechitas ni cambio con la rueda del mouse,
   el usuario solo puede escribir el número)
========================================== */

function limpiarNumero(input){

    if(!input) return;

    let valor = input.value.replace(",", ".");

    valor = valor.replace(/[^0-9.]/g, "");

    const partes = valor.split(".");

    if(partes.length > 2){

        valor = partes[0] + "." + partes.slice(1).join("");

    }

    input.value = valor;

}

/* ==========================================
   MODALES
========================================== */

function abrir(id){

    document.getElementById(id).classList.remove("oculto");

}

function cerrar(id){

    document.getElementById(id).classList.add("oculto");

}


function cerrarModalProducto(){

    cerrar("modalProducto");

}

function cerrarModalCliente(){

    cerrar("modalCliente");

}

function cerrarModalCantidad(){

    cerrar("modalCantidad");

    productoVenta = null;

    const preview = document.getElementById("previewCantidad");

    if(preview) preview.textContent = "";

}

function cerrarModalPrecioCliente(){

    cerrar("modalPrecioCliente");

}

function cerrarModalPagoCliente(){

    cerrar("modalPagoCliente");

}

function limpiar(...ids){

    ids.forEach(id=>{

        const el = document.getElementById(id);

        if(!el) return;

        if(el.tagName === "TEXTAREA"){

            el.value = "";

        }else{

            el.value = "";

        }

    });

}

/* ==========================================
   CONFIRMACION
========================================== */

function confirmar(texto, callback){

    document.getElementById("textoConfirmacion").textContent = texto;

    confirmacionCallback = callback;

    abrir("modalConfirmacion");

}

document.addEventListener("DOMContentLoaded", ()=>{

    const btnAceptar = document.getElementById("btnAceptarConfirmacion");

    const btnCancelar = document.getElementById("btnCancelarConfirmacion");

    if(btnAceptar) btnAceptar.onclick = ()=>{

        cerrar("modalConfirmacion");

        if(confirmacionCallback){

            confirmacionCallback();

            confirmacionCallback = null;

        }

    };

    if(btnCancelar) btnCancelar.onclick = ()=>{

        cerrar("modalConfirmacion");

        confirmacionCallback = null;

    };

    const inputCantidad = document.getElementById("inputCantidad");

    if(inputCantidad){

        inputCantidad.addEventListener("keydown", (e)=>{

            if(e.key === "Enter"){

                e.preventDefault();
                e.stopPropagation();

                confirmarCantidad();

            }

        });

        inputCantidad.addEventListener("input", ()=>{

            if(typeof actualizarPreviewCantidad === "function"){

                actualizarPreviewCantidad();

            }

        });

    }

    // Enter en el modal de pago de cliente.
    const montoPago = document.getElementById("montoPagoCliente");

    if(montoPago){

        montoPago.addEventListener("keydown", (e)=>{

            if(e.key === "Enter"){

                e.preventDefault();

                guardarPagoCliente();

            }

        });

    }

    // Enter en el modal de precio de cliente.
    const precioKgCliente = document.getElementById("precioKgCliente");

    if(precioKgCliente){

        precioKgCliente.addEventListener("keydown", (e)=>{

            if(e.key === "Enter"){

                e.preventDefault();

                guardarPrecioCliente();

            }

        });

    }

});

/* ==========================================
   NOTIFICACIONES
========================================== */

function notificacion(mensaje, tipo = "success"){

    const contenedor = document.getElementById("contenedorNotificaciones");

    if(!contenedor) return;

    const div = document.createElement("div");

    div.className = "notificacion " + tipo;

    div.textContent = mensaje;

    contenedor.appendChild(div);

    setTimeout(()=> div.remove(), 3200);

}

/* ==========================================
   FORMATO
========================================== */

function dinero(valor){

    return "$" + Number(valor || 0).toLocaleString("es-AR");

}

function unidadVenta(modo){

    if(modo === "bolsa") return "Bolsa";

    if(modo === "kg") return "Kg";

    if(modo==="dinero") return "kg";

    return "$";

}

/* ==========================================
   FORMATEAR STOCK
========================================== */

function formatearStock(valor){

    const n = Number(valor || 0);

    if(Number.isInteger(n)) return n;

    return n.toFixed(2);

}

/* ==========================================
   FECHA (YYYY-MM-DD local)
========================================== */

function fechaLocalISO(fecha){

    const d = fecha instanceof Date ? fecha : new Date(fecha);

    const año = d.getFullYear();

    const mes = String(d.getMonth() + 1).padStart(2, "0");

    const dia = String(d.getDate()).padStart(2, "0");

    return `${año}-${mes}-${dia}`;

}

/* ==========================================
   FECHA Y HORA EN TEXTO (formato 24 hs)
   Ej: "26/08/2026 16:45"
========================================== */

function fechaHoraTexto(fecha){

    const d = fecha instanceof Date ? fecha : new Date(fecha);

    const dia = String(d.getDate()).padStart(2, "0");

    const mes = String(d.getMonth() + 1).padStart(2, "0");

    const año = d.getFullYear();

    const horas = String(d.getHours()).padStart(2, "0");

    const minutos = String(d.getMinutes()).padStart(2, "0");

    return `${dia}/${mes}/${año} ${horas}:${minutos}`;

}

/* ==========================================
   HORA (0-23) DE UNA FECHA
========================================== */

function horaDeFecha(fecha){

    const d = fecha instanceof Date ? fecha : new Date(fecha);

    return d.getHours();

}
