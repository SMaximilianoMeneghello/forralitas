/* Arranca el emulador local de Firebase (Firestore + cuentas) para
   las pruebas. Usa las reglas REALES del proyecto (firestore.rules)
   más un permiso extra para las colecciones de prueba "t_...".

   Requiere tener instalado firebase-tools y Java:
       npm install -g firebase-tools
       node tests/emulador.mjs
*/
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emulador-"));

const reglas = fs.readFileSync(path.join(raiz, "firestore.rules"), "utf8").replace(
    "    // Todo lo demás queda bloqueado.",
    "    // (solo pruebas automáticas)\n    match /{coleccion}/{documento} {\n      allow read, write: if coleccion.matches('t_.*');\n    }"
);

fs.writeFileSync(path.join(dir, "firestore.rules"), reglas);

fs.writeFileSync(path.join(dir, "firebase.json"), JSON.stringify({
    firestore: { rules: "firestore.rules" },
    emulators: {
        auth: { port: 9099, host: "127.0.0.1" },
        firestore: { port: 8080, host: "127.0.0.1" },
        ui: { enabled: false },
        singleProjectMode: true
    }
}));

const binario = process.env.FIREBASE_BIN || "firebase";

const hijo = spawn(binario, ["emulators:start", "--project", "demo-prueba", "--only", "firestore,auth"], {
    cwd: dir,
    stdio: "inherit"
});

hijo.on("exit", codigo => process.exit(codigo || 0));
