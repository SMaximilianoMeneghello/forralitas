/* ==========================================
   CONEXIÓN CON FIREBASE (FIRESTORE + CUENTAS)
   ------------------------------------------
   Este archivo es un módulo ES (type="module").
   Vite lo empaqueta junto con la librería de
   Firebase, así que el programa NO depende de
   bajar nada de internet para arrancar.

   Se ejecuta antes del evento DOMContentLoaded:
   cuando arranca app.js (iniciarApp),
   window.FirebaseDB ya está listo para usarse.

   Dónde vive cada "tabla" de la app:

   - Modo clásico (instalación original):
       forralitasDatos/{tabla}
   - Modo cuenta (un negocio = una cuenta con
     email y contraseña):
       negocios/{idDeLaCuenta}/datos/{tabla}

   Cada tabla es un documento con el arreglo
   completo en el campo "datos" (las tablas muy
   grandes se reparten en partes; ver
   src/js/datos/sync-gestor.js).
========================================== */

import { initializeApp } from "firebase/app";

import {
    getFirestore,
    connectFirestoreEmulator,
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    runTransaction
} from "firebase/firestore";

import {
    getAuth,
    connectAuthEmulator,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";

/* ==========================================
   CONFIGURACIÓN DEL PROYECTO DE FIREBASE
   Si vas a usar OTRO proyecto de Firebase
   (por ejemplo, uno propio para vender el
   programa), reemplazá estos datos por los
   del proyecto nuevo.
========================================== */

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA3eDUrC8_O3Yo629frSDP4GlNt4-RUfHg",
    authDomain: "forralitas-3394f.firebaseapp.com",
    projectId: "forralitas-3394f",
    storageBucket: "forralitas-3394f.firebasestorage.app",
    messagingSenderId: "1044717245979",
    appId: "1:1044717245979:web:c44ab60b923c00fdc54abe"
};

// Colección del modo clásico (la instalación original, sin cuenta).
const COLECCION_CLASICA = "forralitasDatos";

/* ==========================================
   MODO PRUEBAS
   Solo para las pruebas automáticas: usa el
   emulador local de Firebase en vez de la base
   real. Nunca se activa en el uso normal.
========================================== */

let modoEmulador = false;

try{

    modoEmulador = localStorage.getItem("__emulador") === "1";

}catch(e){ /* nada */ }

const app = initializeApp(
    modoEmulador
        ? { projectId: "demo-prueba", apiKey: "demo", authDomain: "demo-prueba.firebaseapp.com" }
        : FIREBASE_CONFIG
);

const db = getFirestore(app);
const auth = getAuth(app);

if(modoEmulador){

    connectFirestoreEmulator(db, "127.0.0.1", 8080);

    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

}

/* ==========================================
   ADAPTADOR
   Operaciones básicas sobre los documentos de
   UN negocio. "segmentos" es la ruta de la
   colección: ["forralitasDatos"] o
   ["negocios", uid, "datos"].
========================================== */

function limpiar(datos){

    // Firestore no acepta valores "undefined": pasar por JSON los quita.
    return JSON.parse(JSON.stringify(datos));

}

function crearAdaptador(segmentos){

    const ref = (nombre) => doc(db, ...segmentos, nombre);

    return {

        ruta: segmentos.join("/"),

        async leer(nombre){

            const snap = await getDoc(ref(nombre));

            return snap.exists() ? snap.data() : null;

        },

        escuchar(nombre, alCambiar, alError){

            return onSnapshot(

                ref(nombre),

                { includeMetadataChanges: true },

                (snap) => alCambiar(
                    snap.exists() ? snap.data() : null,
                    { deCache: snap.metadata.fromCache }
                ),

                alError

            );

        },

        escribir(nombre, datos){

            return setDoc(ref(nombre), limpiar(datos));

        },

        transaccion(fn){

            return runTransaction(db, async (t) => fn({

                async leer(nombre){

                    const snap = await t.get(ref(nombre));

                    return snap.exists() ? snap.data() : null;

                },

                escribir(nombre, datos){ t.set(ref(nombre), limpiar(datos)); },

                borrar(nombre){ t.delete(ref(nombre)); }

            }));

        }

    };

}

function adaptadorClasico(){

    return crearAdaptador([COLECCION_CLASICA]);

}

function adaptadorCuenta(uid){

    return crearAdaptador(["negocios", uid, "datos"]);

}

/* ==========================================
   CUENTA DEL NEGOCIO (Firebase Authentication)
========================================== */

let resolverSesionInicial;

const sesionInicial = new Promise(r =>{ resolverSesionInicial = r; });

onAuthStateChanged(auth, (usuario) =>{

    resolverSesionInicial(usuario);

}, () => resolverSesionInicial(null));

function datosCuenta(u){

    return u ? { uid: u.uid, email: u.email } : null;

}

const cuenta = {

    // Espera a saber si en esta PC ya había una cuenta ingresada.
    async esperarInicial(msMaximo = 6000){

        await Promise.race([
            sesionInicial,
            new Promise(r => setTimeout(r, msMaximo))
        ]);

        return datosCuenta(auth.currentUser);

    },

    actual(){

        return datosCuenta(auth.currentUser);

    },

    async ingresar(email, clave){

        const cred = await signInWithEmailAndPassword(auth, email, clave);

        return datosCuenta(cred.user);

    },

    salir(){

        return signOut(auth);

    }

};

// Se expone en window para que lo usen los scripts clásicos (app.js, etc.)
window.FirebaseDB = {
    adaptadorClasico,
    adaptadorCuenta,
    cuenta,
    modoEmulador,
    proyecto: app.options.projectId,
    listo: true
};

console.log("[Firebase] Listo. Proyecto:", app.options.projectId, modoEmulador ? "(EMULADOR DE PRUEBAS)" : "");
