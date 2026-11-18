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

    // El Enter para confirmar este modal (y los demás) lo maneja el
    // listener global de más abajo; acá solo queda la vista previa en vivo.
    const inputCantidad = document.getElementById("inputCantidad");

    if(inputCantidad){

        inputCantidad.addEventListener("input", ()=>{

            if(typeof actualizarPreviewCantidad === "function"){

                actualizarPreviewCantidad();

            }

        });

    }

});

/* ==========================================
   ENTER / ESC EN MODALES
   ------------------------------------------
   Todos los modales siguen la misma estructura
   (.modal > .modalContenido > .accionesModal con
   un .btnGuardar y un .btnCancelar), así que un
   solo listener alcanza para los 15 y pico que
   hay en vez de cablear cada uno a mano:
   - Enter confirma (clickea el .btnGuardar).
   - Esc cancela (clickea el .btnCancelar, o si el
     modal no tiene uno, simplemente lo cierra).
========================================== */

document.addEventListener("keydown", (e)=>{

    if(e.key !== "Enter" && e.key !== "Escape") return;

    const modalAbierto = document.querySelector(".modal:not(.oculto)");

    if(e.key === "Escape"){

        // Con un modal abierto, el Esc es para ÉL primero (cancela sin
        // tocar la pantalla de detalle que pueda haber debajo).
        if(modalAbierto){

            e.preventDefault();

            const btnCancelar = modalAbierto.querySelector(".btnCancelar");

            if(btnCancelar){

                btnCancelar.click();

            }else{

                cerrar(modalAbierto.id);

            }

            return;

        }

        // Sin modal: Esc es "Volver" en cualquier pantalla de detalle
        // (Cliente, Proveedor, Mezcla, Anotación, etc.), igual que el
        // botón ← Volver de arriba.
        const pantallaAbierta = document.querySelector(".pantallaDetalle:not(.oculto)");

        const btnVolver = pantallaAbierta && pantallaAbierta.querySelector(".btnVolver");

        if(btnVolver){

            e.preventDefault();

            btnVolver.click();

        }

        return;

    }

    if(!modalAbierto) return;

    // Enter: en un textarea tiene que seguir agregando un salto de línea
    // (ej: notas), no disparar el guardado del modal entero. Y si el foco
    // ya está en un botón (Cancelar, + Agregar ingrediente, etc.) se deja
    // que el Enter nativo lo active a ÉL, no al Guardar de otro lado.
    const activo = document.activeElement;

    if(activo && (activo.tagName === "TEXTAREA" || activo.tagName === "BUTTON")) return;

    const btnGuardar = modalAbierto.querySelector(".btnGuardar");

    if(!btnGuardar || btnGuardar.disabled) return;

    e.preventDefault();

    btnGuardar.click();

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
