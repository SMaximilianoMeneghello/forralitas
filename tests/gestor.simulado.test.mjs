/* Pruebas del gestor con una "nube" simulada en memoria, donde se
   controla a mano en qué orden llegan las cosas (para probar casos
   de demora que con el emulador no se pueden forzar). */
import test from "node:test";
import assert from "node:assert/strict";
import { crearContexto, cargar } from "./cargar.mjs";

const plano = v => JSON.parse(JSON.stringify(v));
const dormir = ms => new Promise(r => setTimeout(r, ms));

function crearNube(){
    const docs = new Map();
    const oyentes = new Map();
    return {
        docs,
        adaptador(){
            return {
                leer: async n => docs.has(n) ? plano(docs.get(n)) : null,
                escuchar: (n, cb) =>{ oyentes.set(n, cb); return () => oyentes.delete(n); },
                escribir: async (n, d) =>{ docs.set(n, plano(d)); },
                transaccion: async fn =>{
                    const escritos = [];
                    const r = await fn({
                        leer: async n => docs.has(n) ? plano(docs.get(n)) : null,
                        escribir: (n, d) => escritos.push([n, plano(d)]),
                        borrar: n => escritos.push([n, null])
                    });
                    escritos.forEach(([n, d]) => d === null ? docs.delete(n) : docs.set(n, d));
                    return r;
                }
            };
        },
        // Entrega al programa una "foto" de la tabla (la actual o una guardada).
        entregar(n, foto){
            const cb = oyentes.get(n);
            if(cb) cb(foto === undefined ? (docs.has(n) ? plano(docs.get(n)) : null) : foto, { deCache: false });
        }
    };
}

async function crearPC(nube){
    const ctx = crearContexto();
    cargar(ctx, "src/js/datos/sync-nucleo.js");
    cargar(ctx, "src/js/datos/sync-gestor.js");
    const m = new Map();
    const pc = { datos: {}, cambios: 0 };
    pc.gestor = ctx.crearGestorSync({
        adaptador: nube.adaptador(),
        almacen: {
            guardarJson: async (n, j) =>{ m.set(n, j); }, guardar: async (n, v) =>{ m.set(n, JSON.stringify(v)); },
            leer: async n => m.has(n) ? JSON.parse(m.get(n)) : null, borrar: async n =>{ m.delete(n); }
        },
        tablas: [{ nombre: "ventas", clave: "id", alInicio: true, vacio: () => [], obtener: () => pc.datos.ventas, asignar: v =>{ pc.datos.ventas = v; } }],
        alCambiar: () =>{ pc.cambios++; pc.historial.push(pc.datos.ventas.map(v => v.id).join(",")); }
    });
    pc.historial = [];
    const inicio = pc.gestor.iniciar({ tiempoMaximo: 300 });
    await dormir(10);
    nube.entregar("ventas");
    await inicio;
    return pc;
}

test("una foto vieja que llega tarde no hace desaparecer la venta recién subida", async () =>{
    const nube = crearNube();
    nube.docs.set("ventas", { datos: [{ id: "V1" }], actualizado: 1, lotes: [] });
    const pc = await crearPC(nube);
    assert.deepEqual(pc.datos.ventas.map(v => v.id), ["V1"]);

    // Otra PC agrega V2: esa foto todavía no nos llegó.
    nube.docs.set("ventas", { datos: [{ id: "V2" }, { id: "V1" }], actualizado: 2, lotes: ["Lotra"] });
    const fotoVieja = plano(nube.docs.get("ventas"));

    // Registramos V3 y la subimos (la transacción ya lee V2).
    pc.datos.ventas.unshift({ id: "V3" });
    pc.gestor.guardar();
    await pc.gestor.sincronizarAhora();
    assert.deepEqual(pc.datos.ventas.map(v => v.id), ["V3", "V2", "V1"]);

    // Recién ahora llega la foto de antes de nuestra subida.
    pc.historial.length = 0;
    nube.entregar("ventas", fotoVieja);
    await dormir(30);
    assert.deepEqual(pc.datos.ventas.map(v => v.id), ["V3", "V2", "V1"], "V3 no debe desaparecer");
    assert.equal(pc.historial.length, 0, "la pantalla no debe parpadear");

    // Y después la foto al día: todo igual.
    nube.entregar("ventas");
    await dormir(30);
    assert.deepEqual(pc.datos.ventas.map(v => v.id), ["V3", "V2", "V1"]);

    // Los cambios posteriores de otras PCs se siguen recibiendo.
    const actual = nube.docs.get("ventas");
    nube.docs.set("ventas", { ...actual, datos: [{ id: "V4" }].concat(actual.datos), lotes: actual.lotes.concat("Lotra2") });
    nube.entregar("ventas");
    await dormir(30);
    assert.deepEqual(pc.datos.ventas.map(v => v.id), ["V4", "V3", "V2", "V1"]);
});

test("si una versión vieja del programa pisa la tabla (sin lista de lotes), se toma igual", async () =>{
    const nube = crearNube();
    nube.docs.set("ventas", { datos: [{ id: "V1" }], actualizado: 1, lotes: [] });
    const pc = await crearPC(nube);
    pc.datos.ventas.unshift({ id: "V2" });
    pc.gestor.guardar();
    await pc.gestor.sincronizarAhora();
    // Versión vieja: guarda su lista entera, sin "lotes".
    nube.docs.set("ventas", { datos: [{ id: "V9" }, { id: "V2" }, { id: "V1" }], actualizado: 3 });
    nube.entregar("ventas");
    await dormir(30);
    assert.deepEqual(pc.datos.ventas.map(v => v.id), ["V9", "V2", "V1"]);
});

test("cambios locales hechos mientras llega una foto no se pierden", async () =>{
    const nube = crearNube();
    nube.docs.set("ventas", { datos: [{ id: "V1", total: 1 }], actualizado: 1, lotes: [] });
    const pc = await crearPC(nube);
    // Cambio local todavía sin guardar + foto nueva de otra PC.
    pc.datos.ventas.unshift({ id: "V2" });
    nube.docs.set("ventas", { datos: [{ id: "V3" }, { id: "V1", total: 5 }], actualizado: 2, lotes: ["Lx"] });
    nube.entregar("ventas");
    await dormir(30);
    assert.deepEqual(plano(pc.datos.ventas), [{ id: "V2" }, { id: "V3" }, { id: "V1", total: 5 }]);
    await pc.gestor.sincronizarAhora();
    assert.deepEqual(plano(nube.docs.get("ventas").datos), [{ id: "V2" }, { id: "V3" }, { id: "V1", total: 5 }]);
});
