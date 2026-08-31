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

// Número correlativo de venta que se muestra en la pantalla del galpón
// (1, 2, 3... nunca se repite, se guarda en Firebase para no perderse).
let contadorVentaGalpon = Number(localStorage.getItem("contadorVentaGalpon")) || 0;

// Variables de trabajo

let carrito = [];
let clienteSeleccionado = null;
let productoSeleccionado = null;

// Página actual

let paginaActual = "dashboard";

/* ==========================================
   TABLAS QUE SE SINCRONIZAN CON FIREBASE
   (el carrito queda solo local: es la venta en
   curso de ESTA computadora, no debe compartirse)
========================================== */

const ENTIDADES_SINCRONIZADAS = [
    { nombre: "productos", obtener: () => productos, asignar: v => productos = v },
    { nombre: "clientes", obtener: () => clientes, asignar: v => clientes = v },
    { nombre: "proveedores", obtener: () => proveedores, asignar: v => proveedores = v },
    { nombre: "gastos", obtener: () => gastos, asignar: v => gastos = v },
    { nombre: "historialVentas", obtener: () => historialVentas, asignar: v => historialVentas = v },
    { nombre: "eliminaciones", obtener: () => eliminaciones, asignar: v => eliminaciones = v }
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

    await sincronizarContadorGalpon();

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

}

/* ==========================================
   CARGAR DATOS
========================================== */

async function cargarDatos(){

    // Copia local: sirve de respaldo si no hay internet y hace que la
    // app abra al instante mientras se consulta a Firebase.
    productos = JSON.parse(localStorage.getItem("productos")) || [];

    clientes = JSON.parse(localStorage.getItem("clientes")) || [];

    proveedores = JSON.parse(localStorage.getItem("proveedores")) || [];

    gastos = JSON.parse(localStorage.getItem("gastos")) || [];

    historialVentas = JSON.parse(localStorage.getItem("historialVentas")) || [];

    eliminaciones = JSON.parse(localStorage.getItem("eliminaciones")) || [];

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
        Reportes: renderReportes,
        Eliminaciones: renderEliminaciones
    };

    const fn = mapa[paginaActual];

    if(typeof fn === "function") fn();

}

/* ==========================================
   GUARDAR
========================================== */

function guardarDatos(){

    // Respaldo local instantáneo (por si se corta internet).
    localStorage.setItem("productos", JSON.stringify(productos));

    localStorage.setItem("clientes", JSON.stringify(clientes));

    localStorage.setItem("proveedores", JSON.stringify(proveedores));

    localStorage.setItem("gastos", JSON.stringify(gastos));

    localStorage.setItem("historialVentas", JSON.stringify(historialVentas));

    localStorage.setItem("eliminaciones", JSON.stringify(eliminaciones));

    localStorage.setItem("carrito", JSON.stringify(carrito));

    if(!window.FirebaseDB) return;

    ENTIDADES_SINCRONIZADAS.forEach(ent =>{

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
        .forEach(b=>b.classList.remove("activo"));

    const boton = document.getElementById(nombre);

    if(boton) boton.classList.add("activo");

    // Se ocultan las pantallas secundarias al cambiar de sección.
    cerrarPantallaClienteDetalle();

    cerrarPantallaPreciosCliente();

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

function abrirReportes(){

    cambiarPagina("Reportes");
    titulo("Reportes");
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
   PANTALLA DEL GALPÓN (AVISO DE VENTA)
   Cada venta manda un aviso a Firebase con
   número correlativo + productos, para que
   la pantalla del galpón lo muestre en vivo.
========================================== */

async function sincronizarContadorGalpon(){

    if(!window.FirebaseDB) return;

    const remoto = await window.FirebaseDB.leerColeccion("contadorVentaGalpon");

    if(remoto === undefined) return; // sin conexión: seguimos con el contador local

    if(remoto === null){

        window.FirebaseDB.guardarColeccion("contadorVentaGalpon", contadorVentaGalpon);

    }else{

        contadorVentaGalpon = Number(remoto) || 0;

        localStorage.setItem("contadorVentaGalpon", contadorVentaGalpon);

    }

    window.FirebaseDB.escucharColeccion("contadorVentaGalpon", (remoto) =>{

        contadorVentaGalpon = Number(remoto) || 0;

        localStorage.setItem("contadorVentaGalpon", contadorVentaGalpon);

    });

}

function obtenerSiguienteNumeroVentaGalpon(){

    contadorVentaGalpon++;

    localStorage.setItem("contadorVentaGalpon", contadorVentaGalpon);

    if(window.FirebaseDB) window.FirebaseDB.guardarColeccion("contadorVentaGalpon", contadorVentaGalpon);

    return contadorVentaGalpon;

}

function formatearItemGalpon(item){

    const cantidad = formatearCantidadItem(item);

    let unidad = unidadVenta(item.modo);

    if(unidad === "Bolsa" && Number(cantidad) !== 1) unidad = "Bolsas";

    return cantidad + " " + unidad + " de " + item.nombre;

}

function enviarAvisoGalpon(venta){

    if(!window.FirebaseDB) return; // sin internet no se puede avisar a la pantalla

    window.FirebaseDB.guardarColeccion("avisoGalpon", {

        numero: venta.numeroGalpon,

        items: (venta.productos || []).map(formatearItemGalpon),

        hora: venta.fechaTexto,

        enviado: Date.now()

    });

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

function cerrarPantallaPreciosCliente(){

    const detalle = document.getElementById("pantallaClienteDetalle");

    const pantalla = document.getElementById("pantallaPreciosCliente");

    if(detalle) detalle.classList.remove("oculto");

    if(pantalla) pantalla.classList.add("oculto");

}
