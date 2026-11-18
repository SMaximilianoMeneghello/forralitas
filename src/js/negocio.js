/* ==========================================
   DATOS DEL NEGOCIO Y REGLAS PROPIAS
   ------------------------------------------
   Lo que antes estaba escrito en el código y
   ahora se configura desde Configuración >
   Negocio (solo el administrador):

   - Nombre, CUIT, condición frente al IVA,
     dirección, teléfono y pie del ticket.
   - Recargo por tarjeta de crédito.
   - "Reservas" de la Caja: plata a separar
     por cada bolsa (o kilo suelto) vendida de
     ciertos productos (antes: Separar Maíz y
     Separar Alfa, con montos fijos).

   Se guarda dentro de configuracionSistema
   (se sincroniza entre las PCs del negocio).
========================================== */

const DATOS_NEGOCIO_DEFECTO = {
    nombre: "",
    cuit: "",
    condicionIva: "",
    direccion: "",
    telefono: "",
    pieTicket: "¡Gracias por su compra!"
};

const RECARGO_CREDITO_DEFECTO = 15;

// Reservas que estaban escritas en el código hasta la 1.0.19 (mismos
// productos y montos). Se usan mientras no se guarden otras.
const RESERVAS_FORRALITAS_ANTERIORES = [
    ...["MAIZ X 40 KG", "MAIZ 40 KG", "MAIZ QUEBRADO", "MAIZ QUEBRADO X 40 KG", "MAIZ QUEBRADO 40 KG", "MAIZ QUEBRADO X BOLSA"]
        .map(producto => ({ grupo: "🌽 Separar Maíz", producto, porBolsa: 11000, porKg: 300 })),
    ...["MAIZ X 45 KG", "MAIZ 45 KG", "MAIZ X 50 KG", "MAIZ 50 KG"]
        .map(producto => ({ grupo: "🌽 Separar Maíz", producto, porBolsa: 12000, porKg: 300 })),
    { grupo: "🌿 Separar Alfa", producto: "ALFA VERDE", porBolsa: 5000, porKg: 0 }
];

function datosNegocio(){

    const guardados = (configuracionSistema && configuracionSistema.negocio && configuracionSistema.negocio.datos) || {};

    return { ...DATOS_NEGOCIO_DEFECTO, ...guardados };

}

/* Nombre para mostrar: el configurado, o "FORRALITAS" si todavía no se
   cargó ninguno. */
function nombreNegocio(){

    const nombre = String(datosNegocio().nombre || "").trim();

    return nombre || "FORRALITAS";

}

/* Escapa un texto para mostrarlo dentro del HTML sin que se rompa (por
   ejemplo, un nombre con apóstrofo o con "<"). */
function escaparHtml(texto){

    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}

function porcentajeRecargoCredito(){

    const valor = Number(configuracionSistema?.ventas?.recargoCredito);

    return Number.isFinite(valor) && valor >= 0 ? valor : RECARGO_CREDITO_DEFECTO;

}

function claveProducto(nombre){

    return (nombre || "")
        .toString()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

}

/* Reglas de reserva vigentes: las guardadas en Configuración, o las que
   estaban escritas en el código hasta la 1.0.19 si todavía no se guardó
   ninguna (así la Caja sigue mostrando lo mismo que antes). */
function reservasConfiguradas(){

    const guardadas = configuracionSistema?.caja?.reservas;

    if(Array.isArray(guardadas)) return guardadas;

    return RESERVAS_FORRALITAS_ANTERIORES;

}

/* ==========================================
   CÁLCULO DE RESERVAS (usado en Caja)
========================================== */

// Qué hay que separar de una venta, agrupado por reserva.
function calcularSeparacionVenta(venta){

    const reglas = reservasConfiguradas().map(r => ({ ...r, clave: claveProducto(r.producto) }));

    const resultado = {};

    (venta.productos || []).forEach(item =>{

        const clave = claveProducto(item.nombre);

        const regla = reglas.find(r => (r.productoId && r.productoId === item.id) || r.clave === clave);

        if(!regla) return;

        const grupo = resultado[regla.grupo] || (resultado[regla.grupo] = { bolsas: 0, kg: 0, monto: 0 });

        if(item.modo === "bolsa"){

            const cantidad = Number(item.cantidad || item.bolsas || 0);

            grupo.bolsas += cantidad;
            grupo.monto += cantidad * Number(regla.porBolsa || 0);

            return;

        }

        // Venta suelta (por kilo o por monto): se separa por kilo, si la
        // reserva tiene un monto por kilo.
        if(Number(regla.porKg) > 0){

            const kg = Number(item.kg || (item.modo === "kg" ? item.cantidad : 0)) || 0;

            grupo.kg += kg;
            grupo.monto += kg * Number(regla.porKg);

        }

    });

    return resultado;

}

// Suma una separación al acumulado. "fraccion" es la parte de la venta
// que entró en plata (1 si se cobró completa; monto/total si fue un
// cobro parcial de un fiado).
function sumarSeparaciones(acum, sep, fraccion){

    Object.entries(sep).forEach(([grupo, valores]) =>{

        const destino = acum[grupo] || (acum[grupo] = { bolsas: 0, kg: 0, monto: 0 });

        destino.bolsas += valores.bolsas * fraccion;
        destino.kg += valores.kg * fraccion;
        destino.monto += valores.monto * fraccion;

    });

    return acum;

}

function tarjetasReservasHTML(separar){

    // Se muestran todas las reservas configuradas, aunque estén en cero.
    const grupos = [...new Set(reservasConfiguradas().map(r => r.grupo))];

    return grupos.map(grupo =>{

        const valores = separar[grupo] || { bolsas: 0, kg: 0, monto: 0 };

        const detalle = [formatearStock(valores.bolsas) + " bolsas"];

        if(valores.kg > 0) detalle.push(formatearStock(valores.kg) + " kg sueltos");

        return `
            <div class="cardMetrica">
                <small>${escaparHtml(grupo)}</small>
                <h2>${dinero(valores.monto)}</h2>
                <span class="subMetrica">${detalle.join(" · ")}</span>
            </div>
        `;

    }).join("");

}

/* ==========================================
   APLICAR EN PANTALLA
========================================== */

function aplicarDatosNegocio(){

    const nombre = nombreNegocio();

    const logo = document.querySelector(".sidebar .logo");

    if(logo){

        logo.textContent = nombre;

        logo.classList.toggle("logoLargo", nombre.length > 12);

    }

    document.title = nombre + " · Gestión";

    localStorage.setItem("nombreNegocioRecordado", nombre);

}

// En el login todavía no hay sesión: se muestra el último nombre usado
// en esta PC.
function aplicarNombreEnLogin(){

    const logo = document.querySelector("#pantallaLogin .loginLogo");

    const recordado = localStorage.getItem("nombreNegocioRecordado");

    if(logo && recordado) logo.textContent = recordado;

}

document.addEventListener("DOMContentLoaded", aplicarNombreEnLogin);

/* ==========================================
   CONFIGURACIÓN (solo admin)
========================================== */

function htmlConfigNegocio(){

    const d = datosNegocio();

    const campo = (id, etiqueta, valor, ayuda = "") => `
        <label>${etiqueta}</label>
        <input id="${id}" type="text" autocomplete="off" value="${escaparHtml(valor)}" ${ayuda ? `placeholder="${escaparHtml(ayuda)}"` : ""}>
    `;

    return `
        <div class="cardConfig">
            <h2>🏪 Datos del negocio</h2>
            <p class="notaConfig">Salen en el ticket y en el menú de la izquierda.</p>

            ${campo("negocioNombre", "Nombre", d.nombre, "Ej: Forrajería Don Pedro")}
            ${campo("negocioCuit", "CUIT", d.cuit, "Ej: 20-12345678-9")}

            <label>Condición frente al IVA</label>
            <select id="negocioCondicionIva">
                ${["", "Monotributista", "Responsable Inscripto", "Exento"].map(op =>
                    `<option value="${op}" ${d.condicionIva === op ? "selected" : ""}>${op || "Sin especificar"}</option>`
                ).join("")}
            </select>

            ${campo("negocioDireccion", "Dirección", d.direccion)}
            ${campo("negocioTelefono", "Teléfono / WhatsApp", d.telefono)}
            ${campo("negocioPieTicket", "Mensaje al pie del ticket", d.pieTicket)}

            <button class="btnGuardar" id="guardarDatosNegocio">Guardar datos del negocio</button>
        </div>

        <div class="cardConfig cardAncha">
            <h2>🧺 Reservas de la Caja</h2>
            <p class="notaConfig">
                Plata para apartar por cada bolsa vendida de un producto (por ejemplo,
                para reponer mercadería). Aparecen como tarjetas en Caja. Si ponés un
                monto por kilo, también se separa en las ventas sueltas. Las reservas
                con el mismo nombre se suman en una sola tarjeta.
            </p>

            <div class="tablaClientes">
                <table>
                    <thead>
                        <tr>
                            <th>Reserva</th>
                            <th>Producto</th>
                            <th>$ por bolsa</th>
                            <th>$ por kg suelto</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="tablaReservasConfig"></tbody>
                </table>
            </div>

            <div class="accionesConfig">
                <button class="btnCancelar" id="btnAgregarReserva" type="button">+ Agregar reserva</button>
                <button class="btnGuardar" id="guardarReservas">Guardar reservas</button>
            </div>
        </div>
    `;

}

let reservasEnEdicion = [];

function opcionesProductosReserva(seleccionado){

    const nombres = productos.map(p => p.nombre);

    if(seleccionado && !nombres.some(n => claveProducto(n) === claveProducto(seleccionado))){

        nombres.unshift(seleccionado);

    }

    return `<option value="">Elegí un producto</option>` + nombres.map(n =>
        `<option value="${escaparHtml(n)}" ${claveProducto(n) === claveProducto(seleccionado) ? "selected" : ""}>${escaparHtml(n)}</option>`
    ).join("");

}

function dibujarTablaReservas(){

    const tbody = document.getElementById("tablaReservasConfig");

    if(!tbody) return;

    if(!reservasEnEdicion.length){

        tbody.innerHTML = `<tr><td colspan="5" class="tablaVacia">No hay reservas. Agregá una si querés apartar plata por producto.</td></tr>`;

        return;

    }

    tbody.innerHTML = reservasEnEdicion.map((r, i) => `
        <tr>
            <td><input data-reserva="${i}" data-campo="grupo" type="text" value="${escaparHtml(r.grupo)}" placeholder="Ej: Separar Maíz"></td>
            <td><select data-reserva="${i}" data-campo="producto">${opcionesProductosReserva(r.producto)}</select></td>
            <td><input data-reserva="${i}" data-campo="porBolsa" type="text" inputmode="decimal" value="${Number(r.porBolsa) || 0}" oninput="limpiarNumero(this)"></td>
            <td><input data-reserva="${i}" data-campo="porKg" type="text" inputmode="decimal" value="${Number(r.porKg) || 0}" oninput="limpiarNumero(this)"></td>
            <td><button class="btnAccion btnBorrar" type="button" title="Quitar" onclick="quitarReservaConfig(${i})">🗑️</button></td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-reserva]").forEach(el =>{

        el.addEventListener("input", () =>{

            const r = reservasEnEdicion[Number(el.dataset.reserva)];

            r[el.dataset.campo] = el.value;

        });

        el.addEventListener("change", () =>{

            const r = reservasEnEdicion[Number(el.dataset.reserva)];

            r[el.dataset.campo] = el.value;

        });

    });

}

function quitarReservaConfig(indice){

    reservasEnEdicion.splice(indice, 1);

    dibujarTablaReservas();

}

function iniciarConfigNegocio(){

    const boton = document.getElementById("guardarDatosNegocio");

    if(!boton) return;

    boton.onclick = guardarDatosNegocio;

    // En el editor solo se muestran las reservas de productos que existen
    // (las anteriores de Forralitas incluyen varios nombres posibles).
    const claves = new Set(productos.map(p => claveProducto(p.nombre)));

    const guardadas = Array.isArray(configuracionSistema?.caja?.reservas);

    reservasEnEdicion = reservasConfiguradas()
        .filter(r => guardadas || claves.has(claveProducto(r.producto)))
        .map(r => ({ ...r }));

    dibujarTablaReservas();

    document.getElementById("btnAgregarReserva").onclick = () =>{

        reservasEnEdicion.push({ grupo: "", producto: "", porBolsa: 0, porKg: 0 });

        dibujarTablaReservas();

    };

    document.getElementById("guardarReservas").onclick = guardarReservasConfig;

}

function guardarDatosNegocio(){

    const valor = (id) => (document.getElementById(id)?.value || "").trim();

    configuracionSistema.negocio.datos = {
        nombre: valor("negocioNombre"),
        cuit: valor("negocioCuit"),
        condicionIva: valor("negocioCondicionIva"),
        direccion: valor("negocioDireccion"),
        telefono: valor("negocioTelefono"),
        pieTicket: valor("negocioPieTicket")
    };

    guardarConfiguracion();

    aplicarDatosNegocio();

    notificacion("Datos del negocio guardados.");

}

function guardarReservasConfig(){

    const reservas = [];

    for(const r of reservasEnEdicion){

        const grupo = String(r.grupo || "").trim();

        const producto = String(r.producto || "").trim();

        if(!grupo && !producto) continue;

        if(!grupo || !producto){

            notificacion("Cada reserva necesita un nombre y un producto.", "warning");

            return;

        }

        const encontrado = productos.find(p => claveProducto(p.nombre) === claveProducto(producto));

        reservas.push({
            grupo,
            producto,
            productoId: encontrado ? encontrado.id : null,
            porBolsa: Number(r.porBolsa) || 0,
            porKg: Number(r.porKg) || 0
        });

    }

    if(!configuracionSistema.caja) configuracionSistema.caja = {};

    configuracionSistema.caja.reservas = reservas;

    guardarConfiguracion();

    reservasEnEdicion = reservas.map(r => ({ ...r }));

    dibujarTablaReservas();

    notificacion("Reservas guardadas.");

}
