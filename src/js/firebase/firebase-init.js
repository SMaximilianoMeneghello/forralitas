/* ==========================================
   CONEXIÓN CON FIREBASE (FIRESTORE)
   ------------------------------------------
   Este archivo es un módulo ES (type="module")
   y se carga DESPUÉS de todos los scripts clásicos
   pero ANTES del evento DOMContentLoaded, así que
   cuando arranca app.js (iniciarApp) window.FirebaseDB
   ya está listo para usarse.
========================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    onSnapshot
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ==========================================
   GUARDAR
   Sube el arreglo/objeto completo de una tabla.
========================================== */
async function guardarColeccion(nombre, datos){

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
