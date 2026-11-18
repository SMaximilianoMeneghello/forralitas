/* ==========================================
   FORRALITAS APP V2
========================================== */

// VARIABLES GLOBALES

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

let paginaActual = "dashboard";

// Único lugar que decide el orden de "productos": así cualquier buscador
// o listado que lo recorra (tabla de Productos, venta, mezclas, ingreso
// de stock, etc.) ya lo recibe alfabético sin tener que ordenar cada uno
// por su cuenta.
function ordenarProductosPorNombre(lista){

    return [...(lista || [])].sort((a, b) =>

        (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" })

    );

}

/* ==========================================
   TABLAS QUE SE SINCRONIZAN CON FIREBASE
   (el carrito queda solo local: es la venta en
   curso de ESTA computadora, no debe compartirse)
========================================== */

const ENTIDADES_SINCRONIZADAS = [
    { nombre: "productos", obtener: () => productos, asignar: v => productos = ordenarProductosPorNombre(v) },
    { nombre: "clientes", obtener: () => clientes, asignar: v => clientes = v },
    { nombre: "proveedores", obtener: () => proveedores, asignar: v => proveedores = v },
    { nombre: "gastos", obtener: () => gastos, asignar: v => gastos = v },
    { nombre: "historialVentas", obtener: () => historialVentas, asignar: v => historialVentas = v },
    { nombre: "eliminaciones", obtener: () => eliminaciones, asignar: v => eliminaciones = v },
    { nombre: "mezclas", obtener: () => mezclas, asignar: v => mezclas = v },
    { nombre: "carpetasNotas", obtener: () => carpetasNotas, asignar: v => carpetasNotas = v }
];

/* ==========================================
   INICIO
========================================== */

document.addEventListener("DOMContentLoaded", iniciarApp);

async function iniciarApp(){

    await cargarDatos();

    await cargarUsuarios();

    await sincronizarConfiguracionFirebase();

    await inicializarPreciosClientesFirebase();

    iniciarEventosLogin();

   if(sesionActiva()){

    ocultarLogin();

    iniciarAppLogueada();

}else{

    mostrarLogin();

}

}

function iniciarAppLogueada(){

    iniciarEventos();

    iniciarModalesGlobales();

    aplicarPermisos();

    mostrarUsuarioActual();

    abrirDashboard();

    iniciarMonitorTransferenciasMP();

}

function iniciarModalesGlobales(){

    const guardarProductoBtn = document.getElementById("guardarProducto");

    if(guardarProductoBtn) guardarProductoBtn.onclick = guardarProducto;

    const guardarClienteBtn = document.getElementById("guardarCliente");

    if(guardarClienteBtn) guardarClienteBtn.onclick = guardarCliente;

    const guardarPrecioBtn = document.getElementById("guardarPrecioCliente");

    if(guardarPrecioBtn) guardarPrecioBtn.onclick = guardarPrecioCliente;

    const guardarPagoBtn = document.getElementById("guardarPagoCliente");

    if(guardarPagoBtn) guardarPagoBtn.onclick = guardarPagoCliente;

    const btnEfectivoPagoCliente = document.getElementById("btnEfectivoPagoCliente");
    const btnTransferenciaPagoCliente = document.getElementById("btnTransferenciaPagoCliente");
    const btnMixtoPagoCliente = document.getElementById("btnMixtoPagoCliente");

    if(btnEfectivoPagoCliente) btnEfectivoPagoCliente.onclick = () => cambiarMetodoPagoCliente("efectivo");
    if(btnTransferenciaPagoCliente) btnTransferenciaPagoCliente.onclick = () => cambiarMetodoPagoCliente("transferencia");
    if(btnMixtoPagoCliente) btnMixtoPagoCliente.onclick = () => cambiarMetodoPagoCliente("mixto");

    const btnVolverClientes = document.getElementById("btnVolverClientes");

    if(btnVolverClientes) btnVolverClientes.onclick = cerrarPantallaClienteDetalle;

    const btnVolverDetallePrecios = document.getElementById("btnVolverDetallePrecios");

    if(btnVolverDetallePrecios) btnVolverDetallePrecios.onclick = cerrarPantallaPreciosCliente;

    const guardarGastoBtn = document.getElementById("guardarGasto");

    if(guardarGastoBtn) guardarGastoBtn.onclick = guardarGasto;

    const btnEfectivoGasto = document.getElementById("btnEfectivoGasto");
    const btnTransferenciaGasto = document.getElementById("btnTransferenciaGasto");
    const btnMixtoGasto = document.getElementById("btnMixtoGasto");

    if(btnEfectivoGasto) btnEfectivoGasto.onclick = () => cambiarMetodoPagoGasto("efectivo");
    if(btnTransferenciaGasto) btnTransferenciaGasto.onclick = () => cambiarMetodoPagoGasto("transferencia");
    if(btnMixtoGasto) btnMixtoGasto.onclick = () => cambiarMetodoPagoGasto("mixto");

    const guardarProveedorBtn = document.getElementById("guardarProveedor");

    if(guardarProveedorBtn) guardarProveedorBtn.onclick = guardarProveedor;

    const btnVolverProveedores = document.getElementById("btnVolverProveedores");

    if(btnVolverProveedores) btnVolverProveedores.onclick = cerrarPantallaProveedorDetalle;

    const guardarCompraProveedorBtn = document.getElementById("guardarCompraProveedor");

    if(guardarCompraProveedorBtn) guardarCompraProveedorBtn.onclick = guardarCompraProveedor;

    const guardarPagoProveedorBtn = document.getElementById("guardarPagoProveedor");

    if(guardarPagoProveedorBtn) guardarPagoProveedorBtn.onclick = guardarPagoProveedor;

    const btnVolverAnotaciones = document.getElementById("btnVolverAnotaciones");

    if(btnVolverAnotaciones) btnVolverAnotaciones.onclick = cerrarPantallaAnotacionDetalle;

    const guardarMezclaBtn = document.getElementById("guardarMezcla");

    if(guardarMezclaBtn) guardarMezclaBtn.onclick = guardarMezcla;

    const buscadorSalidaMezcla = document.getElementById("buscadorSalidaMezcla");

    if(buscadorSalidaMezcla) activarBuscadorProductoMezcla(buscadorSalidaMezcla);

    const btnVolverMezclas = document.getElementById("btnVolverMezclas");

    if(btnVolverMezclas) btnVolverMezclas.onclick = cerrarPantallaMezclaDetalle;

    const guardarProduccionMezclaBtn = document.getElementById("guardarProduccionMezcla");

    if(guardarProduccionMezclaBtn) guardarProduccionMezclaBtn.onclick = guardarProduccionMezcla;

}

/* ==========================================
   CARGAR DATOS
========================================== */

async function cargarDatos(){

    // Copia local: sirve de respaldo si no hay internet y hace que la
    // app abra al instante mientras se consulta a Firebase.
    productos = ordenarProductosPorNombre(JSON.parse(localStorage.getItem("productos")) || []);

    clientes = JSON.parse(localStorage.getItem("clientes")) || [];

    proveedores = JSON.parse(localStorage.getItem("proveedores")) || [];

    gastos = JSON.parse(localStorage.getItem("gastos")) || [];

    historialVentas = JSON.parse(localStorage.getItem("historialVentas")) || [];

    eliminaciones = JSON.parse(localStorage.getItem("eliminaciones")) || [];

    mezclas = JSON.parse(localStorage.getItem("mezclas")) || [];

    carpetasNotas = JSON.parse(localStorage.getItem("carpetasNotas")) || [];

    carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    if(!window.FirebaseDB){

        return; // Firebase no disponible: se sigue trabajando solo local.

    }

    await Promise.all(ENTIDADES_SINCRONIZADAS.map(async (ent) =>{

        const remoto = await window.FirebaseDB.leerColeccion(ent.nombre);

        if(remoto === undefined){

            return; // Falla de conexión: seguimos con el respaldo local.

        }

        if(remoto === null){

            // Todavía no existe esa tabla en Firebase: subimos lo que
            // ya había en esta computadora (primera migración).
            window.FirebaseDB.guardarColeccion(ent.nombre, ent.obtener());

        }else{

            ent.asignar(remoto);

            localStorage.setItem(ent.nombre, JSON.stringify(remoto));

        }

    }));

    activarSincronizacionEnVivo();

}

/* ==========================================
   SINCRONIZACIÓN EN VIVO
   Cuando otra computadora cambia una tabla,
   esta función actualiza los datos acá y
   refresca la pantalla que esté abierta.
========================================== */

function activarSincronizacionEnVivo(){

    ENTIDADES_SINCRONIZADAS.forEach(ent =>{

        window.FirebaseDB.escucharColeccion(ent.nombre, (remoto) =>{

            const actual = JSON.stringify(ent.obtener());

            const nuevo = JSON.stringify(remoto);

            if(actual === nuevo) return; // Sin cambios reales, no re-renderizamos.

            ent.asignar(remoto);

            localStorage.setItem(ent.nombre, nuevo);

            refrescarPantallaActual();

        });

    });

}

function refrescarPantallaActual(){

    const mapa = {
        dashboard: renderDashboard,
        Dashboard: renderDashboard,
        Ventas: renderVentas,
        Productos: renderProductos,
        Clientes: renderClientes,
        Proveedores: renderProveedores,
        Gastos: renderGastos,
        Historial: renderHistorial,
        Mezclas: renderMezclas,
        Anotaciones: renderAnotaciones,
        Reportes: renderReportes,
        Eliminaciones: renderEliminaciones
    };

    const fn = mapa[paginaActual];

    if(typeof fn === "function") fn();

}

/* ==========================================
   GUARDAR
========================================== */

// El carrito es la única tabla que NO se sincroniza con Firebase (ver
// ENTIDADES_SINCRONIZADAS): es la venta en curso de esta computadora.
const CLAVES_LOCALES = {
    productos: () => productos,
    clientes: () => clientes,
    proveedores: () => proveedores,
    gastos: () => gastos,
    historialVentas: () => historialVentas,
    eliminaciones: () => eliminaciones,
    mezclas: () => mezclas,
    carpetasNotas: () => carpetasNotas,
    carrito: () => carrito
};

// Sin argumentos guarda TODO (comportamiento de siempre: el respaldo
// seguro para cualquier llamado que no se haya revisado todavía). Pasando
// nombres puntuales ("productos", "historialVentas", etc.) solo se
// reescribe esa tabla en localStorage/Firebase en vez de las 9 enteras,
// que es lo que de verdad cambió en la acción que llamó a guardar.
function guardarDatos(...nombres){

    const guardarTodo = nombres.length === 0;

    const aGuardar = guardarTodo ? Object.keys(CLAVES_LOCALES) : nombres;

    aGuardar.forEach(nombre =>{

        const obtener = CLAVES_LOCALES[nombre];

        if(obtener) localStorage.setItem(nombre, JSON.stringify(obtener()));

    });

    if(!window.FirebaseDB) return;

    ENTIDADES_SINCRONIZADAS

        .filter(ent => guardarTodo || aGuardar.includes(ent.nombre))

        .forEach(ent =>{

            window.FirebaseDB.guardarColeccion(ent.nombre, ent.obtener());

        });

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

    // Si hubo una vista previa de tema sin guardar, vuelve al tema guardado.
    if(typeof aplicarTema === "function") aplicarTema();

    document
        .querySelectorAll(".sidebar button")
        .forEach(b=>b.classList.remove("activo"));

    const boton = document.getElementById(nombre);

    if(boton) boton.classList.add("activo");

    // Se ocultan las pantallas secundarias al cambiar de sección.
    cerrarPantallaClienteDetalle();

    cerrarPantallaPreciosCliente();

    cerrarPantallaAnotacionDetalle();

    cerrarPantallaProveedorDetalle();

    cerrarPantallaMezclaDetalle();

    const detalle=document.getElementById("pantallaClienteDetalle");

    if(detalle){

    detalle.classList.add("oculto");

}

const precios=document.getElementById("pantallaPreciosCliente");

if(precios){

    precios.classList.add("oculto");

}

const app=document.getElementById("appPrincipal");

if(app){

    app.classList.remove("oculto");

}
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
   PANTALLAS SECUNDARIAS (DETALLE CLIENTE / PRECIOS)
========================================== */

function abrirPantallaClienteDetalle(){

    const app = document.getElementById("appPrincipal");

    const pantalla = document.getElementById("pantallaClienteDetalle");

    if(app) app.classList.add("oculto");

    if(pantalla) pantalla.classList.remove("oculto");

}

function cerrarPantallaClienteDetalle(){

    const app = document.getElementById("appPrincipal");

    const pantalla = document.getElementById("pantallaClienteDetalle");

    if(app && app.classList.contains("oculto")){

        app.classList.remove("oculto");

    }

    if(pantalla) pantalla.classList.add("oculto");

}

function abrirPantallaPreciosCliente(){

    const detalle = document.getElementById("pantallaClienteDetalle");

    const pantalla = document.getElementById("pantallaPreciosCliente");

    if(detalle) detalle.classList.add("oculto");

    if(pantalla) pantalla.classList.remove("oculto");

}

function abrirPantallaProveedorDetalle(){

    const app = document.getElementById("appPrincipal");

    const pantalla = document.getElementById("pantallaProveedorDetalle");

    if(app) app.classList.add("oculto");

    if(pantalla) pantalla.classList.remove("oculto");

}

function cerrarPantallaProveedorDetalle(){

    const app = document.getElementById("appPrincipal");

    const pantalla = document.getElementById("pantallaProveedorDetalle");

    if(app && app.classList.contains("oculto")){

        app.classList.remove("oculto");

    }

    if(pantalla) pantalla.classList.add("oculto");

}

function cerrarPantallaPreciosCliente(){

    const detalle = document.getElementById("pantallaClienteDetalle");

    const pantalla = document.getElementById("pantallaPreciosCliente");

    if(detalle) detalle.classList.remove("oculto");

    if(pantalla) pantalla.classList.add("oculto");

}

function abrirPantallaAnotacionDetalle(){

    const app = document.getElementById("appPrincipal");

    const pantalla = document.getElementById("pantallaAnotacionDetalle");

    if(app) app.classList.add("oculto");

    if(pantalla) pantalla.classList.remove("oculto");

}

function cerrarPantallaAnotacionDetalle(){

    const app = document.getElementById("appPrincipal");

    const pantalla = document.getElementById("pantallaAnotacionDetalle");

    if(app && app.classList.contains("oculto")){

        app.classList.remove("oculto");

    }

    if(pantalla) pantalla.classList.add("oculto");

}
