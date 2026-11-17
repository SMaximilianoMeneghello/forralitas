/* ==========================================
   NÚCLEO DE SINCRONIZACIÓN (lógica pura)
   ------------------------------------------
   Compara y mezcla datos registro por registro
   para que dos computadoras puedan trabajar al
   mismo tiempo sin pisarse los cambios.

   - diffValor(base, local): calcula QUÉ cambió
     (registros agregados, modificados, borrados
     y, dentro de cada registro, qué campos).
   - aplicarValor(remoto, cambios): aplica esos
     cambios sobre la versión que hay en la nube.
   - repartir(...): divide una tabla grande en
     partes para no superar el límite de tamaño
     por documento de Firestore (1 MB).

   No toca la pantalla ni la red: por eso se
   puede probar de forma automática.
========================================== */

(function(raiz){

    "use strict";

    // En estos campos numéricos se suma/resta la diferencia en vez de
    // pisar el valor: si dos cajas venden el mismo producto a la vez,
    // el stock descuenta las dos ventas.
    var CAMPOS_DELTA = { stock: true, saldo: true };

    function tiene(obj, k){
        return Object.prototype.hasOwnProperty.call(obj, k);
    }

    function esObjeto(v){
        return v !== null && typeof v === "object" && !Array.isArray(v);
    }

    function clonar(v){
        return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
    }

    function igual(a, b){
        return JSON.stringify(a) === JSON.stringify(b);
    }

    function redondear(n){
        return Math.round(n * 1e6) / 1e6;
    }

    function claveDe(reg, campo){
        if(!esObjeto(reg)) return null;
        var v = reg[campo];
        return (v === undefined || v === null) ? null : String(v);
    }

    /* Una lista "con clave" es un arreglo de objetos donde todos
       tienen un identificador y no hay identificadores repetidos. */
    function esListaConClave(v, campo){

        if(!Array.isArray(v)) return false;

        var vistos = new Set();

        for(var i = 0; i < v.length; i++){

            var k = claveDe(v[i], campo);

            if(k === null || vistos.has(k)) return false;

            vistos.add(k);

        }

        return true;

    }

    /* ==========================================
       DIFERENCIAS
    ========================================== */

    function diffValor(base, local, campo, nombre){

        if(base === undefined) return { t: "set", v: clonar(local) };

        if(Array.isArray(base) && Array.isArray(local)){

            var c = campo || "id";

            if(esListaConClave(base, c) && esListaConClave(local, c)){

                var ops = diffLista(base, local, c);

                return ops ? { t: "lista", c: c, ops: ops } : null;

            }

            return igual(base, local) ? null : { t: "set", v: clonar(local) };

        }

        if(esObjeto(base) && esObjeto(local)){

            var o = diffObjeto(base, local);

            return o ? { t: "obj", o: o } : null;

        }

        if(typeof base === "number" && typeof local === "number"
            && nombre && CAMPOS_DELTA[nombre]){

            return base === local ? null : { t: "delta", d: redondear(local - base), v: local };

        }

        return igual(base, local) ? null : { t: "set", v: clonar(local) };

    }

    function diffObjeto(base, local){

        var set = {};
        var del = [];
        var hay = false;
        var k;

        for(k in local){

            if(!tiene(local, k) || local[k] === undefined) continue;

            var op = diffValor(tiene(base, k) ? base[k] : undefined, local[k], "id", k);

            if(op){ set[k] = op; hay = true; }

        }

        for(k in base){

            if(tiene(base, k) && (!tiene(local, k) || local[k] === undefined)){

                del.push(k);
                hay = true;

            }

        }

        return hay ? { set: set, del: del } : null;

    }

    function diffLista(base, local, c){

        var mapaBase = new Map();
        var i, k;

        for(i = 0; i < base.length; i++) mapaBase.set(claveDe(base[i], c), base[i]);

        var add = [];
        var mod = [];
        var del = [];
        var enLocal = new Set();
        var vistoExistente = false;

        for(i = 0; i < local.length; i++){

            k = claveDe(local[i], c);

            enLocal.add(k);

            if(!mapaBase.has(k)){

                // "ini" = el registro nuevo quedó antes que todos los
                // que ya existían (se agregó al principio de la lista).
                add.push({ r: clonar(local[i]), ini: !vistoExistente });

            }else{

                vistoExistente = true;

                var o = diffObjeto(mapaBase.get(k), local[i]);

                if(o) mod.push({ k: k, o: o });

            }

        }

        for(i = 0; i < base.length; i++){

            k = claveDe(base[i], c);

            if(!enLocal.has(k)) del.push(k);

        }

        return (add.length || mod.length || del.length)
            ? { add: add, mod: mod, del: del }
            : null;

    }

    /* ==========================================
       APLICAR CAMBIOS
    ========================================== */

    function aplicarValor(remoto, op){

        if(!op) return remoto;

        if(op.t === "set") return clonar(op.v);

        if(op.t === "delta"){

            return typeof remoto === "number" ? redondear(remoto + op.d) : op.v;

        }

        if(op.t === "obj") return aplicarObjeto(esObjeto(remoto) ? remoto : {}, op.o);

        if(op.t === "lista") return aplicarLista(Array.isArray(remoto) ? remoto : [], op.ops, op.c || "id");

        return remoto;

    }

    function aplicarObjeto(remoto, o){

        var res = {};
        var k;

        for(k in remoto){ if(tiene(remoto, k)) res[k] = remoto[k]; }

        for(k in o.set){

            if(tiene(o.set, k)) res[k] = aplicarValor(tiene(remoto, k) ? remoto[k] : undefined, o.set[k]);

        }

        (o.del || []).forEach(function(campo){ delete res[campo]; });

        return res;

    }

    function aplicarLista(remoto, ops, c){

        var borrar = new Set(ops.del || []);
        var mods = new Map();
        var presentes = new Set();
        var reemplazos = new Map();

        (ops.mod || []).forEach(function(m){ mods.set(m.k, m.o); });

        remoto.forEach(function(r){

            var k = claveDe(r, c);

            if(k !== null) presentes.add(k);

        });

        (ops.add || []).forEach(function(a){

            var k = claveDe(a.r, c);

            if(presentes.has(k)) reemplazos.set(k, a.r);

        });

        var res = [];

        remoto.forEach(function(r){

            var k = claveDe(r, c);

            if(k !== null){

                if(borrar.has(k)) return;

                if(reemplazos.has(k)){ res.push(clonar(reemplazos.get(k))); return; }

                if(mods.has(k)){ res.push(aplicarObjeto(r, mods.get(k))); return; }

            }

            res.push(r);

        });

        var alInicio = [];
        var alFinal = [];

        (ops.add || []).forEach(function(a){

            if(presentes.has(claveDe(a.r, c))) return;

            (a.ini ? alInicio : alFinal).push(clonar(a.r));

        });

        return alInicio.concat(res, alFinal);

    }

    /* ==========================================
       CLAVES
       Garantiza que todos los registros de una
       tabla tengan identificador único.
    ========================================== */

    function normalizarClaves(lista, campo, prefijo){

        if(!Array.isArray(lista)) return { lista: lista, cambios: false };

        var vistos = new Set();
        var cambios = false;
        var n = 0;

        var res = lista.filter(esObjeto).map(function(r){

            var k = claveDe(r, campo);

            if(k === null || vistos.has(k)){

                var nuevo;

                do{

                    n++;
                    nuevo = (prefijo || "X") + "L" + Date.now().toString(36) + n;

                }while(vistos.has(nuevo));

                var copia = {};

                for(var c in r){ if(tiene(r, c)) copia[c] = r[c]; }

                copia[campo] = nuevo;

                r = copia;
                k = nuevo;
                cambios = true;

            }

            vistos.add(k);

            return r;

        });

        if(res.length !== lista.length) cambios = true;

        return { lista: res, cambios: cambios };

    }

    /* ==========================================
       PARTES
       Firestore no acepta documentos de más de
       1 MB. Cuando una tabla crece (por ejemplo
       el historial de ventas), se reparte en un
       documento principal ("m") con lo más
       nuevo y partes ("p1", "p2"...) con lo más
       viejo, que casi nunca se vuelven a tocar.
    ========================================== */

    function bytes(str){

        if(typeof TextEncoder !== "undefined") return new TextEncoder().encode(str).length;

        return unescape(encodeURIComponent(str)).length;

    }

    function tamanoRegistro(r){

        return bytes(JSON.stringify(r)) + 1;

    }

    function nuevoIdParte(orden){

        var max = 0;

        orden.forEach(function(id){

            var n = Number(String(id).slice(1));

            if(id !== "m" && n > max) max = n;

        });

        return "p" + (max + 1);

    }

    function repartir(datos, campo, asignacion, ordenPrevio, opciones){

        var limite = (opciones && opciones.limite) || 450000;
        var alInicio = !!(opciones && opciones.alInicio);

        var orden = (ordenPrevio && ordenPrevio.length) ? ordenPrevio.slice() : ["m"];

        if(orden.indexOf("m") < 0) orden.push("m");

        var partes = new Map();

        orden.forEach(function(id){ partes.set(id, []); });

        datos.forEach(function(r){

            var k = claveDe(r, campo);
            var id = (k !== null && asignacion && asignacion.get(k)) || "m";

            if(!partes.has(id)) id = "m";

            partes.get(id).push(r);

        });

        // Partes viejas que quedaron vacías: se eliminan.
        orden = orden.filter(function(id){

            if(id === "m" || partes.get(id).length > 0) return true;

            partes.delete(id);

            return false;

        });

        function tamano(lista){

            var t = 2;

            for(var i = 0; i < lista.length; i++) t += tamanoRegistro(lista[i]);

            return t;

        }

        // El principal se achica pasando sus registros más viejos a
        // una parte nueva, ubicada pegada a él para mantener el orden.
        var principal = partes.get("m");
        var tam = tamano(principal);

        while(tam > limite && principal.length > 1){

            var objetivo = limite * 0.55;
            var aMover = Math.min(tam - objetivo, limite * 0.9);
            var movidos = [];
            var acumulado = 0;

            while(principal.length > 1 && acumulado < aMover){

                var r = alInicio ? principal.pop() : principal.shift();

                acumulado += tamanoRegistro(r);

                if(alInicio) movidos.unshift(r); else movidos.push(r);

            }

            var id = nuevoIdParte(orden);
            var pos = orden.indexOf("m");

            partes.set(id, movidos);

            if(alInicio) orden.splice(pos + 1, 0, id); else orden.splice(pos, 0, id);

            tam -= acumulado;

        }

        // Una parte vieja que creció demasiado (por ediciones) se divide.
        var hayGrande = true;

        while(hayGrande){

            hayGrande = false;

            for(var i = 0; i < orden.length; i++){

                var idParte = orden[i];

                if(idParte === "m") continue;

                var lista = partes.get(idParte);

                if(lista.length > 1 && tamano(lista) > limite * 1.5){

                    var mitad = Math.ceil(lista.length / 2);
                    var nuevo = nuevoIdParte(orden);

                    partes.set(nuevo, lista.slice(mitad));
                    partes.set(idParte, lista.slice(0, mitad));

                    orden.splice(i + 1, 0, nuevo);

                    hayGrande = true;

                    break;

                }

            }

        }

        return { partes: partes, orden: orden };

    }

    /* Une el principal y las partes en una sola lista, sin
       repetidos (si un registro está dos veces, vale el principal). */
    function ensamblar(orden, partes, campo){

        var vistos = new Set();
        var asignacion = new Map();
        var principal = partes.get("m") || [];

        principal.forEach(function(r){

            var k = claveDe(r, campo);

            if(k !== null){ vistos.add(k); asignacion.set(k, "m"); }

        });

        var datos = [];

        orden.forEach(function(id){

            if(id === "m"){

                principal.forEach(function(r){ datos.push(r); });

                return;

            }

            (partes.get(id) || []).forEach(function(r){

                var k = claveDe(r, campo);

                if(k !== null){

                    if(vistos.has(k)) return;

                    vistos.add(k);
                    asignacion.set(k, id);

                }

                datos.push(r);

            });

        });

        return { datos: datos, asignacion: asignacion };

    }

    var api = {
        diffValor: diffValor,
        aplicarValor: aplicarValor,
        normalizarClaves: normalizarClaves,
        repartir: repartir,
        ensamblar: ensamblar,
        clonar: clonar,
        igual: igual,
        bytes: bytes
    };

    raiz.SyncNucleo = api;

})(typeof window !== "undefined" ? window : globalThis);
