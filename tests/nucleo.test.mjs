import test from "node:test";
import assert from "node:assert/strict";
import { crearContexto, cargar } from "./cargar.mjs";

const ctx = crearContexto();
cargar(ctx, "src/js/datos/sync-nucleo.js");
const N = ctx.SyncNucleo;

// Los objetos creados dentro del contexto aislado tienen otro
// prototipo: se normalizan para poder compararlos.
const plano = v => JSON.parse(JSON.stringify(v));

/* Simula lo que hace el gestor: los cambios locales (base → local)
   se aplican sobre lo que hay en la nube. */
function mezclar(base, local, remoto, campo = "id"){
    const ops = N.diffValor(base, local, campo);
    return plano(N.aplicarValor(remoto, ops));
}

test("sin cambios no genera operaciones", () => {
    const a = [{ id: "1", n: 1 }];
    assert.equal(N.diffValor(a, plano(a), "id"), null);
});

test("dos cajas agregan ventas distintas: quedan las dos", () => {
    const base = [{ id: "V1", total: 10 }];
    const local = [{ id: "V2", total: 20 }, { id: "V1", total: 10 }];
    const remoto = [{ id: "V3", total: 30 }, { id: "V1", total: 10 }];
    const r = mezclar(base, local, remoto);
    assert.deepEqual(r.map(x => x.id), ["V2", "V3", "V1"]);
});

test("registro agregado al final se agrega al final", () => {
    const base = [{ id: "P1" }];
    const local = [{ id: "P1" }, { id: "P2" }];
    const remoto = [{ id: "P1" }, { id: "P3" }];
    assert.deepEqual(mezclar(base, local, remoto).map(x => x.id), ["P1", "P3", "P2"]);
});

test("stock: dos ventas simultáneas descuentan las dos", () => {
    const base = [{ id: "P1", nombre: "Maíz", stock: 10 }];
    const local = [{ id: "P1", nombre: "Maíz", stock: 8 }];   // esta caja vendió 2
    const remoto = [{ id: "P1", nombre: "Maíz", stock: 7 }];  // la otra vendió 3
    assert.equal(mezclar(base, local, remoto)[0].stock, 5);
});

test("saldo de cliente: suma de fiados simultáneos", () => {
    const base = [{ id: "C1", saldo: 100 }];
    const local = [{ id: "C1", saldo: 150 }];
    const remoto = [{ id: "C1", saldo: 130 }];
    assert.equal(mezclar(base, local, remoto)[0].saldo, 180);
});

test("campos distintos del mismo registro se combinan", () => {
    const base = [{ id: "P1", nombre: "Maiz", precioBolsa: 100, stock: 5 }];
    const local = [{ id: "P1", nombre: "Maíz", precioBolsa: 100, stock: 5 }];
    const remoto = [{ id: "P1", nombre: "Maiz", precioBolsa: 120, stock: 5 }];
    assert.deepEqual(mezclar(base, local, remoto)[0], { id: "P1", nombre: "Maíz", precioBolsa: 120, stock: 5 });
});

test("borrar local no revive el registro y respeta agregados remotos", () => {
    const base = [{ id: "G1" }, { id: "G2" }];
    const local = [{ id: "G2" }];
    const remoto = [{ id: "G1" }, { id: "G2" }, { id: "G3" }];
    assert.deepEqual(mezclar(base, local, remoto).map(x => x.id), ["G2", "G3"]);
});

test("si otro lo borró, una edición local no lo revive", () => {
    const base = [{ id: "G1", monto: 1 }];
    const local = [{ id: "G1", monto: 2 }];
    assert.deepEqual(mezclar(base, local, []), []);
});

test("listas internas con id (pagos) se mezclan por id", () => {
    const base = [{ id: "C1", pagos: [{ id: "a", monto: 1 }] }];
    const local = [{ id: "C1", pagos: [{ id: "a", monto: 1 }, { id: "b", monto: 2 }] }];
    const remoto = [{ id: "C1", pagos: [{ id: "a", monto: 1 }, { id: "c", monto: 3 }] }];
    assert.deepEqual(mezclar(base, local, remoto)[0].pagos.map(p => p.id), ["a", "c", "b"]);
});

test("listas internas sin id se reemplazan completas", () => {
    const base = [{ id: "V1", productos: [{ id: "P1", modo: "bolsa" }] }];
    const local = [{ id: "V1", productos: [{ id: "P1", modo: "bolsa" }, { id: "P1", modo: "kg" }] }];
    const r = mezclar(base, local, plano(base));
    assert.equal(r[0].productos.length, 2);
});

test("campo eliminado y campo nuevo", () => {
    const base = { a: 1, b: 2 };
    const local = { a: 1, c: 3 };
    assert.deepEqual(mezclar(base, local, { a: 9, b: 2, d: 4 }), { a: 9, c: 3, d: 4 });
});

test("objeto de configuración anidado", () => {
    const base = { tema: { color: "#111", radio: 1 }, ventas: { x: true } };
    const local = { tema: { color: "#222", radio: 1 }, ventas: { x: true } };
    const remoto = { tema: { color: "#111", radio: 5 }, ventas: { x: false } };
    assert.deepEqual(mezclar(base, local, remoto), { tema: { color: "#222", radio: 5 }, ventas: { x: false } });
});

test("clave personalizada (usuarios)", () => {
    const base = [{ usuario: "ana", rol: "empleado" }];
    const local = [{ usuario: "ana", rol: "admin" }, { usuario: "luis", rol: "empleado" }];
    const remoto = [{ usuario: "ana", rol: "empleado" }, { usuario: "eva", rol: "empleado" }];
    const r = mezclar(base, local, remoto, "usuario");
    assert.deepEqual(r.map(u => u.usuario + ":" + u.rol), ["ana:admin", "eva:empleado", "luis:empleado"]);
});

test("agregar el mismo registro dos veces no lo duplica", () => {
    const ops = N.diffValor([], [{ id: "V1", total: 5 }], "id");
    let r = N.aplicarValor([], ops);
    r = N.aplicarValor(r, ops);
    assert.equal(r.length, 1);
});

test("normalizarClaves asigna id a registros sin id o repetidos", () => {
    const { lista, cambios } = N.normalizarClaves([{ id: "a" }, { id: "a" }, { x: 1 }, null], "id", "P");
    assert.equal(cambios, true);
    assert.equal(lista.length, 3);
    assert.equal(new Set(lista.map(r => r.id)).size, 3);
});

test("repartir: lista chica queda en un solo documento", () => {
    const datos = [{ id: "1" }, { id: "2" }];
    const { partes, orden } = N.repartir(datos, "id", new Map(), ["m"], { limite: 1000, alInicio: true });
    assert.deepEqual(orden, ["m"]);
    assert.equal(partes.get("m").length, 2);
});

function ventas(desde, hasta){
    const l = [];
    for(let i = hasta; i >= desde; i--) l.push({ id: "V" + String(i).padStart(5, "0"), texto: "x".repeat(80) });
    return l; // más nueva primero
}

test("repartir: tabla grande se divide y conserva el orden (nuevas primero)", () => {
    const datos = ventas(1, 400);
    const limite = 5000;
    const { partes, orden } = N.repartir(datos, "id", new Map(), ["m"], { limite, alInicio: true });
    assert.ok(orden.length > 3);
    assert.equal(orden[0], "m");
    for(const id of orden) assert.ok(N.bytes(JSON.stringify(partes.get(id))) <= limite * 1.05, "parte " + id + " muy grande");
    const { datos: unido, asignacion } = N.ensamblar(orden, partes, "id");
    assert.deepEqual(plano(unido), datos);
    // Agregar ventas nuevas solo toca el principal.
    const mas = ventas(401, 405).concat(plano(unido));
    const r2 = N.repartir(mas, "id", asignacion, orden, { limite, alInicio: true });
    for(const id of orden){
        if(id === "m") continue;
        assert.deepEqual(plano(r2.partes.get(id)), plano(partes.get(id)), "la parte " + id + " no debería cambiar");
    }
    assert.deepEqual(plano(N.ensamblar(r2.orden, r2.partes, "id").datos), mas);
});

test("repartir: tabla que agrega al final (nuevas últimas)", () => {
    const datos = ventas(1, 300).reverse();
    const limite = 5000;
    const { partes, orden } = N.repartir(datos, "id", new Map(), ["m"], { limite, alInicio: false });
    assert.equal(orden[orden.length - 1], "m");
    assert.deepEqual(plano(N.ensamblar(orden, partes, "id").datos), datos);
});

test("repartir: borrar todos los registros de una parte la elimina", () => {
    const datos = ventas(1, 200);
    const r1 = N.repartir(datos, "id", new Map(), ["m"], { limite: 5000, alInicio: true });
    const e1 = N.ensamblar(r1.orden, r1.partes, "id");
    const ultima = r1.orden[r1.orden.length - 1];
    const quedan = e1.datos.filter(r => e1.asignacion.get(r.id) !== ultima);
    const r2 = N.repartir(quedan, "id", e1.asignacion, r1.orden, { limite: 5000, alInicio: true });
    assert.ok(!r2.orden.includes(ultima));
});

test("ensamblar: si un registro está repetido vale el del principal", () => {
    const partes = new Map([["m", [{ id: "a", v: 2 }]], ["p1", [{ id: "a", v: 1 }, { id: "b", v: 1 }]]]);
    const { datos } = N.ensamblar(["m", "p1"], partes, "id");
    assert.deepEqual(plano(datos), [{ id: "a", v: 2 }, { id: "b", v: 1 }]);
});
