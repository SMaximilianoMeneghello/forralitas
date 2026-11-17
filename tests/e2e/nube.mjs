/* Pruebas con "nube" (emulador local de Firebase, nunca la base real):
   datos de una versión anterior, dos PCs a la vez, cortes de
   internet, cuentas de negocio, aislamiento entre negocios y pase
   del modo clásico a cuenta.

   Requiere: node tests/emulador.mjs  y  npm run dev (o URL_APP). */
import { initializeApp, deleteApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from "firebase/auth";
import {
    abrirNavegador, nuevaPC, crearPrimerAdmin, crearProducto, vender,
    aceptarConfirmacion, visible, estado, afirmar, esperar, ingresar
} from "./util.mjs";

const FS = "http://127.0.0.1:8080";
const AUTH = "http://127.0.0.1:9099";

async function reiniciarEmulador(){
    await fetch(FS + "/emulator/v1/projects/demo-prueba/databases/(default)/documents", { method: "DELETE" });
    await fetch(AUTH + "/emulator/v1/projects/demo-prueba/accounts", { method: "DELETE" });
}

async function crearCuenta(email, clave){
    const r = await fetch(AUTH + "/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: clave, returnSecureToken: true })
    });
    return (await r.json()).localId;
}

let serie = 0;
function sdk(){
    const app = initializeApp({ projectId: "demo-prueba", apiKey: "demo" }, "prueba" + (++serie));
    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    const auth = getAuth(app);
    connectAuthEmulator(auth, AUTH, { disableWarnings: true });
    return { app, db, auth };
}

const bloquearNube = (pc) => pc.contexto.route(/127\.0\.0\.1:(8080|9099)/, r => r.abort());
const liberarNube = (pc) => pc.contexto.unroute(/127\.0\.0\.1:(8080|9099)/);

async function entrarClasico(pc, usuario, clave){
    await visible(pc.pagina, "#pantallaConexion");
    await pc.pagina.click("#enlaceSinCuenta");
    await ingresar(pc.pagina, usuario, clave);
    await visible(pc.pagina, "#appPrincipal");
}

async function entrarConCuenta(pc, email, clave){
    await visible(pc.pagina, "#pantallaConexion");
    await pc.pagina.fill("#conexionEmail", email);
    await pc.pagina.fill("#conexionClave", clave);
    await pc.pagina.click("#btnConexion");
}

const sincronizado = (pagina, msj, ms = 20000) =>
    esperar(pagina, "gestorSync.estado().pendientes === 0 && gestorSync.estado().confirmadas === gestorSync.estado().total", msj, ms);

const nav = await abrirNavegador();
const admin = sdk();
const pcs = [];
const pc = async (o) =>{ const x = await nuevaPC(nav, { modo: "emulador", ...o }); pcs.push(x); return x; };

try{

await reiniciarEmulador();

/* ---------- 1. Datos tal como los guarda la versión 1.0.10 ---------- */
console.log("— Datos de la versión anterior");
const viejo = {
    usuarios: [
        { usuario: "lorenaforralitas", password: "forrajeriaforralitas", nombre: "Lorena", rol: "empleado" },
        { usuario: "maxiforralitas", password: "forrajeriaforralitas", nombre: "Maxi", rol: "empleado" },
        { usuario: "maxiadmin", password: "forralitasadmin", nombre: "Maxi (Administrador)", rol: "admin" }
    ],
    productos: [
        { id: "P1700000000001", nombre: "MAIZ X 40KG", categoria: "Granos", pesoBolsa: 40, precioBolsa: 20000, precioKg: 600, stock: 20, stockMinimo: 5 },
        { id: "P1700000000002", nombre: "ALFA VERDE", categoria: "Fardos", pesoBolsa: 22, precioBolsa: 15000, precioKg: 800, stock: 40, stockMinimo: 0 }
    ],
    clientes: [
        { id: "C1700000000001", nombre: "Gerardo", telefono: "381", direccion: "", saldo: 30000, observaciones: "",
          pagos: [{ fecha: "2026-10-01T15:00:00.000Z", fechaTexto: "01/10/2026 12:00", monto: 10000, tipoPago: "efectivo", pago: { efectivo: 10000, transferencia: 0 }, ventaId: "V1700000000001", ventaFechaTexto: "30/09/2026 10:00", restanteVenta: 30000, vendedor: { usuario: "lorenaforralitas", nombre: "Lorena" } }] }
    ],
    proveedores: [],
    gastos: [{ id: "G1700000000001", descripcion: "Luz", monto: 9000, categoria: "servicios", fecha: "2026-10-02", fechaTexto: "2/10/2026", metodoPago: "efectivo", pago: { efectivo: 9000, transferencia: 0 }, vendedor: { usuario: "lorenaforralitas", nombre: "Lorena" } }],
    historialVentas: [
        { id: "V1700000000001", fecha: "2026-09-30T13:00:00.000Z", fechaTexto: "30/09/2026 10:00", cliente: { id: "C1700000000001", nombre: "Gerardo" }, vendedor: { usuario: "lorenaforralitas", nombre: "Lorena" },
          productos: [{ id: "P1700000000001", nombre: "MAIZ X 40KG", cantidad: 2, precio: 20000, modo: "bolsa", subtotal: 40000, bolsas: 2, kg: 80 }],
          total: 40000, metodoPago: "debe", pago: { efectivo: 0, transferencia: 0 }, saldoPendiente: 30000, pagada: false }
    ],
    eliminaciones: [],
    mezclas: [],
    carpetasNotas: [],
    preciosClientes: [{ id: "PC1700000000001", clienteId: "C1700000000001", productoId: "P1700000000002", precioBolsa: 14000, precioKg: 0 }],
    configuracionSistema: { tema: { color: "#2e7d32", fondo: "#f5f6fa", fuente: "16", animaciones: true, sombras: true, radio: 18 }, dashboard: { mostrarUltimasVentas: true, mostrarStock: true, mostrarClientes: true, mostrarGastos: true, cantidadVentas: 5 }, ventas: { confirmarEliminar: false, confirmarVenta: false, sonidoVenta: true, ventaRapida: true }, inventario: { stockMinimo: 5, alertas: true, mostrarSinStock: true } }
};
for(const k of Object.keys(viejo)) await setDoc(doc(admin.db, "forralitasDatos", k), { datos: viejo[k], actualizado: Date.now() });
const nube = async (ruta, tabla) => (await getDoc(doc(admin.db, ...ruta, tabla))).data();

const A = await pc();
await entrarClasico(A, "maxiadmin", "forralitasadmin");
await sincronizado(A.pagina, "PC A sincronizada");
afirmar(await estado(A.pagina, "historialVentas.length === 1 && productos.length === 2 && clientes[0].saldo === 30000"), "PC A ve los datos anteriores");
afirmar(await estado(A.pagina, "document.querySelector('.sidebar .logo').textContent === 'FORRALITAS'"), "el negocio se sigue llamando FORRALITAS");
let u = (await nube(["forralitasDatos"], "usuarios")).datos;
afirmar(u.find(x => x.usuario === "maxiadmin").hash && !u.find(x => x.usuario === "maxiadmin").password, "la contraseña del admin quedó cifrada en la nube");
afirmar(u.find(x => x.usuario === "lorenaforralitas").password === "forrajeriaforralitas", "las cuentas que todavía no ingresaron siguen funcionando igual");
afirmar(u.find(x => x.usuario === "maxiforralitas").ocultarEliminaciones === true, "se conserva el usuario sin registro de eliminaciones (ahora como opción visible)");
afirmar(await estado(A.pagina, "productos.find(p => p.nombre === 'MAIZ X 40KG').separarPorBolsa === 11000 && productos.find(p => p.nombre === 'ALFA VERDE').separarPorBolsa === 5000"), "las reglas de 'separar' pasaron a los productos");
await A.pagina.click("#Reportes");
await A.pagina.fill("#fechaDesdeReporte", "2026-09-01");
await A.pagina.fill("#fechaHastaReporte", "2026-10-31");
await A.pagina.click("#btnGenerarReporte");
afirmar(await estado(A.pagina, "(() => { const t = document.getElementById('contenidoReporte').textContent; return t.includes('Separar Maíz') && t.includes('$22.000'); })()"), "la Caja sigue mostrando Separar Maíz ($22.000 por 2 bolsas)");
// precio especial con kg en 0: debe usar el precio de lista por kg.
afirmar(await estado(A.pagina, "(() => { const p = preciosProductoPara(productos[1], 'C1700000000001'); return p.precioBolsa === 14000 && p.precioKg === 800; })()"), "precio especial: bolsa especial y kg de lista (antes quedaba en $0)");

const B = await pc();
await entrarClasico(B, "LorenaForralitas", "forrajeriaforralitas");
await sincronizado(B.pagina, "PC B sincronizada");

/* ---------- 2. Dos PCs vendiendo a la vez ---------- */
console.log("— Dos PCs a la vez");
await Promise.all([
    vender(A.pagina, [{ buscar: "maiz", cantidad: 3 }]),
    vender(B.pagina, [{ buscar: "maiz", cantidad: 4 }, { buscar: "alfa", cantidad: 1 }])
]);
for(const x of [A, B]){
    await esperar(x.pagina, "historialVentas.length === 3 && productos.find(p => p.nombre === 'MAIZ X 40KG').stock === 13", "PC " + (x === A ? "A" : "B") + ": 3 ventas y stock de maíz 20 − 3 − 4 = 13", 20000);
}
const hv = (await nube(["forralitasDatos"], "historialVentas")).datos;
afirmar(hv.length === 3, "en la nube están las 3 ventas");

// B está armando una venta fiada por kilo; llega una venta de A: no se le desarma.
await B.pagina.click("#Ventas");
await B.pagina.fill("#buscarClienteVenta", "gerardo");
await B.pagina.click("#listaClientesVenta .itemBusquedaProducto");
await B.pagina.click("#btnDebe");
await B.pagina.click("#modoKg");
await B.pagina.fill("#buscarVenta", "alf");
await vender(A.pagina, [{ buscar: "alfa", cantidad: 2 }]);
await esperar(B.pagina, "historialVentas.length === 4", "B recibe la venta de A");
afirmar(await estado(B.pagina, "estadoVenta === 'debe' && modoVenta === 'kg' && document.getElementById('btnDebe').classList.contains('estadoActivo') && document.getElementById('modoKg').classList.contains('modoActivo') && document.getElementById('buscarVenta').value === 'alf' && clienteSeleccionado && clienteSeleccionado.nombre === 'Gerardo'"), "a B no se le pierde el cliente, DEBE, el modo Kg ni lo que estaba buscando");
await B.pagina.click("#listaProductosVenta .itemBusquedaProducto");
await B.pagina.fill("#inputCantidad", "11");
await B.pagina.click("#modalCantidad .btnGuardar");
await B.pagina.click("#btnRegistrarVenta");
await esperar(A.pagina, "historialVentas.length === 5 && clientes[0].saldo === 30000 + 8800", "A ve la venta fiada de B y el saldo del cliente");

/* ---------- 3. Cortes de internet ---------- */
console.log("— Sin internet");
await B.contexto.setOffline(true);
await vender(B.pagina, [{ buscar: "maiz", cantidad: 1 }]);
await vender(B.pagina, [{ buscar: "maiz", cantidad: 2 }]);
await esperar(B.pagina, "document.getElementById('estadoSync').textContent.includes('Sin conexión')", "B muestra el aviso 'Sin conexión'", 40000);
afirmar(await estado(B.pagina, "gestorSync.estado().pendientes > 0 && historialVentas.length === 7"), "las ventas quedan guardadas en la PC");
await vender(A.pagina, [{ buscar: "maiz", cantidad: 1 }]);
await sincronizado(A.pagina, "A sigue trabajando normalmente");
await B.contexto.setOffline(false);
await B.pagina.evaluate("window.dispatchEvent(new Event('online'))");
await esperar(B.pagina, "gestorSync.estado().pendientes === 0 && historialVentas.length === 8", "al volver internet B sube lo suyo y recibe lo de A", 90000);
await esperar(A.pagina, "historialVentas.length === 8 && productos.find(p => p.nombre === 'MAIZ X 40KG').stock === 9", "A recibe las ventas hechas sin internet (maíz 13 − 1 − 2 − 1 = 9)", 30000);
afirmar(await estado(B.pagina, "productos.find(p => p.nombre === 'MAIZ X 40KG').stock === 9"), "B queda con el mismo stock");

// Se abre el programa sin internet, se vende y se cierra; al volver a abrir con internet, sube.
await bloquearNube(B);
await B.pagina.reload();
await visible(B.pagina, "#appPrincipal", 20000);
afirmar(await estado(B.pagina, "historialVentas.length === 8 && usuarioActual.usuario === 'lorenaforralitas'"), "abrir sin internet: están la sesión y todos los datos");
await vender(B.pagina, [{ buscar: "alfa", cantidad: 5 }]);
afirmar(await estado(B.pagina, "gestorSync.estado().pendientes > 0"), "la venta queda pendiente de subir");
await B.pagina.waitForTimeout(500);
await liberarNube(B);
await B.pagina.reload();
await visible(B.pagina, "#appPrincipal", 20000);
await esperar(B.pagina, "gestorSync.estado().pendientes === 0 && historialVentas.length === 9", "al reabrir con internet la venta pendiente se sube", 60000);
await esperar(A.pagina, "historialVentas.length === 9", "y A la recibe", 30000);

/* ---------- 4. El admin corrige desde su PC ---------- */
console.log("— El admin edita y elimina lo de otra PC");
const idUltima = await estado(A.pagina, "[...historialVentas].sort((a,b) => new Date(b.fecha) - new Date(a.fecha))[0].id");
await A.pagina.click("#Historial");
await A.pagina.click(`button[onclick="eliminarVentaHistorial('${idUltima}')"]`);
await aceptarConfirmacion(A.pagina);
await esperar(B.pagina, "historialVentas.length === 8 && productos.find(p => p.nombre === 'ALFA VERDE').stock === 40 - 1 - 2 - 0.5", "B ve la venta eliminada y el stock devuelto");
await B.pagina.click("#Historial");
afirmar(await estado(B.pagina, "document.querySelectorAll('#listaHistorialVentas .cardVentaHistorial').length === 8"), "la lista del historial de B se actualizó sola");

/* ---------- 5. Negocios con cuenta: aislamiento ---------- */
console.log("— Cuentas de negocio");
const uid1 = await crearCuenta("negocio1@prueba.com", "clave-uno");
const uid2 = await crearCuenta("negocio2@prueba.com", "clave-dos");

const C = await pc();
await entrarConCuenta(C, "negocio1@prueba.com", "mal");
await esperar(C.pagina, "document.getElementById('conexionError').textContent.length > 5", "clave del negocio incorrecta: avisa");
await C.pagina.fill("#conexionClave", "clave-uno");
await C.pagina.click("#btnConexion");
await crearPrimerAdmin(C.pagina, { negocio: "Ferretería Uno", nombre: "Laura", usuario: "laura", clave: "laura123" });
await crearProducto(C.pagina, { nombre: "MAIZ X 40KG", peso: 40, precioBolsa: 100, precioKg: 3, stock: 7 });
await sincronizado(C.pagina, "negocio 1 sincronizado");
afirmar(await estado(C.pagina, `adaptadorActual.ruta === "negocios/${uid1}/datos"`), "los datos del negocio 1 van a su propia carpeta");
afirmar(await estado(C.pagina, "productos.length === 1 && historialVentas.length === 0 && !(productos[0].separarPorBolsa > 0)"), "el negocio nuevo empieza vacío (sin datos ni reglas de FORRALITAS)");

const D = await pc();
await entrarConCuenta(D, "negocio2@prueba.com", "clave-dos");
await visible(D.pagina, "#pantallaPrimerAdmin");
afirmar(true, "el negocio 2 no ve nada del negocio 1: arranca de cero");

// Reglas de seguridad reales: nadie lee los datos de otro.
const intruso = sdk();
let denegado = false;
try{ await getDoc(doc(intruso.db, "negocios", uid1, "datos", "productos")); }catch(e){ denegado = e.code === "permission-denied"; }
afirmar(denegado, "sin cuenta no se pueden leer los datos de un negocio");
await signInWithEmailAndPassword(intruso.auth, "negocio2@prueba.com", "clave-dos");
denegado = false;
try{ await getDoc(doc(intruso.db, "negocios", uid1, "datos", "productos")); }catch(e){ denegado = e.code === "permission-denied"; }
afirmar(denegado, "la cuenta del negocio 2 no puede leer los datos del negocio 1");
denegado = false;
try{ await setDoc(doc(intruso.db, "negocios", uid1, "datos", "productos"), { datos: [] }); }catch(e){ denegado = e.code === "permission-denied"; }
afirmar(denegado, "ni escribirlos");
const propio = await getDoc(doc(intruso.db, "negocios", uid2, "datos", "productos"));
afirmar(!propio.exists(), "pero sí acceder a su propia carpeta");

// Otra PC del negocio 1.
const C2 = await pc();
await entrarConCuenta(C2, "negocio1@prueba.com", "clave-uno");
await ingresar(C2.pagina, "laura", "laura123");
await visible(C2.pagina, "#appPrincipal");
await esperar(C2.pagina, "productos.length === 1 && document.querySelector('.sidebar .logo').textContent === 'Ferretería Uno'", "una segunda PC del negocio 1 ve sus datos");

/* ---------- 6. Pasar el negocio original a cuenta ---------- */
console.log("— Pase de modo clásico a cuenta");
const uid3 = await crearCuenta("forralitas@prueba.com", "clave-tres");
const cantidades = await estado(A.pagina, "({ v: historialVentas.length, p: productos.length, c: clientes.length, g: gastos.length, e: eliminaciones.length })");
await A.pagina.click("#Configuracion");
await A.pagina.fill("#migrarEmail", "negocio1@prueba.com");
await A.pagina.fill("#migrarClave", "clave-uno");
await A.pagina.click("#btnMigrarACuenta");
await esperar(A.pagina, "[...document.querySelectorAll('.notificacion')].some(n => n.textContent.includes('ya tiene datos'))", "no deja pasar los datos a una cuenta que ya es de otro negocio");
await A.pagina.fill("#migrarEmail", "forralitas@prueba.com");
await A.pagina.fill("#migrarClave", "clave-tres");
await Promise.all([
    A.pagina.waitForNavigation({ timeout: 30000 }),
    A.pagina.click("#btnMigrarACuenta")
]);
await visible(A.pagina, "#appPrincipal", 20000);
await sincronizado(A.pagina, "A ya trabaja con la cuenta", 40000);
afirmar(await estado(A.pagina, `adaptadorActual.ruta === "negocios/${uid3}/datos" && usuarioActual.usuario === "maxiadmin"`), "A sigue con su sesión, ahora en la carpeta de la cuenta");
afirmar(JSON.stringify(await estado(A.pagina, "({ v: historialVentas.length, p: productos.length, c: clientes.length, g: gastos.length, e: eliminaciones.length })")) === JSON.stringify(cantidades), "no se perdió ningún dato en el pase");
let espiado = false;
try{ await nube(["negocios", uid3, "datos"], "historialVentas"); espiado = true; }catch(e){ /* denegado: correcto */ }
afirmar(!espiado, "sin la cuenta no se puede espiar la carpeta nueva");
await esperar(B.pagina, "document.getElementById('pantallaConexion').style.display === 'flex' && document.getElementById('conexionAviso').textContent.includes('cuenta')", "la otra PC, que estaba abierta en modo clásico, pide la cuenta", 20000);
afirmar(await estado(B.pagina, "document.getElementById('enlaceSinCuenta').classList.contains('oculto')"), "y ya no ofrece seguir sin cuenta");
await B.pagina.fill("#conexionEmail", "forralitas@prueba.com");
await B.pagina.fill("#conexionClave", "clave-tres");
await B.pagina.click("#btnConexion");
await visible(B.pagina, "#appPrincipal", 20000);
await esperar(B.pagina, `historialVentas.length === ${cantidades.v} && usuarioActual.usuario === "lorenaforralitas"`, "B ingresa con la cuenta y ve todo", 20000);
await vender(B.pagina, [{ buscar: "maiz", cantidad: 1 }]);
await esperar(A.pagina, `historialVentas.length === ${cantidades.v + 1}`, "y siguen sincronizando entre sí en la cuenta");
// Una PC nueva ya no puede entrar sin cuenta.
const E = await pc();
await visible(E.pagina, "#pantallaConexion");
await E.pagina.click("#enlaceSinCuenta");
await esperar(E.pagina, "document.getElementById('conexionAviso').textContent.includes('cuenta')", "una PC nueva que intenta entrar sin cuenta recibe el aviso de usar la cuenta", 20000);

const todos = pcs.flatMap(x => x.errores);
if(todos.length){ console.log("ERRORES DE CONSOLA:", todos); process.exitCode = 1; }
else console.log("\nTODO OK (nube)");

}catch(e){
    console.error("\n" + e.message);
    console.log("errores de consola:", pcs.flatMap(x => x.errores));
    process.exitCode = 1;
}
await nav.close();
await deleteApp(admin.app).catch(() => {});
process.exit(process.exitCode || 0);
