/* ==========================================
   GESTOR DE SINCRONIZACIÓN
   ------------------------------------------
   Mantiene las tablas de la app (productos,
   ventas, clientes, etc.) iguales en esta PC
   y en la nube, sin perder nada:

   1. Cada vez que la app guarda, se anota QUÉ
      cambió (un "lote" de cambios) y se guarda
      en la PC. Si no hay internet, los lotes
      quedan en cola aunque se cierre el
      programa.
   2. Los lotes se envían con una transacción:
      se lee lo que hay en la nube, se le
      aplican los cambios y se guarda. Así los
      cambios de otra PC nunca se pisan.
   3. Cuando otra PC cambia algo, llega solo y
      se combina con lo que esta PC todavía no
      pudo subir.

   Uso (lo hace app.js):
       const gestor = crearGestorSync({ ... });
       await gestor.iniciar();
       gestor.guardar();   // después de cada cambio
========================================== */

window.crearGestorSync = function(cfg){

    "use strict";

    const N = window.SyncNucleo;

    const adaptador = cfg.adaptador || null;
    const almacen = cfg.almacen;
    const LIMITE = cfg.limiteBytes || 450000;
    const MAX_LOTES = 40;

    const tablas = new Map();

    let detenido = false;
    let ultimoError = null;
    let contadorLote = 0;

    cfg.tablas.forEach(def =>{

        tablas.set(def.nombre, {
            def,
            localJson: "",
            ref: null,
            refJson: "",
            cola: [],
            remoto: null,
            confirmado: false,
            idxProbado: false,
            cadena: Promise.resolve(),
            temporizador: null,
            errores: 0,
            enviando: false,
            errorEscucha: null,
            cancelarEscucha: null,
            resolverPrimera: null
        });

    });

    /* ==========================================
       UTILIDADES
    ========================================== */

    function esObjeto(v){

        return v !== null && typeof v === "object" && !Array.isArray(v);

    }

    function nuevoIdLote(){

        contadorLote++;

        return "L" + Date.now().toString(36)
            + contadorLote.toString(36)
            + Math.random().toString(36).slice(2, 6);

    }

    function nuevaVersion(){

        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    }

    function espera(ms){

        return new Promise(r => setTimeout(r, ms));

    }

    function conLimite(promesa, ms){

        return new Promise((resolver, rechazar) =>{

            const t = setTimeout(() => rechazar(new Error("tiempo-agotado")), ms);

            promesa.then(
                v =>{ clearTimeout(t); resolver(v); },
                e =>{ clearTimeout(t); rechazar(e); }
            );

        });

    }

    function encolar(t, fn){

        t.cadena = t.cadena.then(fn).catch(e =>{

            console.error("[Sync] Error en '" + t.def.nombre + "':", e);

        });

        return t.cadena;

    }

    function programar(t, ms){

        if(detenido || !adaptador) return;

        clearTimeout(t.temporizador);

        t.temporizador = setTimeout(() => encolar(t, () => sincronizar(t)), ms);

    }

    function persistirCola(t){

        if(t.cola.length) almacen.guardar("cola:" + t.def.nombre, t.cola);
        else almacen.borrar("cola:" + t.def.nombre);

    }

    function notificarEstado(){

        if(cfg.alEstado){

            try{ cfg.alEstado(estado()); }catch(e){ console.error(e); }

        }

    }

    function remotoVacio(){

        return {
            existe: false,
            datos: null,
            lotes: [],
            orden: ["m"],
            verPartes: {},
            partesJson: new Map(),
            asignacion: new Map()
        };

    }

    /* ==========================================
       CARGA LOCAL
    ========================================== */

    async function cargarLocal(){

        for(const t of tablas.values()){

            const def = t.def;

            let valor = await almacen.leer(def.nombre);

            if(def.clave){

                if(!Array.isArray(valor)) valor = [];

                valor = N.normalizarClaves(valor, def.clave, def.prefijoId).lista;

            }else if(!esObjeto(valor)){

                valor = def.vacio();

            }

            def.asignar(valor);

            t.localJson = JSON.stringify(valor);
            t.refJson = t.localJson;
            t.ref = JSON.parse(t.localJson);

            const cola = await almacen.leer("cola:" + def.nombre);

            t.cola = Array.isArray(cola) ? cola : [];

        }

    }

    /* ==========================================
       GUARDAR (lo llama la app tras cada cambio)
    ========================================== */

    function guardar(nombres){

        const lista = (nombres && nombres.length) ? nombres : Array.from(tablas.keys());

        let hubo = false;

        lista.forEach(nombre =>{

            const t = tablas.get(nombre);

            if(!t) return;

            const json = JSON.stringify(t.def.obtener());

            if(json === t.localJson) return;

            t.localJson = json;

            almacen.guardarJson(nombre, json);

            hubo = true;

            if(adaptador){

                congelar(t);

                programar(t, 250);

            }

        });

        if(hubo) notificarEstado();

        return hubo;

    }

    /* Anota en la cola la diferencia entre lo último combinado
       con la nube ("ref") y lo que hay ahora en la PC. */
    function congelar(t){

        if(t.localJson === t.refJson) return false;

        const local = JSON.parse(t.localJson);

        const ops = N.diffValor(t.ref, local, t.def.clave || "id");

        t.ref = local;
        t.refJson = t.localJson;

        if(!ops) return false;

        t.cola.push({ id: nuevoIdLote(), ops });

        persistirCola(t);

        return true;

    }

    /* ==========================================
       LEER LA TABLA REMOTA (principal + partes)
    ========================================== */

    async function metaPartes(t, data, leer){

        if(Array.isArray(data.orden) && data.orden.length){

            t.idxProbado = true;

            return { orden: data.orden, verPartes: data.verPartes || {} };

        }

        // El documento principal no trae el índice de partes. Puede
        // ser una tabla chica (lo normal) o que una versión vieja del
        // programa lo haya pisado: se consulta el índice de respaldo.
        const sabiaPartes = !!(t.remoto && t.remoto.orden.length > 1);

        if(sabiaPartes || !t.idxProbado){

            t.idxProbado = true;

            const idx = await leer(t.def.nombre + "__idx");

            if(idx && Array.isArray(idx.orden) && idx.orden.length){

                return { orden: idx.orden, verPartes: idx.verPartes || {} };

            }

        }

        return { orden: ["m"], verPartes: {} };

    }

    async function leerRemoto(t, data, leer){

        if(data === null || data === undefined) return remotoVacio();

        const lotes = Array.isArray(data.lotes) ? data.lotes : [];

        if(!t.def.clave){

            return {
                existe: true,
                datos: data.datos,
                lotes,
                orden: ["m"],
                verPartes: {},
                partesJson: new Map(),
                asignacion: new Map()
            };

        }

        const meta = await metaPartes(t, data, leer);

        const partes = new Map();
        const partesJson = new Map();

        partes.set("m", Array.isArray(data.datos) ? data.datos : []);

        for(const id of meta.orden){

            if(id === "m") continue;

            const enCache = t.remoto ? t.remoto.partesJson.get(id) : undefined;

            let json;

            if(enCache !== undefined
                && meta.verPartes[id] !== undefined
                && t.remoto.verPartes[id] === meta.verPartes[id]){

                // La parte no cambió desde la última vez: no se vuelve a bajar.
                json = enCache;

            }else{

                const d = await leer(t.def.nombre + "__" + id);

                json = JSON.stringify(d && Array.isArray(d.datos) ? d.datos : []);

            }

            partesJson.set(id, json);
            partes.set(id, JSON.parse(json));

        }

        const e = N.ensamblar(meta.orden, partes, t.def.clave);

        return {
            existe: true,
            datos: e.datos,
            lotes,
            orden: meta.orden,
            verPartes: meta.verPartes,
            partesJson,
            asignacion: e.asignacion
        };

    }

    /* ==========================================
       LLEGÓ UN CAMBIO DESDE LA NUBE
    ========================================== */

    function alSnapshot(t, data, meta){

        // Solo se toman datos confirmados por el servidor: un dato "de
        // caché" podría decir que la tabla no existe solo porque no hay
        // conexión.
        if(meta && meta.deCache) return;

        encolar(t, async () =>{

            if(detenido) return;

            const rem = await leerRemoto(t, data, n => adaptador.leer(n));

            t.remoto = rem;
            t.confirmado = true;
            t.errorEscucha = null;

            if(!rem.existe){

                // La tabla todavía no existe en la nube: se sube completa
                // lo que haya en esta PC (primera vez o migración).
                t.cola = [];
                t.ref = t.def.vacio();
                t.refJson = JSON.stringify(t.ref);

            }

            integrar(t, rem.existe ? rem.datos : t.def.vacio(), rem.lotes);

            if(t.resolverPrimera){ t.resolverPrimera(); t.resolverPrimera = null; }

        });

    }

    /* Combina el estado de la nube (S) con los cambios locales que
       todavía no subieron. */
    function integrar(t, S, lotesRemotos){

        const def = t.def;
        const clave = def.clave || "id";
        const hechos = new Set(lotesRemotos || []);
        const largoAntes = t.cola.length;

        // Lotes que la nube ya tiene aplicados: salen de la cola.
        t.cola = t.cola.filter(l => !hechos.has(l.id));

        const jsonActual = JSON.stringify(def.obtener());

        let abierto = null;

        if(jsonActual !== t.refJson){

            abierto = N.diffValor(t.ref, JSON.parse(jsonActual), clave);

        }

        let nuevaRef = S;

        if(def.clave && !Array.isArray(nuevaRef)) nuevaRef = [];

        if(!def.clave && !esObjeto(nuevaRef)) nuevaRef = def.vacio();

        t.cola.forEach(l =>{ nuevaRef = N.aplicarValor(nuevaRef, l.ops); });

        let nuevoLocal = nuevaRef;

        if(abierto){

            nuevoLocal = N.aplicarValor(nuevaRef, abierto);

            t.cola.push({ id: nuevoIdLote(), ops: abierto });

        }

        const nuevoJson = JSON.stringify(nuevoLocal);

        t.refJson = nuevoJson;
        t.ref = JSON.parse(nuevoJson);

        if(abierto || t.cola.length !== largoAntes) persistirCola(t);

        if(nuevoJson !== jsonActual){

            t.localJson = nuevoJson;

            def.asignar(JSON.parse(nuevoJson));

            almacen.guardarJson(def.nombre, nuevoJson);

            if(cfg.alCambiar){

                try{ cfg.alCambiar(def.nombre); }catch(e){ console.error(e); }

            }

        }else if(t.localJson !== nuevoJson){

            t.localJson = nuevoJson;

            almacen.guardarJson(def.nombre, nuevoJson);

        }

        if(t.cola.length) programar(t, 50);

        notificarEstado();

    }

    /* ==========================================
       ENVIAR LOS CAMBIOS PENDIENTES
    ========================================== */

    async function sincronizar(t){

        if(detenido || !adaptador) return;

        const jsonActual = JSON.stringify(t.def.obtener());

        if(jsonActual !== t.localJson){

            t.localJson = jsonActual;

            almacen.guardarJson(t.def.nombre, jsonActual);

        }

        congelar(t);

        if(!t.cola.length) return;

        // Hasta no conocer el estado real de la nube no se envía nada:
        // cuando llegue, se dispara solo.
        if(!t.confirmado) return;

        const enviados = t.cola.slice();

        t.enviando = true;

        notificarEstado();

        try{

            const R = await conLimite(
                adaptador.transaccion(tx => transaccionTabla(tx, t, enviados)),
                60000
            );

            t.remoto = R.remoto;
            t.errores = 0;
            t.enviando = false;

            ultimoError = null;

            integrar(t, R.datos, R.remoto.lotes);

        }catch(e){

            t.enviando = false;
            t.errores++;

            ultimoError = e;

            console.warn("[Sync] No se pudo subir '" + t.def.nombre + "' (se reintenta):", e && e.message ? e.message : e);

            programar(t, Math.min(60000, 3000 * Math.pow(2, Math.min(t.errores - 1, 5))));

            notificarEstado();

        }

    }

    async function transaccionTabla(tx, t, enviados){

        const def = t.def;
        const nombre = def.nombre;
        const esLista = !!def.clave;

        const data = await tx.leer(nombre);

        const rem = await leerRemoto(t, data, n => tx.leer(n));

        let datos = rem.existe ? rem.datos : def.vacio();

        if(esLista && !Array.isArray(datos)) datos = [];

        if(!esLista && !esObjeto(datos)) datos = def.vacio();

        const lotes = rem.lotes.slice();

        enviados.forEach(l =>{

            if(lotes.indexOf(l.id) >= 0) return; // ya aplicado (reintento)

            datos = N.aplicarValor(datos, l.ops);

            lotes.push(l.id);

        });

        const lotesFinal = lotes.slice(-MAX_LOTES);
        const ahora = Date.now();

        if(!esLista){

            tx.escribir(nombre, { datos, actualizado: ahora, lotes: lotesFinal });

            return {
                datos,
                remoto: {
                    existe: true,
                    datos: null,
                    lotes: lotesFinal,
                    orden: ["m"],
                    verPartes: {},
                    partesJson: new Map(),
                    asignacion: new Map()
                }
            };

        }

        const rep = N.repartir(datos, def.clave, rem.asignacion, rem.orden, {
            limite: LIMITE,
            alInicio: !!def.alInicio
        });

        const verPartes = {};
        const partesJson = new Map();

        rep.orden.forEach(id =>{

            if(id === "m") return;

            const lista = rep.partes.get(id);
            const json = JSON.stringify(lista);

            partesJson.set(id, json);

            if(json !== rem.partesJson.get(id) || rem.verPartes[id] === undefined){

                verPartes[id] = nuevaVersion();

                tx.escribir(nombre + "__" + id, { datos: lista, actualizado: ahora, ver: verPartes[id] });

            }else{

                verPartes[id] = rem.verPartes[id];

            }

        });

        rem.orden.forEach(id =>{

            if(id !== "m" && rep.orden.indexOf(id) < 0) tx.borrar(nombre + "__" + id);

        });

        const principal = { datos: rep.partes.get("m"), actualizado: ahora, lotes: lotesFinal };

        if(rep.orden.length > 1){

            principal.orden = rep.orden;
            principal.verPartes = verPartes;

            tx.escribir(nombre + "__idx", { orden: rep.orden, verPartes, actualizado: ahora });

        }else if(rem.orden.length > 1){

            tx.borrar(nombre + "__idx");

        }

        tx.escribir(nombre, principal);

        const e = N.ensamblar(rep.orden, rep.partes, def.clave);

        return {
            datos: e.datos,
            remoto: {
                existe: true,
                datos: null,
                lotes: lotesFinal,
                orden: rep.orden,
                verPartes,
                partesJson,
                asignacion: e.asignacion
            }
        };

    }

    /* ==========================================
       ESCUCHA EN VIVO
    ========================================== */

    function escuchar(t){

        if(detenido || !adaptador) return;

        t.cancelarEscucha = adaptador.escuchar(

            t.def.nombre,

            (data, meta) => alSnapshot(t, data, meta),

            (error) =>{

                console.error("[Sync] Error escuchando '" + t.def.nombre + "':", error);

                t.errorEscucha = error;

                ultimoError = error;

                if(t.resolverPrimera){ t.resolverPrimera(); t.resolverPrimera = null; }

                notificarEstado();

                // La escucha se corta con un error: se vuelve a intentar.
                setTimeout(() =>{ if(!detenido) escuchar(t); }, 60000);

            }

        );

    }

    /* ==========================================
       API
    ========================================== */

    async function iniciar(opciones){

        await cargarLocal();

        if(!adaptador){ notificarEstado(); return; }

        const esperas = [];

        tablas.forEach(t =>{

            esperas.push(new Promise(r =>{ t.resolverPrimera = r; }));

            escuchar(t);

        });

        await Promise.race([
            Promise.all(esperas),
            espera((opciones && opciones.tiempoMaximo) || 8000)
        ]);

        notificarEstado();

    }

    function sincronizarAhora(){

        const promesas = [];

        tablas.forEach(t =>{

            clearTimeout(t.temporizador);

            promesas.push(encolar(t, () => sincronizar(t)));

        });

        return Promise.all(promesas);

    }

    function estado(){

        let pendientes = 0;
        let enviando = false;
        let confirmadas = 0;
        let sinPermiso = false;

        tablas.forEach(t =>{

            pendientes += t.cola.length;

            if(t.enviando) enviando = true;

            if(t.confirmado) confirmadas++;

            if(t.errorEscucha && t.errorEscucha.code === "permission-denied") sinPermiso = true;

        });

        return {
            nube: !!adaptador,
            pendientes,
            enviando,
            confirmadas,
            total: tablas.size,
            conectado: !!adaptador && confirmadas === tablas.size && !ultimoError,
            sinPermiso,
            error: ultimoError ? (ultimoError.code || ultimoError.message || String(ultimoError)) : null
        };

    }

    function info(nombre){

        const t = tablas.get(nombre);

        if(!t) return null;

        return {
            confirmado: t.confirmado,
            existeRemoto: !!(t.remoto && t.remoto.existe),
            pendientes: t.cola.length,
            error: t.errorEscucha ? (t.errorEscucha.code || String(t.errorEscucha)) : null
        };

    }

    function detener(){

        detenido = true;

        tablas.forEach(t =>{

            clearTimeout(t.temporizador);

            if(t.cancelarEscucha){

                try{ t.cancelarEscucha(); }catch(e){ /* nada */ }

            }

        });

    }

    return {
        iniciar,
        guardar,
        sincronizarAhora,
        estado,
        info,
        detener
    };

};
