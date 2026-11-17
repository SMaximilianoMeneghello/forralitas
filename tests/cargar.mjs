/* Carga los scripts clásicos de la app (los que definen funciones
   globales en window) dentro de un contexto aislado de Node, para
   poder probarlos sin navegador. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export function crearContexto(extra = {}){

    const ctx = {
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        TextEncoder,
        Promise,
        Date,
        JSON,
        Math,
        ...extra
    };

    ctx.window = ctx;
    ctx.globalThis = ctx;

    vm.createContext(ctx);

    return ctx;

}

export function cargar(ctx, relativo){

    const codigo = fs.readFileSync(path.join(raiz, relativo), "utf8");

    vm.runInContext(codigo, ctx, { filename: relativo });

}
