/* ==========================================
   APP - ARRANQUE, DATOS Y NAVEGACIÓN
========================================== */

// VARIABLES GLOBALES (tablas de la app)

let productos = [];
let clientes = [];
let proveedores = [];
let gastos = [];
let historialVentas = [];
let eliminaciones = [];
let mezclas = [];
let carpetasNotas = [];

// Variables de trabajo

let carrito = [];
let clienteSeleccionado = null;
let productoSeleccionado = null;

// Página actual

let paginaActual = "Dashboard";

// Conexión con la nube

let gestorSync = null;
let adaptadorActual = null;
let conexionActual = null;
let appLogueadaIniciada = false;

/* ==========================================
   TABLAS QUE SE SINCRONIZAN
   (el carrito queda solo local: es la venta en
   curso de ESTA computadora, no debe compartirse)

   - clave: campo que identifica cada registro.
   - alInicio: la app agrega los registros nuevos
     al principio de la lista.
========================================== */

const ENTIDADES_SINCRONIZADAS = [
    { nombre: "productos", clave: "id", prefijoId: "P", obtener: () => productos, asignar: v => productos = v },
    { nombre: "clientes", clave: "id", prefijoId: "C", obtener: () => clientes, asignar: v => clientes = v },
    { nombre: "proveedores", clave: "id", prefijoId: "PR", obtener: () => proveedores, asignar: v => proveedores = v },
    { nombre: "gastos", clave: "id", prefijoId: "G", obtener: () => gastos, asignar: v => gastos = v },
    { nombre: "historialVentas", clave: "id", prefijoId: "V", alInicio: true, obtener: () => historialVentas, asignar: v => historialVentas = v },
    { nombre: "eliminaciones", clave: "id", prefijoId: "E", alInicio: true, obtener: () => eliminaciones, asignar: v => eliminaciones = v },
    { nombre: "mezclas", clave: "id", prefijoId: "M", alInicio: true, obtener: () => mezclas, asignar: v => mezclas = v },
    { nombre: "carpetasNotas", clave: "id", prefijoId: "N", alInicio: true, obtener: () => carpetasNotas, asignar: v => carpetasNotas = v },
    { nombre: "usuarios", clave: "usuario", obtener: () => usuarios, asignar: v => usuarios = v },
    { nombre: "preciosClientes", clave: "id", prefijoId: "PC", obtener: () => preciosClientesCache, asignar: v => preciosClientesCache = v },
    { nombre: "configuracionSistema", clave: null, vacio: () => JSON.parse(JSON.stringify(CONFIG_DEFAULT)), obtener: () => configuracionSistema, asignar: v => configuracionSistema = v }
];

/* ==========================================
   INICIO
========================================== */

document.addEventListener("DOMContentLoaded", iniciarApp);

function hayNube(){

    let apagada = false;

    try{ apagada = localStorage.getItem("__sinNube") === "1"; }catch(e){ /* nada */ }

    return !!window.FirebaseDB && !apagada;

}

function leerConexion(){

    try{

        const c = JSON.parse(localStorage.getItem("conexionNegocio"));

        return (c && (c.modo === "clasico" || c.modo === "cuenta")) ? c : null;

    }catch(e){

        return null;

    }

}

function guardarConexion(c){

    if(c) localStorage.setItem("conexionNegocio", JSON.stringify(c));
    else localStorage.removeItem("conexionNegocio");

    // Una PC que alguna vez usó cuenta nunca vuelve sola al modo sin cuenta.
    if(c && c.modo === "cuenta") localStorage.setItem("negocioConCuenta", "1");

}

/* Una PC que ya venía usando el programa tiene datos guardados
   del modo clásico: sigue funcionando igual que siempre. */
function hayDatosLocalesClasicos(){

    if(localStorage.getItem("negocioConCuenta") === "1") return false;

    return ["usuarios", "productos", "historialVentas", "clientes"]
        .some(k => localStorage.getItem(k) !== null);

}

async function iniciarApp(){

    mostrarPantallaInicio("Cargando…");

    try{

        carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    }catch(e){

        carrito = [];

    }

    let conexion = leerConexion();

    if(!conexion){

        if(!hayNube() || hayDatosLocalesClasicos()){

            conexion = { modo: "clasico" };

            guardarConexion(conexion);

        }else{

            // Instalación nueva: hay que decir de qué negocio es esta PC.
            mostrarPantallaConexion();

            return;

        }

    }

    await conectarYArrancar(conexion);

}

async function conectarYArrancar(conexion){

    mostrarPantallaInicio("Cargando datos…");

    let adaptador = null;

    if(hayNube()){

        if(conexion.modo === "cuenta"){

            const cuenta = await window.FirebaseDB.cuenta.esperarInicial();

            if(!cuenta || cuenta.uid !== conexion.uid){

                mostrarPantallaConexion({
                    email: conexion.email || "",
                    aviso: "Ingresá de nuevo la cuenta del negocio para seguir."
                });

                return;

            }

            adaptador = window.FirebaseDB.adaptadorCuenta(cuenta.uid);

            AlmacenLocal.usarPrefijo("n:" + cuenta.uid + ":");

        }else{

            adaptador = window.FirebaseDB.adaptadorClasico();

            AlmacenLocal.usarPrefijo("");

        }

    }

    conexionActual = conexion;
    adaptadorActual = adaptador;

    if(gestorSync) gestorSync.detener();

    migracionesRevisadasConNube = false;

    gestorSync = crearGestorSync({
        adaptador,
        almacen: AlmacenLocal,
        tablas: ENTIDADES_SINCRONIZADAS.map(e => ({
            ...e,
            vacio: e.vacio || (() => (e.clave ? [] : {}))
        })),
        alCambiar: programarRefrescoRemoto,
        alEstado: actualizarIndicadorSync
    });

    await gestorSync.iniciar();

    completarConfiguracion();

    migrarDatos();

    aplicarTema();

    aplicarDatosNegocio();

    // Modo clásico: ¿el negocio ya se pasó a "cuenta"? Entonces esta PC
    // tiene que ingresar con la cuenta para seguir viendo los datos.
    if(adaptador && conexion.modo === "clasico" && await negocioMigradoACuenta(adaptador)){

        gestorSync.detener();

        mostrarPantallaConexion({
            sinClasico: true,
            aviso: "Este negocio ahora usa una cuenta. Ingresá el email y la clave del negocio en esta PC."
        });

        return;

    }

    // Si el negocio se pasa a cuenta mientras esta PC está abierta, se
    // corta acá mismo para no seguir cargando datos en el lugar viejo.
    if(adaptador && conexion.modo === "clasico"){

        adaptador.escuchar("_migrado", (data, meta) =>{

            if(!data || (meta && meta.deCache) || conexionActual !== conexion) return;

            if(gestorSync) gestorSync.detener();

            usuarioActual = null;

            document.querySelectorAll(".modal").forEach(m => m.classList.add("oculto"));

            mostrarPantallaConexion({
                sinClasico: true,
                aviso: "Este negocio ahora usa una cuenta. Ingresá el email y la clave del negocio en esta PC."
            });

        }, () => {});

    }

    iniciarEventosLogin();

    if(usuarios.length === 0){

        const info = gestorSync.info("usuarios");

        if(!adaptador || (info && info.confirmado)){

            // Negocio nuevo: todavía no tiene ningún usuario.
            mostrarPantallaPrimerAdmin();

        }else{

            mostrarPantallaSinConexionInicial();

        }

        return;

    }

    if(sesionActiva()){

        ocultarLogin();

        iniciarAppLogueada();

    }else{

        mostrarLogin();

    }

}

async function negocioMigradoACuenta(adaptador){

    if(gestorSync.estado().sinPermiso) return true;

    try{

        const marca = await Promise.race([
            adaptador.leer("_migrado"),
            new Promise(r => setTimeout(() => r(null), 4000))
        ]);

        return !!marca;

    }catch(e){

        return e && e.code === "permission-denied";

    }

}

function iniciarAppLogueada(){

    if(!appLogueadaIniciada){

        iniciarEventos();

        iniciarModalesGlobales();

        window.addEventListener("online", ()=>{ if(gestorSync) gestorSync.sincronizarAhora(); });

        appLogueadaIniciada = true;

    }

    aplicarPermisos();

    mostrarUsuarioActual();

    actualizarIndicadorSync(gestorSync ? gestorSync.estado() : null);

    abrirDashboard();

}

function iniciarModalesGlobales(){

    const enlazar = (id, fn) =>{

        const el = document.getElementById(id);

        if(el) el.onclick = fn;

    };

    enlazar("guardarProducto", guardarProducto);
    enlazar("guardarCliente", guardarCliente);
    enlazar("guardarPrecioCliente", guardarPrecioCliente);
    enlazar("guardarPagoCliente", guardarPagoCliente);

    enlazar("btnEfectivoPagoCliente", () => cambiarMetodoPagoCliente("efectivo"));
    enlazar("btnTransferenciaPagoCliente", () => cambiarMetodoPagoCliente("transferencia"));
    enlazar("btnMixtoPagoCliente", () => cambiarMetodoPagoCliente("mixto"));

    enlazar("btnVolverClientes", cerrarPantallaClienteDetalle);
    enlazar("btnVolverDetallePrecios", cerrarPantallaPreciosCliente);

    enlazar("guardarGasto", guardarGasto);

    enlazar("btnEfectivoGasto", () => cambiarMetodoPagoGasto("efectivo"));
    enlazar("btnTransferenciaGasto", () => cambiarMetodoPagoGasto("transferencia"));
    enlazar("btnMixtoGasto", () => cambiarMetodoPagoGasto("mixto"));

    enlazar("guardarProveedor", guardarProveedor);
    enlazar("btnVolverProveedores", cerrarPantallaProveedorDetalle);
    enlazar("guardarCompraProveedor", guardarCompraProveedor);
    enlazar("guardarPagoProveedor", guardarPagoProveedor);

    enlazar("btnVolverAnotaciones", cerrarPantallaAnotacionDetalle);

    enlazar("guardarMezcla", guardarMezcla);
    enlazar("btnVolverMezclas", cerrarPantallaMezclaDetalle);
    enlazar("guardarProduccionMezcla", guardarProduccionMezcla);

    enlazar("guardarUsuarioAdmin", guardarUsuarioAdmin);
    enlazar("guardarVentaEditada", guardarVentaEditada);
    enlazar("guardarPagoEditado", guardarPagoEditado);

    const buscadorSalidaMezcla = document.getElementById("buscadorSalidaMezcla");

    if(buscadorSalidaMezcla) activarBuscadorProductoMezcla(buscadorSalidaMezcla);

}

/* ==========================================
   GUARDAR
   Se llama después de cada cambio. Guarda en
   esta PC al instante y lo sube a la nube.
   Se le puede indicar qué tablas cambiaron
   (más rápido): guardarDatos("productos").
========================================== */

function guardarDatos(...tablas){

    try{

        localStorage.setItem("carrito", JSON.stringify(carrito));

    }catch(e){ /* nada */ }

    if(!gestorSync) return;

    gestorSync.guardar(tablas);

    // Red de seguridad: cuando se indicaron tablas puntuales, enseguida
    // se revisan todas, por si el cambio tocó alguna que no se nombró.
    if(tablas.length){

        clearTimeout(guardadoCompletoPendiente);

        guardadoCompletoPendiente = setTimeout(()=>{ if(gestorSync) gestorSync.guardar([]); }, 400);

    }

}

let guardadoCompletoPendiente = null;

/* ==========================================
   CAMBIOS QUE LLEGAN DE OTRA COMPUTADORA
========================================== */

let refrescoPendiente = null;
let tablasCambiadasRemoto = new Set();

function programarRefrescoRemoto(nombre){

    // Las referencias se actualizan en el acto (no esperan al redibujado),
    // así ninguna acción del usuario trabaja sobre un registro viejo.
    revincularReferencias();

    tablasCambiadasRemoto.add(nombre);

    if(refrescoPendiente) return;

    refrescoPendiente = setTimeout(()=>{

        refrescoPendiente = null;

        const cambiadas = tablasCambiadasRemoto;

        tablasCambiadasRemoto = new Set();

        if(cambiadas.has("configuracionSistema")){

            completarConfiguracion();

            aplicarTema();

            aplicarDatosNegocio();

        }

        if(cambiadas.has("usuarios") || cambiadas.has("productos")) migrarDatos();

        revincularReferencias();

        refrescarPantallaActual();

    }, 40);

}

/* Cuando llegan datos nuevos, las listas se reemplazan. Lo que la
   pantalla tenía "agarrado" (usuario, cliente de la venta, etc.) se
   vuelve a buscar por su identificador para no trabajar con una
   copia vieja. */
function revincularReferencias(){

    if(usuarioActual){

        const u = usuarios.find(x => x.usuario === usuarioActual.usuario);

        if(!u){

            if(appLogueadaIniciada){

                notificacion("Tu usuario fue eliminado por el administrador.", "warning");

                cerrarSesion();

            }

        }else{

            const cambioRol = u.rol !== usuarioActual.rol;

            usuarioActual = u;

            if(cambioRol && appLogueadaIniciada){

                aplicarPermisos();

                mostrarUsuarioActual();

            }

        }

    }

    if(clienteSeleccionado){

        clienteSeleccionado = clientes.find(c => c.id === clienteSeleccionado.id) || null;

    }

    if(typeof productoVenta !== "undefined" && productoVenta){

        productoVenta = productos.find(p => p.id === productoVenta.id) || null;

    }

}

function pantallaVisible(id){

    const el = document.getElementById(id);

    return !!el && !el.classList.contains("oculto");

}

function refrescarPantallaActual(){

    if(!usuarioActual || !appLogueadaIniciada) return;

    // Pantallas de detalle abiertas.
    if(pantallaVisible("pantallaPreciosCliente")){ renderListaPreciosRegistrados(); return; }

    if(pantallaVisible("pantallaClienteDetalle")){ renderClienteDetalle(clienteDetalleActualId); return; }

    if(pantallaVisible("pantallaProveedorDetalle")){ renderProveedorDetalle(proveedorDetalleActualId); return; }

    if(pantallaVisible("pantallaMezclaDetalle")){ renderMezclaDetalle(mezclaDetalleActualId); return; }

    // El bloc de notas no se refresca: se pisaría lo que se está escribiendo.
    if(pantallaVisible("pantallaAnotacionDetalle")) return;

    // Se actualizan solo las listas, sin perder lo que la persona
    // estaba escribiendo o filtrando.
    const mapa = {
        Dashboard: renderDashboard,
        Ventas: refrescarVentas,
        Productos: actualizarTablaProductos,
        Clientes: actualizarTablaClientes,
        Proveedores: actualizarTablaProveedores,
        Gastos: refrescarTablaGastosConFiltrosActuales,
        Historial: buscarHistorial,
        Mezclas: actualizarTablaMezclas,
        Anotaciones: actualizarTablaAnotaciones,
        Reportes: generarReporte,
        Eliminaciones: renderEliminaciones,
        Configuracion: actualizarTablaUsuariosAdmin
    };

    const fn = mapa[paginaActual];

    if(typeof fn === "function") fn();

}

/* ==========================================
   INDICADOR DE SINCRONIZACIÓN
========================================== */

let migracionesRevisadasConNube = false;

function actualizarIndicadorSync(estado){

    // Apenas se confirma todo con la nube, se revisan los ajustes de
    // datos pendientes (por si el programa arrancó sin conexión).
    if(estado && estado.nube && estado.confirmadas === estado.total && !migracionesRevisadasConNube){

        migracionesRevisadasConNube = true;

        setTimeout(migrarDatos, 0);

    }

    const el = document.getElementById("estadoSync");

    if(!el) return;

    let texto = "";
    let clase = "";
    let ayuda = "";

    if(!estado || !estado.nube){

        texto = "💾 Solo en esta PC";
        ayuda = "Los datos se guardan únicamente en esta computadora.";

    }else if(estado.sinPermiso){

        texto = "⛔ Sin acceso a la nube";
        clase = "error";
        ayuda = "La base de datos rechazó la conexión. Revisá la cuenta del negocio.";

    }else if(estado.pendientes > 0 && (estado.error || estado.confirmadas < estado.total)){

        texto = "⚠ Sin conexión · " + estado.pendientes + " cambio(s) guardado(s) en esta PC";
        clase = "alerta";
        ayuda = "No se pierde nada: se suben solos cuando vuelva internet.";

    }else if(estado.pendientes > 0){

        texto = "⏳ Subiendo cambios…";
        clase = "subiendo";

    }else if(estado.confirmadas < estado.total){

        texto = "⚠ Sin conexión";
        clase = "alerta";
        ayuda = "Se está trabajando con los datos guardados en esta PC.";

    }else{

        texto = "☁ Sincronizado";
        clase = "ok";

    }

    el.textContent = texto;
    el.title = ayuda;
    el.className = "estadoSync " + clase;

}

/* ==========================================
   MIGRACIONES DE DATOS
   Ajustes que se hacen una sola vez sobre los
   datos de versiones anteriores.
========================================== */

function migrarDatos(){

    if(!configuracionSistema.migraciones) configuracionSistema.migraciones = {};

    const hechas = configuracionSistema.migraciones;

    let cambios = false;

    // Los ajustes 1 y 2 se deciden mirando la configuración guardada en
    // la nube: hasta no tenerla confirmada no se tocan (se reintenta
    // solo cuando termina de conectar).
    const infoConfig = gestorSync ? gestorSync.info("configuracionSistema") : null;

    const configConfirmada = !adaptadorActual || (infoConfig && infoConfig.confirmado);


    // 1) "Separar por bolsa": antes estaba fijo en el código para
    //    maíz y alfa; ahora es un dato de cada producto.
    if(configConfirmada && !hechas.separarPorProducto && productos.length){

        const reglas = {
            "MAIZX40KG": { monto: 11000, grupo: "Maíz" },
            "MAIZX45KG": { monto: 12000, grupo: "Maíz" },
            "MAIZX50KG": { monto: 12000, grupo: "Maíz" },
            "ALFAVERDE": { monto: 5000, grupo: "Alfa" }
        };

        productos.forEach(p =>{

            const regla = reglas[normalizarNombreProducto(p.nombre)];

            if(regla && p.separarPorBolsa === undefined){

                p.separarPorBolsa = regla.monto;
                p.grupoSeparar = regla.grupo;

            }

        });

        hechas.separarPorProducto = true;

        // Las ventas viejas de productos ya eliminados siguen usando
        // las reglas anteriores en la Caja (ver reportes.js).
        hechas.reglasSepararAnteriores = true;

        cambios = true;

    }

    // 2) El usuario cuyas eliminaciones no quedaban registradas pasa a
    //    ser una opción visible de cada usuario (la maneja el admin).
    if(configConfirmada && !hechas.usuarioSinRegistro && usuarios.length){

        const u = usuarios.find(x => x.usuario === "maxiforralitas");

        if(u && u.ocultarEliminaciones === undefined) u.ocultarEliminaciones = true;

        hechas.usuarioSinRegistro = true;

        cambios = true;

    }

    // 3) Contraseñas guardadas sin cifrar por versiones anteriores: se
    //    cifran todas ahora (cada persona sigue usando la misma).
    usuarios.forEach(u =>{

        if(!u.hash && typeof u.password === "string" && u.password !== ""){

            asignarPassword(u, u.password);

            cambios = true;

        }

    });

    if(cambios) guardarDatos("productos", "usuarios", "configuracionSistema");

}

function normalizarNombreProducto(nombre){

    return (nombre || "").toUpperCase().replace(/\s+/g, "");

}

/* ==========================================
   MENU
========================================== */

function iniciarEventos(){

    const botones = {
        Dashboard: abrirDashboard,
        Ventas: abrirVentas,
        Productos: abrirProductos,
        Clientes: abrirClientes,
        Proveedores: abrirProveedores,
        Gastos: abrirGastos,
        Historial: abrirHistorial,
        Mezclas: abrirMezclas,
        Anotaciones: abrirAnotaciones,
        Reportes: abrirReportes,
        Configuracion: abrirConfiguracion,
        Eliminaciones: abrirEliminaciones
    };

    Object.keys(botones).forEach(id =>{

        const btn = document.getElementById(id);

        if(btn) btn.onclick = botones[id];

    });

}

/* ==========================================
   CAMBIAR PAGINA
========================================== */

function cambiarPagina(nombre){

    paginaActual = nombre;

    document
        .querySelectorAll(".sidebar button")
        .forEach(b => b.classList.remove("activo"));

    const boton = document.getElementById(nombre);

    if(boton) boton.classList.add("activo");

    // Se ocultan las pantallas secundarias al cambiar de sección.
    ["pantallaClienteDetalle", "pantallaPreciosCliente", "pantallaAnotacionDetalle",
     "pantallaProveedorDetalle", "pantallaMezclaDetalle"].forEach(id =>{

        const el = document.getElementById(id);

        if(el) el.classList.add("oculto");

    });

    const app = document.getElementById("appPrincipal");

    if(app) app.classList.remove("oculto");

}

/* ==========================================
   UTILIDADES
========================================== */

function contenido(){

    return document.getElementById("contenidoPrincipal");

}

function titulo(texto){

    const el = document.getElementById("tituloPagina");

    if(el) el.textContent = texto;

}

function sinPermisoHtml(){

    return `
        <div class="card">
            <p class="tablaVacia">
                Tu usuario no tiene permiso para esta sección.
                Pedile al administrador que lo habilite desde Configuración.
            </p>
        </div>
    `;

}

/* ==========================================
   NAVEGACIÓN
========================================== */

function abrirDashboard(){

    cambiarPagina("Dashboard");
    titulo("Dashboard");
    renderDashboard();

}

function abrirProductos(){

    cambiarPagina("Productos");
    titulo("Productos");
    renderProductos();

}

function abrirVentas(){

    cambiarPagina("Ventas");
    titulo("Ventas");
    renderVentas();

}

function abrirClientes(){

    cambiarPagina("Clientes");
    titulo("Clientes");
    renderClientes();

}

function abrirProveedores(){

    cambiarPagina("Proveedores");
    titulo("Proveedores");

    if(!puede("proveedores")){ contenido().innerHTML = sinPermisoHtml(); return; }

    renderProveedores();

}

function abrirGastos(){

    cambiarPagina("Gastos");
    titulo("Gastos");
    renderGastos();

}

function abrirHistorial(){

    cambiarPagina("Historial");
    titulo("Historial");
    renderHistorial();

}

function abrirMezclas(){

    cambiarPagina("Mezclas");
    titulo("Mezclas");

    if(!puede("mezclas")){ contenido().innerHTML = sinPermisoHtml(); return; }

    renderMezclas();

}

function abrirAnotaciones(){

    cambiarPagina("Anotaciones");
    titulo("Anotaciones");
    renderAnotaciones();

}

function abrirReportes(){

    cambiarPagina("Reportes");
    titulo("Caja");
    renderReportes();

}

function abrirConfiguracion(){

    cambiarPagina("Configuracion");
    titulo("Configuración");
    renderConfiguracion();

}

function abrirEliminaciones(){

    if(!esAdmin()){

        notificacion("Sección exclusiva del administrador.", "warning");

        return;

    }

    cambiarPagina("Eliminaciones");

    titulo("Historial de eliminaciones");

    renderEliminaciones();

}

/* ==========================================
   PANTALLAS SECUNDARIAS (DETALLES)
========================================== */

function mostrarPantallaDetalle(id){

    const app = document.getElementById("appPrincipal");

    const pantalla = document.getElementById(id);

    if(app) app.classList.add("oculto");

    if(pantalla) pantalla.classList.remove("oculto");

}

function ocultarPantallaDetalle(id){

    const app = document.getElementById("appPrincipal");

    const pantalla = document.getElementById(id);

    if(pantalla) pantalla.classList.add("oculto");

    if(app && usuarioActual) app.classList.remove("oculto");

}

function abrirPantallaClienteDetalle(){ mostrarPantallaDetalle("pantallaClienteDetalle"); }

function cerrarPantallaClienteDetalle(){

    ocultarPantallaDetalle("pantallaClienteDetalle");

    if(paginaActual === "Clientes") actualizarTablaClientes();

}

function abrirPantallaProveedorDetalle(){ mostrarPantallaDetalle("pantallaProveedorDetalle"); }

function cerrarPantallaProveedorDetalle(){

    ocultarPantallaDetalle("pantallaProveedorDetalle");

    if(paginaActual === "Proveedores") actualizarTablaProveedores();

}

function abrirPantallaAnotacionDetalle(){ mostrarPantallaDetalle("pantallaAnotacionDetalle"); }

function cerrarPantallaAnotacionDetalle(){

    ocultarPantallaDetalle("pantallaAnotacionDetalle");

    if(paginaActual === "Anotaciones") actualizarTablaAnotaciones();

}

function abrirPantallaPreciosCliente(){

    const detalle = document.getElementById("pantallaClienteDetalle");

    const pantalla = document.getElementById("pantallaPreciosCliente");

    if(detalle) detalle.classList.add("oculto");

    if(pantalla) pantalla.classList.remove("oculto");

}

function cerrarPantallaPreciosCliente(){

    const detalle = document.getElementById("pantallaClienteDetalle");

    const pantalla = document.getElementById("pantallaPreciosCliente");

    if(detalle) detalle.classList.remove("oculto");

    if(pantalla) pantalla.classList.add("oculto");

}
