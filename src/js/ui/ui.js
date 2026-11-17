/* ==========================================
   UI - UTILIDADES, MODALES Y NOTIFICACIONES
========================================== */

let confirmacionCallback = null;

/* ==========================================
   TEXTO SEGURO
   Todo dato cargado por una persona (nombres,
   descripciones, notas) pasa por esc() antes
   de mostrarse, para que un nombre con
   símbolos como < > " ' no rompa la pantalla.
========================================== */

function esc(valor){

    return String(valor === null || valor === undefined ? "" : valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}

/* ==========================================
   IDENTIFICADORES
   Prefijo + fecha + letras al azar: dos PCs
   que cargan algo en el mismo instante nunca
   generan el mismo identificador.
========================================== */

function nuevoId(prefijo){

    return prefijo + Date.now() + Math.random().toString(36).slice(2, 6);

}

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

function numeroDe(id){

    const el = document.getElementById(id);

    if(!el) return 0;

    return Number(String(el.value).replace(",", ".")) || 0;

}

/* Evita errores de decimales (0.1 + 0.2 = 0.30000000000000004). */
function redondear(n, decimales = 4){

    const f = Math.pow(10, decimales);

    return Math.round((Number(n) || 0) * f) / f;

}

/* ==========================================
   MODALES
========================================== */

function abrir(id){

    const el = document.getElementById(id);

    if(el) el.classList.remove("oculto");

}

function cerrar(id){

    const el = document.getElementById(id);

    if(el) el.classList.add("oculto");

}

function cerrarModalProducto(){ cerrar("modalProducto"); }

function cerrarModalCliente(){ cerrar("modalCliente"); }

function cerrarModalCantidad(){

    cerrar("modalCantidad");

    productoVenta = null;

    const preview = document.getElementById("previewCantidad");

    if(preview) preview.textContent = "";

}

function cerrarModalPrecioCliente(){ cerrar("modalPrecioCliente"); }

function cerrarModalPagoCliente(){ cerrar("modalPagoCliente"); }

function limpiar(...ids){

    ids.forEach(id=>{

        const el = document.getElementById(id);

        if(el) el.value = "";

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

        const cb = confirmacionCallback;

        confirmacionCallback = null;

        if(cb) cb();

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

    // Escape cierra el modal que esté abierto (el de arriba de todo).
    document.addEventListener("keydown", (e)=>{

        if(e.key !== "Escape") return;

        const abiertos = document.querySelectorAll(".modal:not(.oculto)");

        if(abiertos.length === 0) return;

        const ultimo = abiertos[abiertos.length - 1];

        ultimo.classList.add("oculto");

        if(ultimo.id === "modalConfirmacion") confirmacionCallback = null;

        if(ultimo.id === "modalCantidad") productoVenta = null;

    });

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

    setTimeout(()=> div.remove(), tipo === "success" ? 3200 : 5000);

}

/* ==========================================
   FORMATO
========================================== */

function dinero(valor){

    return "$" + Number(valor || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 });

}

function unidadVenta(modo){

    if(modo === "bolsa") return "Bolsa";

    if(modo === "kg") return "Kg";

    if(modo === "dinero") return "kg";

    return "$";

}

function formatearStock(valor){

    const n = Number(valor || 0);

    if(Number.isInteger(n)) return n;

    return n.toFixed(2);

}

/* ==========================================
   FECHAS
========================================== */

// YYYY-MM-DD en hora local.
function fechaLocalISO(fecha){

    const d = fecha instanceof Date ? fecha : new Date(fecha);

    const año = d.getFullYear();

    const mes = String(d.getMonth() + 1).padStart(2, "0");

    const dia = String(d.getDate()).padStart(2, "0");

    return `${año}-${mes}-${dia}`;

}

// "26/08/2026 16:45" (formato 24 hs).
function fechaHoraTexto(fecha){

    const d = fecha instanceof Date ? fecha : new Date(fecha);

    const dia = String(d.getDate()).padStart(2, "0");

    const mes = String(d.getMonth() + 1).padStart(2, "0");

    const año = d.getFullYear();

    const horas = String(d.getHours()).padStart(2, "0");

    const minutos = String(d.getMinutes()).padStart(2, "0");

    return `${dia}/${mes}/${año} ${horas}:${minutos}`;

}

// "2026-08-26" → "26/08/2026".
function fechaTextoDeISO(fechaISO){

    const partes = String(fechaISO || "").slice(0, 10).split("-");

    if(partes.length !== 3) return "—";

    return `${partes[2]}/${partes[1]}/${partes[0]}`;

}

// Valor para un <input type="datetime-local"> en hora local.
function fechaParaInputLocal(fecha){

    const d = fecha instanceof Date ? fecha : new Date(fecha);

    if(isNaN(d.getTime())) return "";

    return fechaLocalISO(d) + "T"
        + String(d.getHours()).padStart(2, "0") + ":"
        + String(d.getMinutes()).padStart(2, "0");

}

function horaDeFecha(fecha){

    const d = fecha instanceof Date ? fecha : new Date(fecha);

    return d.getHours();

}

/* ==========================================
   ARCHIVOS (exportar)
========================================== */

function descargarArchivo(nombre, contenido, tipo){

    const blob = new Blob([contenido], { type: tipo || "text/plain;charset=utf-8" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = nombre;

    document.body.appendChild(a);

    a.click();

    a.remove();

    setTimeout(()=> URL.revokeObjectURL(url), 2000);

}

/* Arma un CSV que Excel abre directo (separador ; y acentos bien). */
function generarCSV(filas){

    const celda = (v) =>{

        let texto = v === null || v === undefined ? "" : String(v);

        if(typeof v === "number") texto = String(v).replace(".", ",");

        if(/[";\n\r]/.test(texto)) texto = '"' + texto.replace(/"/g, '""') + '"';

        return texto;

    };

    return "﻿" + filas.map(f => f.map(celda).join(";")).join("\r\n");

}

/* ==========================================
   IMPRESIÓN
   Imprime solo el contenido indicado (por
   ejemplo un comprobante o el reporte de caja).
========================================== */

function imprimirHtml(html, clase){

    let zona = document.getElementById("zonaImpresion");

    if(!zona){

        zona = document.createElement("div");

        zona.id = "zonaImpresion";

        document.body.appendChild(zona);

    }

    zona.className = clase || "";

    zona.innerHTML = html;

    document.body.classList.add("imprimiendo");

    const terminar = ()=>{

        document.body.classList.remove("imprimiendo");

        zona.innerHTML = "";

        window.removeEventListener("afterprint", terminar);

    };

    window.addEventListener("afterprint", terminar);

    setTimeout(()=>{

        window.print();

        // Por si el navegador no avisa "afterprint".
        setTimeout(terminar, 1500);

    }, 50);

}

/* ==========================================
   SONIDO (se genera con el navegador, no
   necesita ningún archivo)
========================================== */

function reproducirSonidoVenta(){

    try{

        const Ctx = window.AudioContext || window.webkitAudioContext;

        if(!Ctx) return;

        const ctx = new Ctx();

        [880, 1320].forEach((freq, i) =>{

            const osc = ctx.createOscillator();

            const gain = ctx.createGain();

            osc.type = "sine";

            osc.frequency.value = freq;

            const inicio = ctx.currentTime + i * 0.11;

            gain.gain.setValueAtTime(0.0001, inicio);

            gain.gain.exponentialRampToValueAtTime(0.2, inicio + 0.02);

            gain.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.2);

            osc.connect(gain).connect(ctx.destination);

            osc.start(inicio);

            osc.stop(inicio + 0.22);

        });

        setTimeout(()=> ctx.close().catch(()=>{}), 800);

    }catch(e){ /* sin sonido, no pasa nada */ }

}
