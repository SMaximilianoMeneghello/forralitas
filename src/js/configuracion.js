/* ==========================================
   CONFIGURACIÓN
========================================== */

const CONFIG_DEFAULT = {

    tema:{

        color:"#1F5D3A",

        acento:"#D4A34E",

        fondo:"#F7F4EE",

        fuente:16,

        radio:18,

        animaciones:true,

        sombras:true,

        efectos:"suave"

    },

    dashboard:{

        mostrarUltimasVentas:true,

        mostrarStock:true,

        mostrarClientes:true,

        mostrarGastos:true,

        cantidadVentas:5

    },

    ventas:{

        confirmarEliminar:true,

        confirmarVenta:false,

        sonidoVenta:true,

        ventaRapida:true

    },

    inventario:{

        stockMinimo:5,

        alertas:true,

        mostrarSinStock:true

    },

    negocio:{

        imprimirTicketAutomatico:true,

        detectarTransferenciasMP:true

    }

};

let configuracionSistema = JSON.parse(localStorage.getItem("configuracionSistema")) || CONFIG_DEFAULT;

// Completa con los valores por defecto cualquier sección que falte
// (ej. configuraciones guardadas -local o en Firebase- antes de
// agregar "negocio" para Mercado Pago/impresión). Sin esto, leer un
// campo de una sección faltante tira error y la pantalla de
// Configuración queda en blanco.
function normalizarConfiguracionSistema(){

    Object.keys(CONFIG_DEFAULT).forEach(seccion =>{

        if(!configuracionSistema[seccion]){

            configuracionSistema[seccion] = { ...CONFIG_DEFAULT[seccion] };

        }

    });

}

normalizarConfiguracionSistema();

function guardarConfiguracion(){

    localStorage.setItem("configuracionSistema", JSON.stringify(configuracionSistema));

    if(window.FirebaseDB) window.FirebaseDB.guardarColeccion("configuracionSistema", configuracionSistema);

}

/* ==========================================
   SINCRONIZAR CONFIGURACIÓN CON FIREBASE
   La app ya se pinta con el valor local/por
   defecto al instante; esto la actualiza si
   hay una configuración distinta en la nube.
========================================== */
async function sincronizarConfiguracionFirebase(){

    if(!window.FirebaseDB) return;

    const remoto = await window.FirebaseDB.leerColeccion("configuracionSistema");

    if(remoto === undefined) return; // sin conexión

    if(remoto === null){

        window.FirebaseDB.guardarColeccion("configuracionSistema", configuracionSistema);

    }else{

        configuracionSistema = remoto;
        normalizarConfiguracionSistema();

        localStorage.setItem("configuracionSistema", JSON.stringify(configuracionSistema));

        aplicarTema();

    }

    aplicarDatosNegocio();

    window.FirebaseDB.escucharColeccion("configuracionSistema", (remoto) =>{

        configuracionSistema = remoto;
        normalizarConfiguracionSistema();

        localStorage.setItem("configuracionSistema", JSON.stringify(configuracionSistema));

        aplicarTema();

        aplicarDatosNegocio();

    });

}

/* ==========================================
   PALETAS Y TEMA
   Los colores guardados (configuracionSistema.tema)
   son la fuente de verdad. De ellos se derivan los
   tonos (oscuros, claros, suaves) y se aplican como
   variables CSS en toda la app.
========================================== */

const PALETAS_TEMA = {

    forralitas: { nombre: "Forralitas", principal: "#1F5D3A", acento: "#D4A34E", fondo: "#F7F4EE" },
    campo:      { nombre: "Campo",      principal: "#3D6B2C", acento: "#E0A526", fondo: "#F6F5EC" },
    oceano:     { nombre: "Océano",     principal: "#1D4E6B", acento: "#3FB6C6", fondo: "#EEF5F8" },
    tierra:     { nombre: "Tierra",     principal: "#6B4A2B", acento: "#C97B3A", fondo: "#F8F1E7" },
    carbon:     { nombre: "Carbón",     principal: "#2F3A35", acento: "#7FD1A6", fondo: "#EEF1EF" }

};

function hexARgb(hex){

    const h = String(hex || "#000000").replace("#", "");

    const n = h.length === 3 ? h.split("").map(c => c + c).join("") : h.padEnd(6, "0");

    return [0, 2, 4].map(i => parseInt(n.substr(i, 2), 16) || 0);

}

// t = 0 devuelve "a", t = 1 devuelve "b".
function mezclarColor(a, b, t){

    const pa = hexARgb(a);
    const pb = hexARgb(b);

    return "#" + pa
        .map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0"))
        .join("");

}

// Tema vigente: lo guardado completado con los valores por defecto
// (así las configuraciones viejas no rompen las nuevas opciones).
function temaActual(){

    return { ...CONFIG_DEFAULT.tema, ...(configuracionSistema.tema || {}) };

}

function aplicarTema(temaForzado){

    const t = temaForzado
        ? { ...CONFIG_DEFAULT.tema, ...temaForzado }
        : temaActual();

    const principal = t.color;
    const acento = t.acento;
    const fondo = t.fondo;
    const radio = Number(t.radio) || 18;

    const raiz = document.documentElement.style;

    const set = (nombre, valor) => raiz.setProperty(nombre, valor);

    // Color principal y sus tonos
    set("--verde", principal);
    set("--verdeHover", mezclarColor(principal, "#000000", .18));
    set("--verde-brote", mezclarColor(principal, "#ffffff", .28));
    set("--verde-suave", mezclarColor(principal, "#ffffff", .9));
    set("--color-principal", principal);
    set("--color-primario", principal);
    set("--color-primario-osc", mezclarColor(principal, "#000000", .18));
    set("--color-exito", principal);
    set("--success", principal);

    // Menú lateral (degradé de tres tonos)
    set("--sidebar-1", mezclarColor(principal, "#ffffff", .08));
    set("--sidebar-2", principal);
    set("--sidebar-3", mezclarColor(principal, "#000000", .35));

    // Acento (trigo en la paleta original)
    set("--trigo", acento);
    set("--amarillo", acento);
    set("--warning", acento);
    set("--trigo-suave", mezclarColor(acento, "#ffffff", .8));

    // Fondo y bordes
    set("--color-fondo", fondo);
    set("--color-borde", mezclarColor(principal, "#ffffff", .86));

    // Forma
    set("--radio", radio + "px");
    set("--radio-sm", Math.round(radio * .75) + "px");
    set("--radio-chico", Math.round(radio * .6) + "px");
    set("--radio-boton", Math.round(radio * .6) + "px");
    set("--radio-lg", (radio + 6) + "px");

    document.documentElement.style.fontSize = (Number(t.fuente) || 16) + "px";

    document.body.classList.toggle("sinSombras", !t.sombras);
    document.body.classList.toggle("sinAnimaciones", !t.animaciones);

    document.body.classList.remove("efectos-off", "efectos-suave", "efectos-intenso");
    document.body.classList.add("efectos-" + (["off", "suave", "intenso"].includes(t.efectos) ? t.efectos : "suave"));

}

aplicarTema();


/* ==========================================
   TAMAÑO DE TARJETAS
   (preferencia local de esta computadora,
   no se sincroniza con Firebase a propósito)
========================================== */

function escalaTarjetasActual(){

    return localStorage.getItem("escalaTarjetas") || "normal";

}

function aplicarEscalaTarjetas(){

    const escala = escalaTarjetasActual();

    document.body.classList.remove("tarjetasChicas", "tarjetasGrandes");

    if(escala === "chicas") document.body.classList.add("tarjetasChicas");

    if(escala === "grandes") document.body.classList.add("tarjetasGrandes");

}

function guardarEscalaTarjetas(){

    const valor = document.getElementById("escalaTarjetas").value;

    localStorage.setItem("escalaTarjetas", valor);

    aplicarEscalaTarjetas();

    notificacion("Tamaño de tarjetas actualizado (solo en esta computadora).", "success");

}

aplicarEscalaTarjetas();

/* ==========================================
   RENDER CONFIGURACIÓN
   Ordenada en secciones (pestañas) para que
   cada grupo de ajustes quede junto.
========================================== */

const SECCIONES_CONFIG = [

    { id: "cuenta",     icono: "👤", nombre: "Mi cuenta" },
    { id: "apariencia", icono: "🎨", nombre: "Apariencia" },
    { id: "negocio",    icono: "🏪", nombre: "Negocio" },
    { id: "usuarios",   icono: "👥", nombre: "Usuarios", soloAdmin: true },
    { id: "datos",      icono: "💾", nombre: "Sistema" }

];

let seccionConfigActual = "cuenta";

function mostrarSeccionConfig(id){

    seccionConfigActual = id;

    document.querySelectorAll(".configTab").forEach(b =>
        b.classList.toggle("activo", b.dataset.seccion === id)
    );

    document.querySelectorAll(".seccionConfig").forEach(s =>
        s.classList.toggle("oculto", s.dataset.seccion !== id)
    );

}

function renderConfiguracion(){

    const t = temaActual();

    const admin = esAdmin();

    const secciones = SECCIONES_CONFIG.filter(s => !s.soloAdmin || admin);

    if(!secciones.some(s => s.id === seccionConfigActual)) seccionConfigActual = "cuenta";

    contenido().innerHTML = `

    <div class="configuracion">

        <nav class="configTabs">
            ${secciones.map(s => `
                <button class="configTab" data-seccion="${s.id}">
                    <span class="configTabIcono">${s.icono}</span>
                    <span>${s.nombre}</span>
                </button>
            `).join("")}
        </nav>

        <!-- ============ MI CUENTA ============ -->
        <section class="seccionConfig" data-seccion="cuenta">
            <div class="configGrid">

                <div class="cardConfig">
                    <h2>👤 Mi cuenta</h2>
                    <p><b>Nombre:</b> ${usuarioActual.nombre}</p>
                    <p><b>Usuario:</b> ${usuarioActual.usuario}</p>
                    <p><b>Rol:</b> ${usuarioActual.rol}</p>
                </div>

                <div class="cardConfig">
                    <h2>🔐 Contraseña</h2>

                    <div class="grupoInput">
                        <label>Actual</label>
                        <input id="passwordActual" type="password">
                    </div>

                    <div class="grupoInput">
                        <label>Nueva</label>
                        <input id="passwordNueva" type="password">
                    </div>

                    <div class="grupoInput">
                        <label>Repetir</label>
                        <input id="passwordRepetir" type="password">
                    </div>

                    <button class="btnGuardar" id="btnCambiarPassword">Guardar contraseña</button>
                </div>

            </div>
        </section>

        <!-- ============ APARIENCIA ============ -->
        <section class="seccionConfig" data-seccion="apariencia">
            <div class="configGrid">

                <div class="cardConfig cardAncha">
                    <h2>🎨 Paleta de colores</h2>
                    <p class="notaConfig">
                        Elegí una paleta predefinida o armá la tuya. Los cambios se ven
                        al momento; tocá <b>Guardar apariencia</b> para dejarlos.
                    </p>

                    <div class="paletasGrid">
                        ${Object.entries(PALETAS_TEMA).map(([id, p]) => `
                            <button class="paletaOpcion" data-paleta="${id}"
                                style="--p1:${p.principal};--p2:${p.acento};--p3:${p.fondo}">
                                <span class="paletaMuestra"><i></i><i></i><i></i></span>
                                <strong>${p.nombre}</strong>
                            </button>
                        `).join("")}
                    </div>

                    <div class="coloresTema">
                        <div class="campoColor">
                            <label>Principal</label>
                            <input id="colorPrincipal" type="color" value="${t.color}">
                        </div>
                        <div class="campoColor">
                            <label>Acento</label>
                            <input id="colorAcento" type="color" value="${t.acento}">
                        </div>
                        <div class="campoColor">
                            <label>Fondo</label>
                            <input id="colorFondo" type="color" value="${t.fondo}">
                        </div>
                    </div>
                </div>

                <div class="cardConfig">
                    <h2>✨ Forma y movimiento</h2>

                    <label>Tamaño de letra <span class="valorConfig" id="valorFuente">${t.fuente}px</span></label>
                    <input id="tamFuente" type="range" min="12" max="22" value="${t.fuente}">

                    <label>Redondeado de bordes <span class="valorConfig" id="valorRadio">${t.radio}px</span></label>
                    <input id="radio" type="range" min="0" max="35" value="${t.radio}">

                    <label>Efectos con el cursor</label>
                    <select id="efectosCursor">
                        <option value="off" ${t.efectos === "off" ? "selected" : ""}>Apagados</option>
                        <option value="suave" ${t.efectos === "suave" ? "selected" : ""}>Suaves</option>
                        <option value="intenso" ${t.efectos === "intenso" ? "selected" : ""}>Intensos</option>
                    </select>

                    <div class="filasSwitch">
                        <label class="switchConfig">
                            <input id="sombras" type="checkbox" ${t.sombras ? "checked" : ""}>
                            <span class="switchPista"></span>
                            Sombras
                        </label>
                        <label class="switchConfig">
                            <input id="animaciones" type="checkbox" ${t.animaciones ? "checked" : ""}>
                            <span class="switchPista"></span>
                            Animaciones
                        </label>
                    </div>
                </div>

                <div class="cardConfig">
                    <h2>👁️ Vista previa</h2>
                    <div class="previewTema">
                        <div class="previewMenu">
                            <span class="previewLogo">FORRALITAS</span>
                            <i class="previewItem activo"></i>
                            <i class="previewItem"></i>
                            <i class="previewItem"></i>
                        </div>
                        <div class="previewContenido">
                            <div class="previewTarjeta">
                                <small>Venta total</small>
                                <strong>$1.250.000</strong>
                            </div>
                            <table class="previewTabla">
                                <tr><td>Maíz x 40kg</td><td>20</td></tr>
                                <tr><td>Alfa Verde</td><td>8</td></tr>
                            </table>
                            <button class="btnGuardar previewBoton">Guardar</button>
                        </div>
                    </div>
                </div>

                <div class="cardConfig">
                    <h2>🗂️ Tamaño de tarjetas</h2>
                    <p class="notaConfig">Preferencia de esta computadora: cada PC puede elegir la suya.</p>

                    <label>Tamaño</label>
                    <select id="escalaTarjetas">
                        <option value="normal" ${escalaTarjetasActual() === "normal" ? "selected" : ""}>Normal</option>
                        <option value="chicas" ${escalaTarjetasActual() === "chicas" ? "selected" : ""}>Compactas (entran más por fila)</option>
                        <option value="grandes" ${escalaTarjetasActual() === "grandes" ? "selected" : ""}>Grandes (más fáciles de leer)</option>
                    </select>

                    <button class="btnGuardar" id="guardarEscalaTarjetas">Guardar tamaño</button>
                </div>

                <div class="cardConfig cardAcciones">
                    <div>
                        <h2>Guardar apariencia</h2>
                        <p class="notaConfig">Restablecer vuelve a la paleta Forralitas y valores originales, sin guardar.</p>
                    </div>
                    <div class="accionesConfig">
                        <button class="btnCancelar" id="restablecerApariencia">Restablecer</button>
                        <button class="btnGuardar" id="guardarTema">Guardar apariencia</button>
                    </div>
                </div>

            </div>
        </section>

        <!-- ============ NEGOCIO ============ -->
        <section class="seccionConfig" data-seccion="negocio">
            <div class="configGrid">

                ${admin ? htmlConfigNegocio() : ""}

                <div class="cardConfig">
                    <h2>📊 Dashboard</h2>

                    <label class="switchConfig">
                        <input id="chkVentas" type="checkbox" ${configuracionSistema.dashboard.mostrarUltimasVentas ? "checked" : ""}>
                        <span class="switchPista"></span>
                        Mostrar últimas ventas
                    </label>

                    <label class="switchConfig">
                        <input id="chkStock" type="checkbox" ${configuracionSistema.dashboard.mostrarStock ? "checked" : ""}>
                        <span class="switchPista"></span>
                        Mostrar poco stock
                    </label>

                    <label>Cantidad de ventas</label>
                    <input id="cantVentas" type="text" inputmode="numeric" autocomplete="off" oninput="limpiarNumero(this)" value="${configuracionSistema.dashboard.cantidadVentas}">

                    <button class="btnGuardar" id="guardarDashboard">Guardar dashboard</button>
                </div>

                <div class="cardConfig">
                    <h2>📦 Inventario</h2>

                    <label>Stock mínimo</label>
                    <input id="stockMinimo" type="text" inputmode="numeric" autocomplete="off" oninput="limpiarNumero(this)" value="${configuracionSistema.inventario.stockMinimo}">

                    <label class="switchConfig">
                        <input id="alertasStock" type="checkbox" ${configuracionSistema.inventario.alertas ? "checked" : ""}>
                        <span class="switchPista"></span>
                        Alertas de stock bajo
                    </label>

                    <button class="btnGuardar" id="guardarInventario">Guardar inventario</button>
                </div>

                <div class="cardConfig">
                    <h2>💰 Ventas</h2>

                    <label class="switchConfig">
                        <input id="confirmarEliminar" type="checkbox" ${configuracionSistema.ventas.confirmarEliminar ? "checked" : ""}>
                        <span class="switchPista"></span>
                        Confirmar al eliminar
                    </label>

                    <label class="switchConfig">
                        <input id="ventaRapida" type="checkbox" ${configuracionSistema.ventas.ventaRapida ? "checked" : ""}>
                        <span class="switchPista"></span>
                        Venta rápida
                    </label>

                    <label class="switchConfig">
                        <input id="sonidoVenta" type="checkbox" ${configuracionSistema.ventas.sonidoVenta ? "checked" : ""}>
                        <span class="switchPista"></span>
                        Sonido al vender
                    </label>

                    <label>Recargo por tarjeta de crédito (%)</label>
                    <input id="recargoCredito" type="text" inputmode="decimal" autocomplete="off" oninput="limpiarNumero(this)" value="${porcentajeRecargoCredito()}" ${admin ? "" : "disabled"}>

                    <button class="btnGuardar" id="guardarVentas">Guardar ventas</button>
                </div>

                <div class="cardConfig">
                    <h2>💳 Mercado Pago Point</h2>

                    <p class="notaConfig">
                        El Point solo se usa para cobrar ventas con tarjeta de débito/crédito
                        y como impresora de tickets (de cualquier forma de pago: efectivo,
                        transferencia o tarjeta).
                    </p>

                    <p class="notaConfig" id="estadoMPToken">Cargando estado...</p>

                    <label>Access Token (queda guardado solo en esta compu)</label>
                    <input id="accessTokenMP" type="password" placeholder="Pegá el Access Token de producción" autocomplete="off">

                    <label>Dispositivo Point</label>
                    <select id="deviceIdMP">
                        <option value="">Elegí un dispositivo</option>
                    </select>

                    <p class="notaConfig" id="estadoModoMP"></p>

                    <div class="accionesConfig">
                        <button class="btnCancelar" id="btnBuscarDispositivosMP" type="button">Buscar dispositivos</button>
                        <button class="btnCancelar" id="btnActivarModoPDV" type="button">Activar modo PDV</button>
                        <button class="btnGuardar" id="guardarMP">Guardar Mercado Pago</button>
                    </div>

                    <p class="notaConfig">
                        Con el Access Token guardado arriba, FORRALITAS también puede detectar
                        solo las transferencias y pagos con QR que entren a la cuenta de
                        Mercado Pago (no hace falta el Point ni el dispositivo para esto):
                        avisa cuando se acredita una, y si estabas esperando una puntual
                        (botón "Esperar transferencia" en Ventas) registra la venta sola.
                    </p>

                    <label class="switchConfig">
                        <input id="detectarTransferenciasMP" type="checkbox" ${configuracionSistema.negocio?.detectarTransferenciasMP !== false ? "checked" : ""}>
                        <span class="switchPista"></span>
                        Detectar transferencias/QR de Mercado Pago automáticamente
                    </label>
                </div>

                <div class="cardConfig">
                    <h2>🖨️ Impresora de tickets</h2>

                    <p class="notaConfig">
                        Si hay un Point configurado arriba, el ticket se imprime ahí. Esta
                        impresora es solo la que se usa de respaldo cuando no hay Point
                        (o si falla el envío al dispositivo).
                    </p>

                    <label>Impresora</label>
                    <select id="impresoraSeleccionada">
                        <option value="">Impresora predeterminada del sistema</option>
                    </select>

                    <label class="switchConfig">
                        <input id="imprimirTicketAutomatico" type="checkbox" ${configuracionSistema.negocio?.imprimirTicketAutomatico ? "checked" : ""}>
                        <span class="switchPista"></span>
                        Imprimir ticket automático al cobrar
                    </label>

                    <div class="accionesConfig">
                        <button class="btnCancelar" id="btnTicketPrueba" type="button">Ticket de prueba</button>
                        <button class="btnGuardar" id="guardarImpresora">Guardar impresora</button>
                    </div>
                </div>

            </div>
        </section>

        ${admin ? `
        <!-- ============ USUARIOS (ADMIN) ============ -->
        <section class="seccionConfig" data-seccion="usuarios">
            <div class="configGrid">

                <div class="cardConfig cardAncha">
                    <h2>👥 Gestión de usuarios</h2>
                    <p class="notaConfig">
                        Creá cuentas para cada empleado, cambiales el nombre, el rol o la
                        contraseña. Cada uno solo ve sus propias ventas y gastos en Caja.
                    </p>

                    <button class="btnAgregar" id="btnNuevoUsuarioAdmin">+ Nuevo usuario</button>

                    <div class="tablaClientes">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Usuario</th>
                                    <th>Rol</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tablaUsuariosAdmin"></tbody>
                        </table>
                    </div>
                </div>

            </div>
        </section>
        ` : ""}

        <!-- ============ SISTEMA ============ -->
        <section class="seccionConfig" data-seccion="datos">
            <div class="configGrid">

                <div class="cardConfig cardAncha">
                    <h2>💾 Datos y mantenimiento</h2>
                    <p class="notaConfig">Backup completo de la app, restauración y mantenimiento.</p>

                    <div class="accionesConfig">
                        <button class="btnGuardar" id="btnExportarDatos">Exportar datos</button>
                        <button class="btnGuardar" id="btnImportarDatos">Importar datos</button>
                        <button class="btnGuardar" id="btnOptimizarSistema">Optimizar sistema</button>
                        <button class="btnEliminar" id="btnRestablecerConfiguracion">Restablecer configuración</button>
                    </div>
                </div>

            </div>
        </section>

    </div>

    `;

    document.querySelectorAll(".configTab").forEach(b =>
        b.onclick = () => mostrarSeccionConfig(b.dataset.seccion)
    );

    mostrarSeccionConfig(seccionConfigActual);

    document.getElementById("btnCambiarPassword").onclick = cambiarPassword;

    document.getElementById("guardarTema").onclick = guardarTema;

    document.getElementById("restablecerApariencia").onclick = restablecerApariencia;

    document.querySelectorAll("[data-paleta]").forEach(b =>
        b.onclick = () => aplicarPaletaFormulario(b.dataset.paleta)
    );

    ["colorPrincipal", "colorAcento", "colorFondo", "tamFuente", "radio", "efectosCursor", "sombras", "animaciones"]
        .forEach(id =>{

            const el = document.getElementById(id);

            el.addEventListener("input", previsualizarTema);
            el.addEventListener("change", previsualizarTema);

        });

    document.getElementById("guardarEscalaTarjetas").onclick = guardarEscalaTarjetas;

    document.getElementById("guardarDashboard").onclick = guardarDashboardConfig;

    document.getElementById("guardarInventario").onclick = guardarInventario;

    document.getElementById("guardarVentas").onclick = guardarVentasConfig;

    document.getElementById("guardarMP").onclick = guardarConfigMP;
    document.getElementById("btnBuscarDispositivosMP").onclick = buscarDispositivosMP;
    document.getElementById("deviceIdMP").onchange = seleccionarDispositivoMP;
    document.getElementById("btnActivarModoPDV").onclick = activarModoPDV;
    document.getElementById("guardarImpresora").onclick = guardarConfigImpresora;
    document.getElementById("btnTicketPrueba").onclick = imprimirTicketDePrueba;

    cargarDatosNativosConfig();

    document.getElementById("btnExportarDatos").onclick = exportarDatos;

    document.getElementById("btnImportarDatos").onclick = importarDatos;

    document.getElementById("btnOptimizarSistema").onclick = optimizarSistema;

    document.getElementById("btnRestablecerConfiguracion").onclick = restablecerConfiguracion;

    if(admin){

        iniciarConfigNegocio();

        actualizarTablaUsuariosAdmin();

        document.getElementById("btnNuevoUsuarioAdmin").onclick = abrirModalNuevoUsuarioAdmin;

        document.getElementById("guardarUsuarioAdmin").onclick = guardarUsuarioAdmin;

    }

    previsualizarTema();

}

/* ==========================================
   GESTIÓN DE USUARIOS (SOLO ADMIN)
========================================== */

let usuarioAdminEditandoUsuario = null;

function actualizarTablaUsuariosAdmin(){

    const tbody = document.getElementById("tablaUsuariosAdmin");

    if(!tbody) return;

    tbody.innerHTML = [...usuarios]
        .sort((a,b) => (a.nombre || "").localeCompare(b.nombre || ""))
        .map(u => `
            <tr>
                <td>${u.nombre}</td>
                <td>${u.usuario}</td>
                <td>${u.rol === "admin" ? "Administrador" : "Empleado"}</td>
                <td class="accionesTabla">
                    <button
                        class="btnAccion btnEditar"
                        title="Editar"
                        onclick="editarUsuarioAdmin('${u.usuario}')">
                        ✏️
                    </button>
                    <button
                        class="btnAccion btnBorrar"
                        title="Eliminar"
                        onclick="eliminarUsuarioAdmin('${u.usuario}')">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join("");

}

function abrirModalNuevoUsuarioAdmin(){

    usuarioAdminEditandoUsuario = null;

    document.getElementById("tituloModalUsuario").textContent = "Nuevo Usuario";

    limpiar("nombreUsuarioNuevo", "loginUsuarioNuevo", "passwordUsuarioNuevo");

    document.getElementById("loginUsuarioNuevo").disabled = false;

    document.getElementById("rolUsuarioNuevo").value = "empleado";

    document.getElementById("grupoPasswordUsuarioNuevo").querySelector("label").textContent = "Contraseña";

    abrir("modalUsuario");

}

function editarUsuarioAdmin(loginUsuario){

    const u = usuarios.find(x => x.usuario === loginUsuario);

    if(!u) return;

    usuarioAdminEditandoUsuario = loginUsuario;

    document.getElementById("tituloModalUsuario").textContent = "Editar Usuario";

    document.getElementById("nombreUsuarioNuevo").value = u.nombre || "";

    document.getElementById("loginUsuarioNuevo").value = u.usuario || "";

    // El usuario (login) no se puede cambiar una vez creado: queda
    // referenciado en ventas y gastos viejos para saber quién los cargó.
    document.getElementById("loginUsuarioNuevo").disabled = true;

    document.getElementById("passwordUsuarioNuevo").value = "";

    document.getElementById("grupoPasswordUsuarioNuevo").querySelector("label").textContent =
        "Nueva contraseña (dejar vacío para no cambiarla)";

    document.getElementById("rolUsuarioNuevo").value = u.rol || "empleado";

    abrir("modalUsuario");

}

function guardarUsuarioAdmin(){

    const nombre = document.getElementById("nombreUsuarioNuevo").value.trim();

    const loginUsuario = document.getElementById("loginUsuarioNuevo").value.trim();

    const password = document.getElementById("passwordUsuarioNuevo").value;

    const rol = document.getElementById("rolUsuarioNuevo").value;

    if(!nombre || !loginUsuario){

        notificacion("Completá el nombre y el usuario.", "warning");

        return;

    }

    if(usuarioAdminEditandoUsuario){

        const u = usuarios.find(x => x.usuario === usuarioAdminEditandoUsuario);

        if(!u) return;

        u.nombre = nombre;

        u.rol = rol;

        if(password) u.password = password;

        notificacion("Usuario actualizado.");

    }else{

        if(usuarios.some(x => x.usuario === loginUsuario)){

            notificacion("Ya existe un usuario con ese nombre de acceso.", "warning");

            return;

        }

        if(!password){

            notificacion("Ingresá una contraseña para el usuario nuevo.", "warning");

            return;

        }

        usuarios.push({ usuario: loginUsuario, password, nombre, rol });

        notificacion("Usuario creado.");

    }

    guardarUsuarios();

    cerrar("modalUsuario");

    actualizarTablaUsuariosAdmin();

    usuarioAdminEditandoUsuario = null;

}

function eliminarUsuarioAdmin(loginUsuario){

    if(loginUsuario === usuarioActual.usuario){

        notificacion("No podés eliminar tu propia cuenta mientras estás logueado con ella.", "warning");

        return;

    }

    const u = usuarios.find(x => x.usuario === loginUsuario);

    if(!u) return;

    if(u.rol === "admin" && usuarios.filter(x => x.rol === "admin").length <= 1){

        notificacion("Tiene que quedar al menos un administrador.", "warning");

        return;

    }

    confirmar(

        "¿Eliminar el usuario \"" + u.nombre + "\"? Sus ventas y gastos ya cargados quedan igual, solo se elimina el acceso.",

        ()=>{

            usuarios = usuarios.filter(x => x.usuario !== loginUsuario);

            guardarUsuarios();

            actualizarTablaUsuariosAdmin();

            notificacion("Usuario eliminado.", "error");

        }

    );

}

/* ==========================================
   CAMBIAR CONTRASEÑA
========================================== */

function cambiarPassword(){

    const actual = document.getElementById("passwordActual").value;

    const nueva = document.getElementById("passwordNueva").value;

    const repetir = document.getElementById("passwordRepetir").value;

    if(actual !== usuarioActual.password){

        notificacion("La contraseña actual es incorrecta.", "error");

        return;

    }

    if(nueva.length < 4){

        notificacion("La nueva contraseña debe tener al menos 4 caracteres.", "warning");

        return;

    }

    if(nueva !== repetir){

        notificacion("Las contraseñas nuevas no coinciden.", "warning");

        return;

    }

    usuarioActual.password = nueva;

    guardarUsuarios();

    document.getElementById("passwordActual").value = "";

    document.getElementById("passwordNueva").value = "";

    document.getElementById("passwordRepetir").value = "";

    notificacion("Contraseña actualizada correctamente.");

}

/* ==========================================
   GUARDAR AJUSTES
========================================== */

function leerTemaFormulario(){

    const v = id => document.getElementById(id);

    return {
        color: v("colorPrincipal").value,
        acento: v("colorAcento").value,
        fondo: v("colorFondo").value,
        fuente: Number(v("tamFuente").value) || 16,
        radio: Number(v("radio").value) || 0,
        animaciones: v("animaciones").checked,
        sombras: v("sombras").checked,
        efectos: v("efectosCursor").value
    };

}

// Muestra en el formulario los valores de un tema (sin guardar).
function llenarFormularioTema(t){

    const tema = { ...CONFIG_DEFAULT.tema, ...t };

    document.getElementById("colorPrincipal").value = tema.color;
    document.getElementById("colorAcento").value = tema.acento;
    document.getElementById("colorFondo").value = tema.fondo;
    document.getElementById("tamFuente").value = tema.fuente;
    document.getElementById("radio").value = tema.radio;
    document.getElementById("animaciones").checked = !!tema.animaciones;
    document.getElementById("sombras").checked = !!tema.sombras;
    document.getElementById("efectosCursor").value = tema.efectos;

    previsualizarTema();

}

// Vista previa en vivo: aplica el tema del formulario sin guardarlo.
function previsualizarTema(){

    if(!document.getElementById("colorPrincipal")) return;

    const t = leerTemaFormulario();

    aplicarTema(t);

    document.getElementById("valorFuente").textContent = t.fuente + "px";
    document.getElementById("valorRadio").textContent = t.radio + "px";

    document.querySelectorAll(".paletaOpcion").forEach(b =>{

        const p = PALETAS_TEMA[b.dataset.paleta];

        b.classList.toggle("activa",
            p.principal.toLowerCase() === t.color.toLowerCase()
            && p.acento.toLowerCase() === t.acento.toLowerCase()
            && p.fondo.toLowerCase() === t.fondo.toLowerCase()
        );

    });

}

function aplicarPaletaFormulario(id){

    const p = PALETAS_TEMA[id];

    if(!p) return;

    const actual = leerTemaFormulario();

    llenarFormularioTema({
        ...actual,
        color: p.principal,
        acento: p.acento,
        fondo: p.fondo
    });

}

function restablecerApariencia(){

    llenarFormularioTema(CONFIG_DEFAULT.tema);

    notificacion("Valores originales cargados. Tocá Guardar para dejarlos.", "success");

}

function guardarTema(){

    configuracionSistema.tema = leerTemaFormulario();

    guardarConfiguracion();

    aplicarTema();

    notificacion("Apariencia guardada.", "success");

}

function guardarDashboardConfig(){

    configuracionSistema.dashboard.mostrarUltimasVentas =
        document.getElementById("chkVentas").checked;

    configuracionSistema.dashboard.mostrarStock =
        document.getElementById("chkStock").checked;

    configuracionSistema.dashboard.cantidadVentas =
        parseInt(document.getElementById("cantVentas").value) || 5;

    guardarConfiguracion();

    notificacion("Dashboard actualizado.", "success");

}

function guardarInventario(){

    configuracionSistema.inventario.stockMinimo =
        parseInt(document.getElementById("stockMinimo").value) || 5;

    configuracionSistema.inventario.alertas =
        document.getElementById("alertasStock").checked;

    guardarConfiguracion();

    notificacion("Configuración guardada.", "success");

}

function guardarVentasConfig(){

    configuracionSistema.ventas.confirmarEliminar =
        document.getElementById("confirmarEliminar").checked;

    configuracionSistema.ventas.ventaRapida =
        document.getElementById("ventaRapida").checked;

    configuracionSistema.ventas.sonidoVenta =
        document.getElementById("sonidoVenta").checked;

    if(esAdmin()){

        const recargo = Number(document.getElementById("recargoCredito").value);

        if(!Number.isFinite(recargo) || recargo < 0 || recargo > 100){

            notificacion("El recargo tiene que ser un porcentaje entre 0 y 100.", "warning");

            return;

        }

        configuracionSistema.ventas.recargoCredito = recargo;

    }

    guardarConfiguracion();

    notificacion("Configuración guardada.", "success");

}

let ultimosDispositivosMP = [];

/* ==========================================
   MERCADO PAGO POINT + IMPRESORA
   ------------------------------------------
   El Access Token y el device_id viven solo en
   el proceso main de Electron (ver
   electron/mpConfig.js); acá solo se piden/
   muestran por IPC, nunca se guardan en
   localStorage ni se sincronizan a Firebase.
========================================== */

async function cargarDatosNativosConfig(){

    const estado = document.getElementById("estadoMPToken");
    const selectDevice = document.getElementById("deviceIdMP");
    const selectImpresora = document.getElementById("impresoraSeleccionada");

    if(!window.forralitasNative){

        if(estado) estado.textContent = "Disponible solo en la app de escritorio instalada (no en el navegador).";

        return;

    }

    try{

        const config = await window.forralitasNative.mp.obtenerConfig();

        if(estado){

            estado.textContent = config.tieneToken
                ? "Ya hay un Access Token guardado (" + config.tokenEnmascarado + ")."
                : "Todavía no configuraste un Access Token de Mercado Pago.";

        }

        if(selectDevice && config.deviceId){

            selectDevice.innerHTML =
                `<option value="${config.deviceId}" selected>${config.deviceId}</option>`;

            try{

                const dispositivos = await window.forralitasNative.mp.listarDispositivos();

                ultimosDispositivosMP = dispositivos;

                if(dispositivos.length){

                    selectDevice.innerHTML = dispositivos.map(d =>
                        `<option value="${d.deviceId}" ${d.deviceId === config.deviceId ? "selected" : ""}>${d.nombre} (${d.deviceId}) - modo ${d.operando}</option>`
                    ).join("");

                }

                mostrarEstadoModoMP(dispositivos);

            }catch{

                // Si falla (sin internet, token vencido, etc.) se deja sin
                // estado de modo; "Buscar dispositivos" lo vuelve a intentar.

            }

        }

        if(selectImpresora){

            const impresoras = await window.forralitasNative.impresora.listar();

            selectImpresora.innerHTML = `<option value="">Impresora predeterminada del sistema</option>` +
                impresoras.map(p =>
                    `<option value="${p.nombre}" ${p.nombre === config.printerName ? "selected" : ""}>${p.descripcion}</option>`
                ).join("");

        }

    }catch(error){

        if(estado) estado.textContent = "No se pudo leer la configuración: " + error.message;

    }

}

async function buscarDispositivosMP(){

    if(!window.forralitasNative){

        notificacion("Esto solo funciona en la app de escritorio.", "warning");

        return;

    }

    try{

        // El token recién pegado en el campo todavía no está guardado en
        // disco: si no se guarda acá, "Buscar dispositivos" sigue usando
        // el token viejo (o ninguno) y falla aunque el campo tenga uno nuevo.
        const accessTokenInput = document.getElementById("accessTokenMP");
        const accessToken = accessTokenInput ? accessTokenInput.value.trim() : "";

        if(accessToken){

            await window.forralitasNative.mp.guardarCredenciales({ accessToken });

            accessTokenInput.value = "";

            const estado = document.getElementById("estadoMPToken");

            if(estado) estado.textContent = "Token guardado. Buscando dispositivos...";

        }

        const dispositivos = await window.forralitasNative.mp.listarDispositivos();

        if(dispositivos.length === 0){

            notificacion("No se encontró ningún dispositivo Point vinculado a esta cuenta.", "warning");

            return;

        }

        ultimosDispositivosMP = dispositivos;

        document.getElementById("deviceIdMP").innerHTML = dispositivos.map(d =>
            `<option value="${d.deviceId}">${d.nombre} (${d.deviceId}) - modo ${d.operando}</option>`
        ).join("");

        notificacion("Se encontraron " + dispositivos.length + " dispositivo(s). Elegí el correcto y guardá.");

        mostrarEstadoModoMP(dispositivos);

        const estado = document.getElementById("estadoMPToken");

        if(estado){

            const config = await window.forralitasNative.mp.obtenerConfig();

            estado.textContent = "Ya hay un Access Token guardado (" + config.tokenEnmascarado + ").";

        }

    }catch(error){

        notificacion("No se pudo buscar dispositivos: " + error.message, "error");

    }

}

// Al elegir un dispositivo de la lista queda vinculado al toque (no hace
// falta además tocar "Guardar Mercado Pago" para que el Point funcione).
async function seleccionarDispositivoMP(){

    mostrarEstadoModoMP(ultimosDispositivosMP);

    if(!window.forralitasNative) return;

    const deviceId = document.getElementById("deviceIdMP")?.value || "";

    try{

        await window.forralitasNative.mp.guardarCredenciales({ deviceId });

    }catch(error){

        notificacion("No se pudo vincular el dispositivo: " + error.message, "error");

    }

}

function mostrarEstadoModoMP(dispositivos){

    const estadoModo = document.getElementById("estadoModoMP");

    if(!estadoModo) return;

    const deviceId = document.getElementById("deviceIdMP")?.value;

    const dispositivo = dispositivos.find(d => d.deviceId === deviceId);

    if(!dispositivo){

        estadoModo.textContent = "";

        return;

    }

    estadoModo.textContent = dispositivo.operando === "PDV"
        ? "Modo PDV: listo para cobrar e imprimir por la app."
        : "Modo " + dispositivo.operando + ": en este modo el Point NO recibe cobros ni tickets de la app. Usá \"Activar modo PDV\" y reiniciá el dispositivo.";

}

async function activarModoPDV(){

    if(!window.forralitasNative){

        notificacion("Esto solo funciona en la app de escritorio.", "warning");

        return;

    }

    try{

        await window.forralitasNative.mp.configurarModoPDV();

        notificacion("Listo. Ahora reiniciá el Point a mano para que el cambio de modo tenga efecto.");

        const dispositivos = await window.forralitasNative.mp.listarDispositivos();

        ultimosDispositivosMP = dispositivos;

        mostrarEstadoModoMP(dispositivos);

    }catch(error){

        notificacion("No se pudo cambiar el modo del Point: " + error.message, "error");

    }

}

async function guardarConfigMP(){

    if(!window.forralitasNative){

        notificacion("Esto solo funciona en la app de escritorio.", "warning");

        return;

    }

    const accessToken = document.getElementById("accessTokenMP").value.trim();
    const deviceId = document.getElementById("deviceIdMP").value;

    configuracionSistema.negocio.detectarTransferenciasMP =
        document.getElementById("detectarTransferenciasMP").checked;

    guardarConfiguracion();

    try{

        await window.forralitasNative.mp.guardarCredenciales({ accessToken, deviceId });

        document.getElementById("accessTokenMP").value = "";

        notificacion("Configuración de Mercado Pago guardada.");

        cargarDatosNativosConfig();

    }catch(error){

        notificacion("No se pudo guardar: " + error.message, "error");

    }

}

async function guardarConfigImpresora(){

    configuracionSistema.negocio.imprimirTicketAutomatico =
        document.getElementById("imprimirTicketAutomatico").checked;

    guardarConfiguracion();

    if(window.forralitasNative){

        const nombre = document.getElementById("impresoraSeleccionada").value;

        try{

            await window.forralitasNative.impresora.guardarSeleccionada(nombre);

        }catch(error){

            notificacion("No se pudo guardar la impresora: " + error.message, "error");

            return;

        }

    }

    notificacion("Configuración de impresión guardada.");

}

/* ==========================================
   EXPORTAR / IMPORTAR
========================================== */

function exportarDatos(){

    const datos = {

        productos,

        historialVentas,

        clientes,

        gastos,

        proveedores,

        usuarios,

        configuracionSistema

    };

    const blob = new Blob(

        [JSON.stringify(datos, null, 2)],

        { type: "application/json" }

    );

    const a = document.createElement("a");

    a.href = URL.createObjectURL(blob);

    a.download = "Backup_Forralitas.json";

    a.click();

    notificacion("Backup exportado correctamente.", "success");

}

function importarDatos(){

    const input = document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = e =>{

        const archivo = e.target.files[0];

        if(!archivo) return;

        const lector = new FileReader();

        lector.onload = function(){

            try{

                const datos = JSON.parse(lector.result);

                if(datos.productos) productos = ordenarProductosPorNombre(datos.productos);

                if(datos.historialVentas) historialVentas = datos.historialVentas;

                if(datos.clientes) clientes = datos.clientes;

                if(datos.gastos) gastos = datos.gastos;

                if(datos.proveedores) proveedores = datos.proveedores;

                if(datos.usuarios) usuarios = datos.usuarios;

                if(datos.configuracionSistema){

                    configuracionSistema = datos.configuracionSistema;
                    normalizarConfiguracionSistema();

                }

                guardarDatos();

                guardarUsuarios();

                guardarConfiguracion();

                aplicarTema();

                notificacion("Datos importados correctamente.", "success");

            }catch{

                notificacion("Archivo inválido.", "error");

            }

        };

        lector.readAsText(archivo);

    };

    input.click();

}

/* ==========================================
   RESTABLECER
========================================== */

function restablecerConfiguracion(){

    confirmar("¿Restablecer toda la configuración?", ()=>{

        configuracionSistema = JSON.parse(JSON.stringify(CONFIG_DEFAULT));

        guardarConfiguracion();

        aplicarTema();

        renderConfiguracion();

        notificacion("Configuración restablecida.", "success");

    });

}

/* ==========================================
   OPTIMIZAR
========================================== */

function optimizarSistema(){

    let total = 0;

    total += productos.length;

    total += historialVentas.length;

    total += clientes.length;

    total += gastos.length;

    total += proveedores.length;

    total += usuarios.length;

    guardarDatos();

    guardarUsuarios();

    guardarConfiguracion();

    notificacion(

        "Optimización finalizada. Registros analizados: " + total,

        "success"

    );

}

/* ==========================================
   INICIALIZAR TEMA
========================================== */

window.addEventListener("load", ()=>{

    aplicarTema();

});
