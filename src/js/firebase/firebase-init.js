/* ==========================================
   CONEXIÓN CON FIREBASE (FIRESTORE)
   ------------------------------------------
   Este archivo es un módulo ES (type="module")
   y se carga DESPUÉS de todos los scripts clásicos
   pero ANTES del evento DOMContentLoaded, así que
   cuando arranca app.js (iniciarApp) window.FirebaseDB
   ya está listo para usarse.

   v1.0.20 — VENTAS SIN LÍMITE DE ESPACIO
   ------------------------------------------
   Firestore no acepta documentos de más de
   1 MB. Antes TODAS las ventas iban en un solo
   documento (forralitasDatos/historialVentas):
   al llenarse (unas 2.800 ventas), Firebase
   rechazaba cada venta nueva y la app la borraba
   de la pantalla al segundo.

   Ahora el historial de ventas y el registro de
   eliminaciones se guardan con UN DOCUMENTO POR
   REGISTRO (colecciones forralitasVentas y
   forralitasEliminaciones), sin límite.

   Para que sea rápido y no gaste lecturas:
   - la PC guarda una copia local de la base;
   - al abrir el programa solo se piden a
     Firebase los registros que cambiaron desde
     la última vez (campo _act = fecha de la
     última escritura);
   - lo que se elimina no se borra del todo: se
     marca _borrado = true, así las demás PCs se
     enteran.

   El resto de la app no cambia: sigue usando
   guardarColeccion / leerColeccion /
   escucharColeccion igual que antes.

   La primera vez que se abre esta versión, se
   copian solas las ventas y eliminaciones que ya
   estaban guardadas. El documento viejo queda
   como estaba, de respaldo.
========================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    CACHE_SIZE_UNLIMITED,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    getDocsFromCache,
    onSnapshot,
    query,
    where,
    writeBatch,
    serverTimestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// Configuración del proyecto de Firebase de FORRALITAS.
const firebaseConfig = {
    apiKey: "AIzaSyA3eDUrC8_O3Yo629frSDP4GlNt4-RUfHg",
    authDomain: "forralitas-3394f.firebaseapp.com",
    projectId: "forralitas-3394f",
    storageBucket: "forralitas-3394f.firebasestorage.app",
    messagingSenderId: "1044717245979",
    appId: "1:1044717245979:web:c44ab60b923c00fdc54abe"
};

// Nombre de la colección de Firestore donde vive cada "tabla" de la app.
// Cada tabla (productos, clientes, etc.) se guarda como UN documento
// que contiene el arreglo completo en el campo "datos".
const COLECCION = "forralitasDatos";

// Tablas que crecen sin parar: van con un documento por registro.
const TABLAS_POR_REGISTRO = {
    historialVentas: { coleccion: "forralitasVentas", prefijo: "V" },
    eliminaciones: { coleccion: "forralitasEliminaciones", prefijo: "E" }
};

const app = initializeApp(firebaseConfig);

// Copia local de la base en la PC (sin límite de tamaño): hace que al
// abrir el programa no haya que volver a bajar todas las ventas.
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
    })
});

/* ==========================================
   PANTALLA DE INGRESO
   Si se toca "Ingresar" antes de que el
   programa termine de cargar, el formulario no
   recarga la página (antes se recargaba).
========================================== */

const formLogin = document.getElementById("formLogin");

if(formLogin) formLogin.addEventListener("submit", (e) => e.preventDefault());

/* ==========================================
   UTILIDADES
========================================== */

// Copia limpia del registro (Firestore no acepta valores "undefined").
function limpio(registro){

    return JSON.parse(JSON.stringify(registro));

}

// Texto que representa un registro sin importar el orden de sus campos
// (Firebase los devuelve en otro orden que la app), para saber si cambió.
function claveEstable(valor){

    if(Array.isArray(valor)) return "[" + valor.map(claveEstable).join(",") + "]";

    if(valor && typeof valor === "object"){

        return "{" + Object.keys(valor).sort()
            .filter(k => valor[k] !== undefined)
            .map(k => JSON.stringify(k) + ":" + claveEstable(valor[k]))
            .join(",") + "}";

    }

    return JSON.stringify(valor === undefined ? null : valor);

}

// Más nuevas primero, como las guarda la app (unshift).
function ordenarPorFecha(lista){

    return lista.sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));

}

async function escribirEnLotes(operaciones){

    for(let i = 0; i < operaciones.length; i += 400){

        const lote = writeBatch(db);

        operaciones.slice(i, i + 400).forEach(op =>{

            if(op.mezclar) lote.set(op.ref, op.datos, { merge: true });
            else lote.set(op.ref, op.datos);

        });

        await lote.commit();

    }

}

/* ==========================================
   MIGRACIÓN (una sola vez)
   Copia el arreglo del documento viejo a la
   colección nueva, un documento por registro,
   y deja una marca para no repetirlo.
========================================== */

const migraciones = {};

function asegurarMigracion(nombre){

    if(!migraciones[nombre]) migraciones[nombre] = migrar(nombre);

    return migraciones[nombre];

}

// Mientras se copian las ventas (solo la primera vez, unos segundos), la
// pantalla de ingreso lo avisa y no deja ingresar todavía.
function avisarMigracion(activo){

    const mensaje = document.getElementById("loginError");

    const boton = document.querySelector("#formLogin button[type=submit]");

    if(mensaje){

        mensaje.textContent = activo
            ? "Actualizando el historial de ventas al formato nuevo. Esperá unos segundos, no cierres el programa..."
            : "";

    }

    if(boton) boton.disabled = activo;

}

async function migrar(nombre){

    const conf = TABLAS_POR_REGISTRO[nombre];

    const marca = doc(db, COLECCION, "_porRegistro_" + nombre);

    try{

        if((await getDoc(marca)).exists()) return true;

        avisarMigracion(true);

        const viejo = await getDoc(doc(db, COLECCION, nombre));

        const datos = viejo.exists() && Array.isArray(viejo.data().datos) ? viejo.data().datos : [];

        const vistos = new Set();

        const operaciones = [];

        datos.forEach((registro, i) =>{

            if(!registro || typeof registro !== "object") return;

            let id = String(registro.id || (conf.prefijo + "M" + i));

            while(vistos.has(id)) id = id + "_" + i;

            vistos.add(id);

            operaciones.push({
                ref: doc(db, conf.coleccion, id),
                datos: { ...limpio({ ...registro, id }), _act: serverTimestamp(), _borrado: false }
            });

        });

        await escribirEnLotes(operaciones);

        await setDoc(marca, { fecha: Date.now(), cantidad: operaciones.length });

        avisarMigracion(false);

        console.log("[Firebase] '" + nombre + "' pasado a un documento por registro:", operaciones.length);

        return true;

    }catch(error){

        console.error("[Firebase] No se pudo pasar '" + nombre + "' al formato nuevo:", error);

        avisarMigracion(false);

        // Se vuelve a intentar la próxima vez.
        delete migraciones[nombre];

        return false;

    }

}

/* ==========================================
   TABLAS CON UN DOCUMENTO POR REGISTRO
========================================== */

// Por tabla: los registros conocidos (id -> registro) y su texto, para
// subir solo lo que cambió.
const tablas = {};

function tabla(nombre){

    if(!tablas[nombre]){

        tablas[nombre] = { registros: new Map(), claves: new Map(), desde: null, carga: null };

    }

    return tablas[nombre];

}

// Aplica un documento que llegó de la base. Devuelve su fecha de
// escritura en milisegundos.
function aplicarDocumento(t, d){

    const datos = d.data({ serverTimestamps: "estimate" });

    const act = datos._act && datos._act.toMillis ? datos._act.toMillis() : 0;

    if(datos._borrado === true){

        t.registros.delete(d.id);
        t.claves.delete(d.id);

        return act;

    }

    const registro = { ...datos };

    delete registro._act;
    delete registro._borrado;

    if(!registro.id) registro.id = d.id;

    t.registros.set(d.id, registro);
    t.claves.set(d.id, claveEstable(registro));

    return act;

}

function listaDe(t){

    return ordenarPorFecha(Array.from(t.registros.values()).map(limpio));

}

// Primera carga: lo que hay en la PC + lo que cambió en la base desde
// la última vez.
async function cargarPorRegistro(nombre){

    const t = tabla(nombre);

    const ok = await asegurarMigracion(nombre);

    if(!ok) throw new Error("No se pudo preparar '" + nombre + "'.");

    const col = collection(db, TABLAS_POR_REGISTRO[nombre].coleccion);

    let maximo = 0;

    try{

        const local = await getDocsFromCache(col);

        local.docs.forEach(d =>{ maximo = Math.max(maximo, aplicarDocumento(t, d)); });

    }catch(_e){

        // Primera vez en esta PC: no hay copia local todavía.

    }

    // 10 minutos de margen por diferencias de reloj.
    t.desde = Timestamp.fromMillis(Math.max(0, maximo - 10 * 60 * 1000));

    const cambios = await getDocs(query(col, where("_act", ">=", t.desde)));

    cambios.docs.forEach(d => aplicarDocumento(t, d));

    return listaDe(t);

}

function cargaInicial(nombre){

    const t = tabla(nombre);

    if(!t.carga){

        t.carga = cargarPorRegistro(nombre).catch(error =>{

            t.carga = null;

            throw error;

        });

    }

    return t.carga;

}

async function leerPorRegistro(nombre){

    try{

        const lista = await cargaInicial(nombre);

        // Colección vacía: igual que antes con un documento inexistente,
        // la app sube lo que tenga guardado en esta PC.
        return lista.length ? lista : null;

    }catch(error){

        console.error("[Firebase] Error al leer '" + nombre + "':", error);

        return undefined;

    }

}

function escucharPorRegistro(nombre, callback){

    const t = tabla(nombre);

    let cancelar = () => {};

    let cancelado = false;

    const empezar = () => cargaInicial(nombre).then(() =>{

        if(cancelado) return;

        // Si la primera carga se hizo recién ahora (por ejemplo, la PC
        // arrancó sin internet), la app recibe la lista completa.
        callback(listaDe(t));

        // Solo los registros que cambien de ahora en adelante.
        cancelar = onSnapshot(

            query(collection(db, TABLAS_POR_REGISTRO[nombre].coleccion), where("_act", ">=", t.desde)),

            (snap) =>{

                let hubo = false;

                snap.docChanges().forEach(cambio =>{

                    // "removed" = salió de la consulta, no que se borró.
                    if(cambio.type === "removed") return;

                    const antes = t.claves.get(cambio.doc.id);

                    const estaba = t.registros.has(cambio.doc.id);

                    aplicarDocumento(t, cambio.doc);

                    if(antes !== t.claves.get(cambio.doc.id) || estaba !== t.registros.has(cambio.doc.id)) hubo = true;

                });

                if(hubo) callback(listaDe(t));

            },

            (error) => console.error("[Firebase] Error escuchando '" + nombre + "':", error)

        );

    }).catch(() =>{

        // Sin internet al abrir: se reintenta cada 30 segundos.
        if(!cancelado) setTimeout(empezar, 30000);

    });

    empezar();

    return () =>{ cancelado = true; cancelar(); };

}

async function guardarPorRegistro(nombre, datos){

    const conf = TABLAS_POR_REGISTRO[nombre];

    const t = tabla(nombre);

    // Antes de guardar hay que conocer lo que ya está en la base, para
    // subir solo lo que cambió.
    try{

        await cargaInicial(nombre);

    }catch(_e){

        // Sin conexión ni copia local: se guarda igual (Firestore lo sube
        // cuando vuelva internet), pero no se marca nada como borrado.

    }

    const operaciones = [];

    const vistos = new Set();

    (datos || []).forEach((registro, i) =>{

        if(!registro || typeof registro !== "object") return;

        // Cada registro necesita un id propio (es el nombre del documento).
        if(!registro.id || vistos.has(registro.id)){

            registro.id = (registro.id || conf.prefijo + Date.now()) + "_" + i;

        }

        vistos.add(registro.id);

        const copia = limpio(registro);

        delete copia._act;
        delete copia._borrado;

        const texto = claveEstable(copia);

        if(t.claves.get(registro.id) === texto) return;

        operaciones.push({
            ref: doc(db, conf.coleccion, registro.id),
            datos: { ...copia, _act: serverTimestamp(), _borrado: false }
        });

        t.registros.set(registro.id, copia);
        t.claves.set(registro.id, texto);

    });

    // Lo que se sabe que está en la base y ya no está en la lista se marca
    // como borrado. Si esta PC nunca pudo leer la base, no se marca nada.
    Array.from(t.claves.keys()).forEach(id =>{

        if(vistos.has(id)) return;

        operaciones.push({
            ref: doc(db, conf.coleccion, id),
            datos: { _borrado: true, _act: serverTimestamp() },
            mezclar: true
        });

        t.registros.delete(id);
        t.claves.delete(id);

    });

    if(!operaciones.length) return true;

    try{

        await escribirEnLotes(operaciones);

        return true;

    }catch(error){

        console.error("[Firebase] Error al guardar '" + nombre + "':", error);

        return false;

    }

}

/* ==========================================
   GUARDAR
   Sube el arreglo/objeto completo de una tabla
   (o solo los registros que cambiaron, en las
   tablas con un documento por registro).
========================================== */
async function guardarColeccion(nombre, datos){

    if(TABLAS_POR_REGISTRO[nombre] && Array.isArray(datos)) return guardarPorRegistro(nombre, datos);

    try{

        await setDoc(doc(db, COLECCION, nombre), {
            datos,
            actualizado: Date.now()
        });

        return true;

    }catch(error){

        console.error("[Firebase] Error al guardar '" + nombre + "':", error);

        return false;

    }

}

/* ==========================================
   LEER (una sola vez)
   Devuelve:
     - los datos guardados, si el documento existe
     - null si el documento todavía no existe en Firebase
     - undefined si hubo un error de conexión
========================================== */
async function leerColeccion(nombre){

    if(TABLAS_POR_REGISTRO[nombre]) return leerPorRegistro(nombre);

    try{

        const snap = await getDoc(doc(db, COLECCION, nombre));

        return snap.exists() ? snap.data().datos : null;

    }catch(error){

        console.error("[Firebase] Error al leer '" + nombre + "':", error);

        return undefined;

    }

}

/* ==========================================
   ESCUCHAR EN VIVO
   Se ejecuta automáticamente cada vez que otra
   computadora modifica esa tabla. Devuelve una
   función para cancelar la suscripción.
========================================== */
function escucharColeccion(nombre, callback){

    if(TABLAS_POR_REGISTRO[nombre]) return escucharPorRegistro(nombre, callback);

    return onSnapshot(

        doc(db, COLECCION, nombre),

        (snap) =>{

            if(snap.exists()){

                callback(snap.data().datos);

            }

        },

        (error) =>{

            console.error("[Firebase] Error escuchando '" + nombre + "':", error);

        }

    );

}

// Se expone en window para que lo usen los scripts clásicos (app.js, auth.js, etc.)
window.FirebaseDB = {
    guardarColeccion,
    leerColeccion,
    escucharColeccion,
    listo: true
};

console.log("[Firebase] Conectado al proyecto:", firebaseConfig.projectId);
