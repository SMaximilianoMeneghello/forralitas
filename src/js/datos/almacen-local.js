/* ==========================================
   ALMACÉN LOCAL (copia de los datos en esta PC)
   ------------------------------------------
   Guarda cada tabla en dos lugares:

   - localStorage: se escribe al instante.
   - IndexedDB: no tiene el límite de ~5 MB de
     localStorage, así que el historial puede
     crecer durante años sin que la app deje
     de guardar.

   Al leer se usa la copia más nueva de las dos.
   El "prefijo" separa los datos de cada negocio
   cuando se usa una cuenta (así una PC nunca
   mezcla datos de dos negocios distintos).
========================================== */

window.AlmacenLocal = (function(){

    "use strict";

    let prefijo = "";
    let promesaBD = null;

    function abrirBD(){

        if(promesaBD) return promesaBD;

        promesaBD = new Promise((resolver) =>{

            if(typeof indexedDB === "undefined"){ resolver(null); return; }

            try{

                const pedido = indexedDB.open("forralitasLocal", 1);

                pedido.onupgradeneeded = () =>{

                    pedido.result.createObjectStore("kv");

                };

                pedido.onsuccess = () => resolver(pedido.result);

                pedido.onerror = () => resolver(null);

                pedido.onblocked = () => resolver(null);

            }catch(e){

                resolver(null);

            }

        });

        return promesaBD;

    }

    async function idbLeer(clave){

        const bd = await abrirBD();

        if(!bd) return null;

        return new Promise((resolver) =>{

            try{

                const pedido = bd.transaction("kv", "readonly").objectStore("kv").get(clave);

                pedido.onsuccess = () => resolver(pedido.result || null);

                pedido.onerror = () => resolver(null);

            }catch(e){

                resolver(null);

            }

        });

    }

    async function idbGuardar(clave, valor){

        const bd = await abrirBD();

        if(!bd) return false;

        return new Promise((resolver) =>{

            try{

                const tx = bd.transaction("kv", "readwrite");

                if(valor === null) tx.objectStore("kv").delete(clave);
                else tx.objectStore("kv").put(valor, clave);

                tx.oncomplete = () => resolver(true);

                tx.onerror = () => resolver(false);

                tx.onabort = () => resolver(false);

            }catch(e){

                resolver(false);

            }

        });

    }

    function usarPrefijo(p){

        prefijo = p || "";

    }

    function prefijoActual(){

        return prefijo;

    }

    /* Guarda el texto JSON de una tabla. No espera a IndexedDB:
       la copia en localStorage ya queda escrita al volver. */
    function guardarJson(nombre, json, pref){

        const clave = (pref === undefined ? prefijo : pref) + nombre;
        const ts = Date.now();

        try{

            localStorage.setItem(clave, json);
            localStorage.setItem("ts:" + clave, String(ts));

        }catch(e){

            // localStorage lleno: esta tabla queda solo en IndexedDB.
            try{

                localStorage.removeItem(clave);
                localStorage.removeItem("ts:" + clave);

            }catch(e2){ /* nada */ }

        }

        return idbGuardar(clave, { json, ts });

    }

    function guardar(nombre, valor, pref){

        return guardarJson(nombre, JSON.stringify(valor), pref);

    }

    async function leerJson(nombre, pref){

        const clave = (pref === undefined ? prefijo : pref) + nombre;

        let jsonLs = null;
        let tsLs = 0;

        try{

            jsonLs = localStorage.getItem(clave);

            // Datos de versiones anteriores no tienen marca de tiempo:
            // se toman como "viejos pero válidos".
            tsLs = jsonLs === null ? 0 : (Number(localStorage.getItem("ts:" + clave)) || 1);

        }catch(e){ /* nada */ }

        const idb = await idbLeer(clave);

        const candidatos = [];

        if(idb && typeof idb.json === "string") candidatos.push({ json: idb.json, ts: idb.ts || 1 });

        if(jsonLs !== null) candidatos.push({ json: jsonLs, ts: tsLs });

        candidatos.sort((a, b) => b.ts - a.ts);

        for(const c of candidatos){

            try{

                JSON.parse(c.json);

                return c.json;

            }catch(e){ /* copia dañada: se prueba la otra */ }

        }

        return null;

    }

    async function leer(nombre, pref){

        const json = await leerJson(nombre, pref);

        return json === null ? null : JSON.parse(json);

    }

    async function borrar(nombre, pref){

        const clave = (pref === undefined ? prefijo : pref) + nombre;

        try{

            localStorage.removeItem(clave);
            localStorage.removeItem("ts:" + clave);

        }catch(e){ /* nada */ }

        await idbGuardar(clave, null);

    }

    return {
        usarPrefijo,
        prefijoActual,
        guardar,
        guardarJson,
        leer,
        leerJson,
        borrar
    };

})();
