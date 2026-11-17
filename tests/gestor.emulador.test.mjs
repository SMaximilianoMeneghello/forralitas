/* Pruebas del gestor de sincronización contra el EMULADOR de
   Firestore (nunca contra la base real). Simula varias PCs.

   Requiere el emulador corriendo en 127.0.0.1:8080:
       firebase emulators:start --project demo-prueba --only firestore,auth
*/
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import {
    getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, onSnapshot,
    runTransaction, disableNetwork, enableNetwork, collection, getDocs
} from "firebase/firestore";
import { crearContexto, cargar } from "./cargar.mjs";

const plano = v => JSON.parse(JSON.stringify(v));
const dormir = ms => new Promise(r => setTimeout(r, ms));
const apps = [];
const pcs = [];
let serie = 0;

after(async () =>{
    for(const p of pcs){ if(p.gestor) p.gestor.detener(); }
    for(const a of apps) await deleteApp(a).catch(() => {});
});

function crearAlmacen(){
    const m = new Map();
    return {
        m,
        guardarJson: (n, json) =>{ m.set(n, json); return Promise.resolve(true); },
        guardar: (n, v) =>{ m.set(n, JSON.stringify(v)); return Promise.resolve(true); },
        leer: async n => m.has(n) ? JSON.parse(m.get(n)) : null,
        borrar: async n =>{ m.delete(n); }
    };
}

function crearPC(coleccion, opciones = {}){

    serie++;

    const app = initializeApp({ projectId: "demo-prueba", apiKey: "demo" }, "pc" + serie);
    apps.push(app);

    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);

    const ref = n => doc(db, coleccion, n);

    // disableNetwork() corta las escuchas pero no las transacciones del
    // SDK; en un corte real también fallan, así que se simula acá.
    let cortado = false;
    const sinRed = () =>{ const e = new Error("sin conexión (simulado)"); e.code = "unavailable"; return e; };

    const adaptador = {
        leer: async n =>{ if(cortado) throw sinRed(); const s = await getDoc(ref(n)); return s.exists() ? s.data() : null; },
        escuchar: (n, cb, cbErr) => onSnapshot(ref(n), { includeMetadataChanges: true },
            s => cb(s.exists() ? s.data() : null, { deCache: s.metadata.fromCache }), cbErr),
        escribir: (n, d) => setDoc(ref(n), plano(d)),
        transaccion: fn => cortado ? Promise.reject(sinRed()) : runTransaction(db, async t => fn({
            leer: async n =>{ const s = await t.get(ref(n)); return s.exists() ? s.data() : null; },
            escribir: (n, d) => t.set(ref(n), plano(d)),
            borrar: n => t.delete(ref(n))
        }))
    };

    const pc = { db, adaptador, almacen: opciones.almacen || crearAlmacen(), datos: {}, cambios: 0 };

    pc.arrancar = async (tablasDef) =>{
        const ctx = crearContexto();
        cargar(ctx, "src/js/datos/sync-nucleo.js");
        cargar(ctx, "src/js/datos/sync-gestor.js");
        const defs = (tablasDef || [
            { nombre: "ventas", clave: "id", alInicio: true },
            { nombre: "productos", clave: "id" },
            { nombre: "config", clave: null }
        ]).map(d => ({
            ...d,
            vacio: () => d.clave ? [] : {},
            obtener: () => pc.datos[d.nombre],
            asignar: v =>{ pc.datos[d.nombre] = v; }
        }));
        pc.gestor = ctx.crearGestorSync({
            adaptador, almacen: pc.almacen, tablas: defs,
            limiteBytes: opciones.limite,
            alCambiar: () =>{ pc.cambios++; }
        });
        await pc.gestor.iniciar({ tiempoMaximo: opciones.tiempoMaximo || 5000 });
        return pc;
    };

    pc.guardar = () => pc.gestor.guardar();
    pc.sincronizado = async () =>{
        for(let i = 0; i < 100; i++){
            await pc.gestor.sincronizarAhora();
            if(pc.gestor.estado().pendientes === 0) return;
            await dormir(150);
        }
        throw new Error("no terminó de sincronizar");
    };
    pc.cortar = () =>{ cortado = true; return disableNetwork(db); };
    pc.conectar = () =>{ cortado = false; return enableNetwork(db); };
    pcs.push(pc);

    return pc;
}

async function hasta(cond, ms = 8000, que = "condición"){
    const fin = Date.now() + ms;
    while(Date.now() < fin){
        if(await cond()) return;
        await dormir(50);
    }
    throw new Error("Tiempo agotado esperando: " + que);
}

const ids = l => plano(l).map(r => r.id);
const col = nombre => "t_" + nombre + "_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);

test("dos PCs registran ventas a la vez y no se pierde ninguna", async () =>{
    const c = col("dos");
    const A = await crearPC(c).arrancar();
    const B = await crearPC(c).arrancar();
    A.datos.ventas.unshift({ id: "VA1", total: 100 });
    B.datos.ventas.unshift({ id: "VB1", total: 200 });
    A.guardar(); B.guardar();
    await A.sincronizado(); await B.sincronizado();
    await hasta(() => A.datos.ventas.length === 2 && B.datos.ventas.length === 2, 8000, "las dos ventas en ambas PCs");
    assert.deepEqual(ids(A.datos.ventas).sort(), ["VA1", "VB1"]);
    assert.deepEqual(ids(B.datos.ventas).sort(), ["VA1", "VB1"]);
});

test("ráfaga de ventas simultáneas desde 3 PCs", async () =>{
    const c = col("rafaga");
    const pcs = [await crearPC(c).arrancar(), await crearPC(c).arrancar(), await crearPC(c).arrancar()];
    pcs[0].datos.productos.push({ id: "P1", nombre: "Maíz", stock: 100 });
    pcs[0].guardar();
    await pcs[0].sincronizado();
    await hasta(() => pcs.every(p => p.datos.productos.length === 1), 8000, "producto en todas");
    for(let i = 0; i < 10; i++){
        pcs.forEach((p, n) =>{
            p.datos.ventas.unshift({ id: "V" + n + "_" + i, total: i });
            p.datos.productos.find(x => x.id === "P1").stock -= 1;
            p.guardar();
        });
        await dormir(30);
    }
    for(const p of pcs) await p.sincronizado();
    await hasta(() => pcs.every(p => p.datos.ventas.length === 30 && p.datos.productos[0].stock === 70), 15000, "30 ventas y stock 70 en todas");
    for(const p of pcs) await p.sincronizado();
    assert.ok(pcs.every(p => p.datos.productos[0].stock === 70));
});

test("sin internet: los cambios quedan en cola y se combinan al volver", async () =>{
    const c = col("offline");
    const A = await crearPC(c).arrancar();
    const B = await crearPC(c).arrancar();
    A.datos.productos.push({ id: "P1", nombre: "Alfa", stock: 20 });
    A.guardar(); await A.sincronizado();
    await hasta(() => B.datos.productos.length === 1, 8000, "producto en B");
    await B.cortar();
    B.datos.ventas.unshift({ id: "VB1", total: 1 });
    B.datos.productos[0].stock -= 2;
    B.guardar();
    B.datos.ventas.unshift({ id: "VB2", total: 2 });
    B.datos.productos[0].stock -= 1;
    B.guardar();
    A.datos.ventas.unshift({ id: "VA1", total: 3 });
    A.datos.productos[0].stock -= 5;
    A.guardar(); await A.sincronizado();
    await dormir(500);
    assert.equal(B.datos.ventas.length, 2, "B sin conexión no ve lo de A");
    assert.ok(B.gestor.estado().pendientes > 0);
    await B.conectar();
    await hasta(() => B.gestor.estado().pendientes === 0 && B.datos.ventas.length === 3, 20000, "B sube su cola");
    await hasta(() => A.datos.ventas.length === 3 && A.datos.productos[0].stock === 12, 8000, "A recibe lo de B");
    assert.equal(B.datos.productos[0].stock, 12);
    assert.deepEqual(ids(A.datos.ventas).sort(), ["VA1", "VB1", "VB2"]);
});

test("se cierra el programa sin internet: al reabrir sube lo pendiente", async () =>{
    const c = col("reinicio");
    const A = await crearPC(c).arrancar();
    A.datos.productos.push({ id: "P1", stock: 10 });
    A.guardar(); await A.sincronizado();
    const B1 = await crearPC(c).arrancar();
    await B1.cortar();
    B1.datos.ventas.unshift({ id: "VOFF", total: 9 });
    B1.datos.productos[0].stock -= 4;
    B1.guardar();
    B1.gestor.detener();
    // Mientras tanto A sigue trabajando.
    A.datos.productos[0].stock -= 1;
    A.datos.ventas.unshift({ id: "VA", total: 1 });
    A.guardar(); await A.sincronizado();
    // "Reabrir" B: mismo almacén local, nueva conexión.
    const B2 = await crearPC(c, { almacen: B1.almacen }).arrancar();
    assert.ok(ids(B2.datos.ventas).includes("VOFF"), "la venta hecha sin internet sigue en la PC");
    await B2.sincronizado();
    await hasta(() => A.datos.ventas.length === 2 && A.datos.productos[0].stock === 5, 8000, "A recibe la venta offline");
    assert.equal(B2.datos.productos[0].stock, 5);
    assert.deepEqual(ids(B2.datos.ventas).sort(), ["VA", "VOFF"]);
});

test("arranque sin conexión usa los datos locales y no borra nada", async () =>{
    const c = col("arranqueoff");
    const A = await crearPC(c).arrancar();
    A.datos.ventas.unshift({ id: "V1", total: 1 });
    A.guardar(); await A.sincronizado();
    const pc = crearPC(c, { almacen: A.almacen, tiempoMaximo: 600 });
    await pc.cortar();
    await pc.arrancar();
    assert.deepEqual(ids(pc.datos.ventas), ["V1"]);
    assert.equal(pc.gestor.info("ventas").confirmado, false);
    pc.datos.ventas.unshift({ id: "V2", total: 2 });
    pc.guardar();
    await pc.conectar();
    await hasta(() => pc.gestor.estado().pendientes === 0 && pc.gestor.info("ventas").confirmado, 20000, "sube al conectar");
    await hasta(() => A.datos.ventas.length === 2, 8000, "A recibe V2");
});

test("primera vez: si la nube está vacía se sube lo que hay en la PC", async () =>{
    const c = col("migracion");
    const almacen = crearAlmacen();
    almacen.guardar("ventas", [{ id: "V2" }, { id: "V1" }]);
    almacen.guardar("config", { tema: { color: "#111" } });
    const A = await crearPC(c, { almacen }).arrancar();
    await A.sincronizado();
    const B = await crearPC(c).arrancar();
    assert.deepEqual(ids(B.datos.ventas), ["V2", "V1"]);
    assert.deepEqual(plano(B.datos.config), { tema: { color: "#111" } });
});

test("PC nueva (sin datos locales) toma lo de la nube y no borra nada", async () =>{
    const c = col("nueva");
    const A = await crearPC(c).arrancar();
    A.datos.ventas.unshift({ id: "V1" });
    A.guardar(); await A.sincronizado();
    const B = await crearPC(c).arrancar();
    assert.deepEqual(ids(B.datos.ventas), ["V1"]);
    await B.sincronizado();
    await dormir(300);
    assert.deepEqual(ids(A.datos.ventas), ["V1"]);
});

test("editar y borrar: se propagan y no reviven", async () =>{
    const c = col("editar");
    const A = await crearPC(c).arrancar();
    const B = await crearPC(c).arrancar();
    A.datos.ventas.unshift({ id: "V1", total: 1 }, { id: "V2", total: 2 });
    A.guardar(); await A.sincronizado();
    await hasta(() => B.datos.ventas.length === 2);
    B.datos.ventas.find(v => v.id === "V1").total = 50;
    B.datos.ventas = B.datos.ventas.filter(v => v.id !== "V2");
    B.guardar(); await B.sincronizado();
    await hasta(() => A.datos.ventas.length === 1 && A.datos.ventas[0].total === 50, 8000, "edición y borrado en A");
    A.datos.ventas.unshift({ id: "V3", total: 3 });
    A.guardar(); await A.sincronizado();
    await hasta(() => B.datos.ventas.length === 2);
    assert.deepEqual(ids(B.datos.ventas), ["V3", "V1"]);
});

test("configuración (objeto): cada PC cambia una cosa distinta", async () =>{
    const c = col("config");
    const A = await crearPC(c).arrancar();
    A.datos.config = { tema: { color: "#111", radio: 10 }, negocio: { nombre: "X" } };
    A.guardar(); await A.sincronizado();
    const B = await crearPC(c).arrancar();
    A.datos.config.tema.color = "#222";
    B.datos.config.negocio.nombre = "Mi negocio";
    A.guardar(); B.guardar();
    await A.sincronizado(); await B.sincronizado();
    const esperado = { tema: { color: "#222", radio: 10 }, negocio: { nombre: "Mi negocio" } };
    await hasta(() => JSON.stringify(A.datos.config) === JSON.stringify(esperado) && JSON.stringify(B.datos.config) === JSON.stringify(esperado), 8000, "config combinada");
});

function venta(i){ return { id: "V" + String(i).padStart(5, "0"), total: i, texto: "x".repeat(120) }; }

test("historial grande: se reparte en varios documentos y sigue todo igual", async () =>{
    const c = col("grande");
    const limite = 6000;
    const A = await crearPC(c, { limite }).arrancar();
    for(let i = 1; i <= 300; i++){
        A.datos.ventas.unshift(venta(i));
        if(i % 25 === 0){ A.guardar(); await A.sincronizado(); }
    }
    const docs = await getDocs(collection(A.db, c));
    const nombres = docs.docs.map(d => d.id).filter(n => n.startsWith("ventas"));
    assert.ok(nombres.length > 5, "debería haber varias partes: " + nombres.join(","));
    for(const d of docs.docs){
        if(!d.id.startsWith("ventas") || d.id.endsWith("__idx")) continue;
        const tam = JSON.stringify(d.data().datos).length;
        assert.ok(tam < limite * 1.6, d.id + " quedó muy grande: " + tam);
    }
    const esperado = [];
    for(let i = 300; i >= 1; i--) esperado.push(venta(i).id);
    // Una PC nueva arma el historial completo y en orden.
    const B = await crearPC(c, { limite }).arrancar();
    assert.deepEqual(ids(B.datos.ventas), esperado);
    // B edita una venta vieja y borra otra; A lo recibe.
    B.datos.ventas.find(v => v.id === "V00003").total = 999;
    B.datos.ventas = B.datos.ventas.filter(v => v.id !== "V00010");
    B.guardar(); await B.sincronizado();
    await hasta(() => A.datos.ventas.length === 299 && A.datos.ventas.find(v => v.id === "V00003").total === 999, 8000, "edición de venta vieja en A");
    // Las dos siguen vendiendo a la vez.
    A.datos.ventas.unshift(venta(301)); B.datos.ventas.unshift(venta(302));
    A.guardar(); B.guardar();
    await A.sincronizado(); await B.sincronizado();
    await hasta(() => A.datos.ventas.length === 301 && B.datos.ventas.length === 301, 8000, "301 en ambas");
    const C = await crearPC(c, { limite }).arrancar();
    assert.equal(C.datos.ventas.length, 301);
    assert.equal(C.datos.ventas.find(v => v.id === "V00003").total, 999);
    assert.deepEqual(ids(C.datos.ventas).slice(2), esperado.filter(x => x !== "V00010"));
});

test("subida inicial de una tabla enorme (migración) queda repartida", async () =>{
    const c = col("subidagrande");
    const almacen = crearAlmacen();
    const lista = [];
    for(let i = 500; i >= 1; i--) lista.push(venta(i));
    almacen.guardar("ventas", lista);
    const A = await crearPC(c, { almacen, limite: 8000 }).arrancar();
    await A.sincronizado();
    const B = await crearPC(c, { limite: 8000 }).arrancar();
    assert.deepEqual(ids(B.datos.ventas), ids(lista));
});

test("una versión vieja del programa pisa el documento principal: no se pierden las partes", async () =>{
    const c = col("vieja");
    const limite = 6000;
    const A = await crearPC(c, { limite }).arrancar();
    for(let i = 1; i <= 120; i++) A.datos.ventas.unshift(venta(i));
    A.guardar(); await A.sincronizado();
    // La versión vieja lee SOLO el documento principal y lo vuelve a
    // guardar entero con una venta nueva (sin índice de partes).
    const s = await getDoc(doc(A.db, c, "ventas"));
    const vistaVieja = s.data().datos;
    assert.ok(vistaVieja.length < 120);
    await setDoc(doc(A.db, c, "ventas"), { datos: [{ id: "VVIEJA", total: 7 }].concat(vistaVieja), actualizado: Date.now() });
    await hasta(() => ids(A.datos.ventas).includes("VVIEJA"), 8000, "A recibe la venta de la versión vieja");
    assert.equal(A.datos.ventas.length, 121);
    // Una PC que arranca después también ve todo.
    const B = await crearPC(c, { limite }).arrancar();
    assert.equal(B.datos.ventas.length, 121);
    // Y al siguiente guardado el índice queda reparado.
    B.datos.ventas.unshift(venta(200));
    B.guardar(); await B.sincronizado();
    const s2 = await getDoc(doc(A.db, c, "ventas"));
    assert.ok(Array.isArray(s2.data().orden) && s2.data().orden.length > 1);
    await hasta(() => A.datos.ventas.length === 122);
});

test("un lote reenviado no se aplica dos veces", async () =>{
    const c = col("idem");
    const A = await crearPC(c).arrancar();
    A.datos.productos.push({ id: "P1", stock: 10 });
    A.guardar(); await A.sincronizado();
    const B = await crearPC(c).arrancar();
    await B.cortar();
    B.datos.productos[0].stock -= 3;
    B.guardar();
    const cola = plano(await B.almacen.leer("cola:productos"));
    assert.equal(cola.length, 1);
    await B.conectar();
    await B.sincronizado();
    await hasta(() => A.datos.productos[0].stock === 7);
    // Simula que la PC "no se enteró" de que el lote ya subió y lo reenvía.
    B.gestor.detener();
    const almacen2 = crearAlmacen();
    almacen2.guardar("productos", [{ id: "P1", stock: 7 }]);
    almacen2.guardar("cola:productos", cola);
    const B2 = await crearPC(c, { almacen: almacen2 }).arrancar();
    await B2.sincronizado();
    await dormir(400);
    assert.equal(A.datos.productos[0].stock, 7);
    assert.equal(B2.datos.productos[0].stock, 7);
});
