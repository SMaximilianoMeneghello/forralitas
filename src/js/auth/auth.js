/* ==========================================
   AUTENTICACIÓN / USUARIOS / PERMISOS
========================================== */

let usuarios = [];
let usuarioActual = null;

/* ==========================================
   CONTRASEÑAS
   No se guardan en texto: se guarda una huella
   (SHA-256 con "sal"). Las cuentas creadas con
   versiones anteriores se convierten solas la
   primera vez que la persona inicia sesión.
========================================== */

function sha256(texto){

    const K = [
        0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
        0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
        0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
        0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
        0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
        0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
        0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
        0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];

    const bytes = Array.from(new TextEncoder().encode(String(texto)));

    const largoBits = bytes.length * 8;

    bytes.push(0x80);

    while(bytes.length % 64 !== 56) bytes.push(0);

    const alto = Math.floor(largoBits / 0x100000000);

    for(let i = 3; i >= 0; i--) bytes.push((alto >>> (i * 8)) & 0xff);

    for(let i = 3; i >= 0; i--) bytes.push((largoBits >>> (i * 8)) & 0xff);

    const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];

    const rotr = (x, n) => (x >>> n) | (x << (32 - n));

    const w = new Array(64);

    for(let bloque = 0; bloque < bytes.length; bloque += 64){

        for(let i = 0; i < 16; i++){

            const j = bloque + i * 4;

            w[i] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;

        }

        for(let i = 16; i < 64; i++){

            const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);

            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;

        }

        let [a, b, c, d, e, f, g, h] = H;

        for(let i = 0; i < 64; i++){

            const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
            const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const t2 = (S0 + maj) >>> 0;

            h = g; g = f; f = e;
            e = (d + t1) >>> 0;
            d = c; c = b; b = a;
            a = (t1 + t2) >>> 0;

        }

        H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
        H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
        H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
        H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;

    }

    return H.map(x => x.toString(16).padStart(8, "0")).join("");

}

function nuevaSal(){

    const letras = "abcdefghijklmnopqrstuvwxyz0123456789";

    let sal = "";

    if(window.crypto && window.crypto.getRandomValues){

        const azar = new Uint8Array(16);

        window.crypto.getRandomValues(azar);

        azar.forEach(n =>{ sal += letras[n % letras.length]; });

    }else{

        for(let i = 0; i < 16; i++) sal += letras[Math.floor(Math.random() * letras.length)];

    }

    return sal;

}

function asignarPassword(cuenta, password){

    cuenta.sal = nuevaSal();

    cuenta.hash = sha256(cuenta.sal + ":" + password);

    delete cuenta.password;

}

function passwordCorrecta(cuenta, password){

    if(!cuenta) return false;

    if(cuenta.hash && cuenta.sal){

        return sha256(cuenta.sal + ":" + password) === cuenta.hash;

    }

    // Cuenta de una versión anterior (contraseña sin cifrar).
    return typeof cuenta.password === "string" && cuenta.password === password;

}

function normalizarLogin(texto){

    return String(texto || "").trim().toLowerCase();

}

function buscarUsuario(login){

    const buscado = normalizarLogin(login);

    return usuarios.find(u => normalizarLogin(u.usuario) === buscado) || null;

}

function guardarUsuarios(){

    guardarDatos("usuarios");

}

function sesionActiva(){

    const guardado = localStorage.getItem("sesionActual");

    if(!guardado) return false;

    usuarioActual = buscarUsuario(guardado);

    return !!usuarioActual;

}

/* ==========================================
   ROLES Y PERMISOS
========================================== */

function esAdmin(){

    return !!usuarioActual && usuarioActual.rol === "admin";

}

/* Lo que puede hacer un EMPLEADO lo decide el administrador en
   Configuración → Permisos. El administrador puede hacer todo. */
const PERMISOS_EMPLEADO = [
    { clave: "eliminarVentas", texto: "Eliminar ventas del historial", defecto: true },
    { clave: "editarProductos", texto: "Crear, editar y eliminar productos (precios y stock)", defecto: true },
    { clave: "editarClientes", texto: "Editar y eliminar clientes y sus precios", defecto: true },
    { clave: "gastos", texto: "Editar y eliminar gastos ya cargados", defecto: true },
    { clave: "proveedores", texto: "Ver y cargar proveedores, compras y pagos", defecto: true },
    { clave: "mezclas", texto: "Crear recetas y registrar producción de mezclas", defecto: true },
    { clave: "verCajaCompleta", texto: "Ver la caja de todos (no solo la propia)", defecto: false }
];

function puede(permiso){

    if(esAdmin()) return true;

    if(!usuarioActual) return false;

    const permisos = (configuracionSistema && configuracionSistema.permisos) || {};

    if(permisos[permiso] !== undefined) return !!permisos[permiso];

    const def = PERMISOS_EMPLEADO.find(p => p.clave === permiso);

    return def ? def.defecto : false;

}

function avisarSinPermiso(){

    notificacion("Tu usuario no tiene permiso para hacer esto. Pedíselo al administrador.", "warning");

}

function soloAdmin(){

    if(esAdmin()) return true;

    notificacion("Solo el administrador puede hacer esto.", "warning");

    return false;

}

/* ==========================================
   PANTALLAS DE ARRANQUE
========================================== */

const PANTALLAS_ARRANQUE = ["pantallaInicio", "pantallaConexion", "pantallaPrimerAdmin", "pantallaLogin"];

function mostrarPantallaArranque(id){

    PANTALLAS_ARRANQUE.forEach(p =>{

        const el = document.getElementById(p);

        if(el) el.style.display = (p === id) ? "flex" : "none";

    });

    document.getElementById("appPrincipal").classList.add("oculto");

    document.querySelectorAll(".pantallaDetalle").forEach(el => el.classList.add("oculto"));

}

function mostrarPantallaInicio(texto, conReintento){

    mostrarPantallaArranque("pantallaInicio");

    document.getElementById("textoPantallaInicio").textContent = texto || "Cargando…";

    document.getElementById("btnReintentarInicio").classList.toggle("oculto", !conReintento);

}

function mostrarPantallaSinConexionInicial(){

    mostrarPantallaInicio(
        "No se pudo conectar con la base de datos y esta computadora todavía no tiene datos guardados. "
        + "Revisá la conexión a internet y volvé a intentar.",
        true
    );

}

/* ==========================================
   CUENTA DEL NEGOCIO (para vincular una PC)
========================================== */

function mostrarPantallaConexion(opciones){

    mostrarPantallaArranque("pantallaConexion");

    const o = opciones || {};

    document.getElementById("conexionEmail").value = o.email || "";
    document.getElementById("conexionClave").value = "";
    document.getElementById("conexionAviso").textContent = o.aviso || "";
    document.getElementById("conexionError").textContent = "";

    document.getElementById("formConexion").onsubmit = (e)=>{

        e.preventDefault();

        ingresarCuentaNegocio();

    };

    const enlace = document.getElementById("enlaceSinCuenta");

    // Si el negocio ya pasó a cuenta, el modo clásico deja de ofrecerse.
    enlace.classList.toggle("oculto", !!o.sinClasico);

    enlace.onclick = (e)=>{

        e.preventDefault();

        const conexion = { modo: "clasico" };

        guardarConexion(conexion);

        conectarYArrancar(conexion);

    };

}

function textoErrorCuenta(error){

    const codigo = (error && error.code) || "";

    if(/invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(codigo)){

        return "El email o la clave del negocio no son correctos.";

    }

    if(/user-disabled/.test(codigo)) return "Esta cuenta está deshabilitada. Consultá con tu proveedor del sistema.";

    if(/too-many-requests/.test(codigo)) return "Demasiados intentos. Esperá unos minutos y volvé a probar.";

    if(/network-request-failed/.test(codigo)) return "No hay conexión a internet.";

    if(/operation-not-allowed|configuration-not-found/.test(codigo)){

        return "El ingreso con email y clave no está habilitado en Firebase (ver la guía de instalación).";

    }

    return "No se pudo ingresar (" + (codigo || (error && error.message) || "error") + ").";

}

async function ingresarCuentaNegocio(){

    const email = document.getElementById("conexionEmail").value.trim();
    const clave = document.getElementById("conexionClave").value;
    const error = document.getElementById("conexionError");
    const boton = document.getElementById("btnConexion");

    if(!email || !clave){

        error.textContent = "Completá el email y la clave del negocio.";

        return;

    }

    boton.disabled = true;

    error.textContent = "";

    try{

        const cuenta = await window.FirebaseDB.cuenta.ingresar(email, clave);

        const conexion = { modo: "cuenta", uid: cuenta.uid, email: cuenta.email };

        guardarConexion(conexion);

        boton.disabled = false;

        await conectarYArrancar(conexion);

    }catch(e){

        boton.disabled = false;

        error.textContent = textoErrorCuenta(e);

    }

}

/* ==========================================
   PRIMER USO: CREAR EL ADMINISTRADOR
========================================== */

function mostrarPantallaPrimerAdmin(){

    mostrarPantallaArranque("pantallaPrimerAdmin");

    document.getElementById("formPrimerAdmin").onsubmit = (e)=>{

        e.preventDefault();

        crearPrimerAdmin();

    };

}

function crearPrimerAdmin(){

    const negocio = document.getElementById("primerNegocio").value.trim();
    const nombre = document.getElementById("primerNombre").value.trim();
    const login = normalizarLogin(document.getElementById("primerUsuario").value);
    const clave = document.getElementById("primerClave").value;
    const repetir = document.getElementById("primerClaveRepetir").value;
    const error = document.getElementById("primerAdminError");

    if(!negocio || !nombre || !login){

        error.textContent = "Completá el nombre del negocio, tu nombre y un usuario.";

        return;

    }

    if(!/^[a-z0-9._-]+$/.test(login)){

        error.textContent = "El usuario solo puede tener letras, números, puntos y guiones (sin espacios).";

        return;

    }

    if(clave.length < 6){

        error.textContent = "La contraseña debe tener al menos 6 caracteres.";

        return;

    }

    if(clave !== repetir){

        error.textContent = "Las contraseñas no coinciden.";

        return;

    }

    if(usuarios.length > 0){

        // Otra PC creó el administrador mientras tanto.
        mostrarLogin();

        return;

    }

    const cuenta = { usuario: login, nombre, rol: "admin" };

    asignarPassword(cuenta, clave);

    usuarios.push(cuenta);

    configuracionSistema.negocio.nombre = negocio;

    // Negocio nuevo: no necesita los ajustes de datos de versiones viejas.
    configuracionSistema.migraciones = { separarPorProducto: true, usuarioSinRegistro: true };

    guardarDatos("usuarios", "configuracionSistema");

    aplicarDatosNegocio();

    usuarioActual = cuenta;

    localStorage.setItem("sesionActual", cuenta.usuario);

    ocultarLogin();

    iniciarAppLogueada();

    notificacion("¡Listo! Ya podés empezar a cargar productos y vender.");

}

/* ==========================================
   LOGIN / LOGOUT
========================================== */

let eventosLoginIniciados = false;

function iniciarEventosLogin(){

    if(eventosLoginIniciados) return;

    eventosLoginIniciados = true;

    const form = document.getElementById("formLogin");

    if(form){

        form.addEventListener("submit", (e)=>{

            e.preventDefault();

            iniciarSesion();

        });

    }

    const reintentar = document.getElementById("btnReintentarInicio");

    if(reintentar) reintentar.onclick = () => location.reload();

}

function iniciarSesion(){

    const login = document.getElementById("loginUsuario").value;
    const password = document.getElementById("loginPassword").value;

    const cuenta = buscarUsuario(login);

    if(!cuenta || !passwordCorrecta(cuenta, password)){

        document.getElementById("loginError").textContent = "Usuario o contraseña incorrectos.";

        return;

    }

    // Cuenta vieja con contraseña sin cifrar: se cifra ahora.
    if(!cuenta.hash){

        asignarPassword(cuenta, password);

        guardarUsuarios();

    }

    usuarioActual = cuenta;

    localStorage.setItem("sesionActual", cuenta.usuario);

    document.getElementById("loginError").textContent = "";
    document.getElementById("loginPassword").value = "";

    ocultarLogin();

    iniciarAppLogueada();

}

function cerrarSesion(){

    localStorage.removeItem("sesionActual");

    usuarioActual = null;

    document.querySelectorAll(".modal").forEach(m => m.classList.add("oculto"));

    mostrarLogin();

}

function mostrarLogin(){

    mostrarPantallaArranque("pantallaLogin");

    setTimeout(()=>{

        const campo = document.getElementById("loginUsuario");

        if(campo) campo.focus();

    }, 50);

}

function ocultarLogin(){

    PANTALLAS_ARRANQUE.forEach(p =>{

        const el = document.getElementById(p);

        if(el) el.style.display = "none";

    });

    document.getElementById("appPrincipal").classList.remove("oculto");

}

/* ==========================================
   USUARIO ACTUAL EN LA UI
========================================== */

function mostrarUsuarioActual(){

    const cont = document.getElementById("usuarioActualUI");

    if(!cont || !usuarioActual) return;

    cont.innerHTML = `
        <span class="nombreUsuario">👤 ${esc(usuarioActual.nombre)}${esAdmin() ? " <small>(admin)</small>" : ""}</span>
        <button id="btnCerrarSesion" class="btnCerrarSesion">Salir</button>
    `;

    const btn = document.getElementById("btnCerrarSesion");

    if(btn) btn.onclick = cerrarSesion;

}

function aplicarPermisos(){

    const mostrar = (id, visible) =>{

        const el = document.getElementById(id);

        if(el) el.style.display = visible ? "" : "none";

    };

    mostrar("Eliminaciones", esAdmin());
    mostrar("Proveedores", puede("proveedores"));
    mostrar("Mezclas", puede("mezclas"));

}

/* ==========================================
   HISTORIAL DE ELIMINACIONES (SOLO ADMIN)
========================================== */

function registrarEliminacion(tipo, detalle, datos){

    // El administrador puede marcar usuarios cuyas eliminaciones no
    // se anotan en el panel (Configuración → usuarios).
    if(usuarioActual && usuarioActual.ocultarEliminaciones) return;

    eliminaciones.unshift({

        id: nuevoId("E"),

        fecha: new Date().toISOString(),

        fechaTexto: fechaHoraTexto(new Date()),

        usuario: usuarioActual ? usuarioActual.usuario : "desconocido",

        nombre: usuarioActual ? usuarioActual.nombre : "Desconocido",

        rol: usuarioActual ? usuarioActual.rol : "-",

        tipo,

        detalle,

        datos: datos ? JSON.parse(JSON.stringify(datos)) : null

    });

}

const TIPOS_RESTAURABLES = ["Venta", "Producto", "Cliente", "Proveedor", "Gasto", "Mezcla", "Anotación"];

function renderEliminaciones(){

    if(!esAdmin()){

        contenido().innerHTML = `
            <div class="card">
                <p>Sección exclusiva del administrador.</p>
            </div>
        `;

        return;

    }

    let filas = "";

    if(eliminaciones.length === 0){

        filas = `
            <tr>
                <td colspan="5" class="tablaVacia">
                    Todavía no hay eliminaciones registradas.
                </td>
            </tr>
        `;

    }else{

        eliminaciones.forEach(e=>{

            const restaurable = e.datos && TIPOS_RESTAURABLES.includes(e.tipo);

            filas += `
                <tr>
                    <td>${esc(e.fechaTexto)}</td>
                    <td>${esc(e.nombre)} <small>(${esc(e.usuario)})</small></td>
                    <td>${esc(e.tipo)}</td>
                    <td>${esc(e.detalle)}</td>
                    <td class="accionesTabla">
                        ${restaurable ? `
                            <button class="btnAccion btnVer" title="Restaurar lo eliminado"
                                onclick="restaurarEliminacion('${esc(e.id)}')">♻️</button>
                        ` : ""}
                        <button class="btnAccion btnBorrar" title="Borrar este registro del panel"
                            onclick="borrarRegistroEliminacion('${esc(e.id)}')">🗑️</button>
                    </td>
                </tr>
            `;

        });

    }

    contenido().innerHTML = `

        <div class="cardEliminaciones">

            <div class="barraAcciones">
                <p class="notaEliminaciones">
                    Registro exclusivo del administrador. Acá queda constancia de
                    todo lo que se elimina del sistema. Con ♻️ podés volver a poner
                    lo eliminado tal como estaba.
                </p>
                ${eliminaciones.length ? `<button class="btnSecundario" id="btnVaciarEliminaciones">Vaciar panel</button>` : ""}
            </div>

            <div class="tablaEliminaciones">

                <table>

                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Usuario</th>
                            <th>Tipo</th>
                            <th>Detalle</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${filas}
                    </tbody>

                </table>

            </div>

        </div>

    `;

    const vaciar = document.getElementById("btnVaciarEliminaciones");

    if(vaciar) vaciar.onclick = vaciarEliminaciones;

}

function borrarRegistroEliminacion(id){

    if(!soloAdmin()) return;

    confirmar("¿Borrar este registro del panel? (No restaura ni cambia nada más).", ()=>{

        eliminaciones = eliminaciones.filter(e => e.id !== id);

        guardarDatos("eliminaciones");

        renderEliminaciones();

    });

}

function vaciarEliminaciones(){

    if(!soloAdmin()) return;

    confirmar("¿Vaciar todo el panel de eliminaciones? Ya no se va a poder restaurar nada de lo que figura acá.", ()=>{

        eliminaciones = [];

        guardarDatos("eliminaciones");

        renderEliminaciones();

        notificacion("Panel vaciado.");

    });

}

/* Vuelve a poner un registro eliminado tal como estaba. */
function restaurarEliminacion(id){

    if(!soloAdmin()) return;

    const reg = eliminaciones.find(e => e.id === id);

    if(!reg || !reg.datos) return;

    const d = JSON.parse(JSON.stringify(reg.datos));

    const yaExiste = (lista) => lista.some(x => x.id === d.id);

    const destinos = {
        "Producto": () => productos,
        "Cliente": () => clientes,
        "Proveedor": () => proveedores,
        "Gasto": () => gastos,
        "Mezcla": () => mezclas,
        "Anotación": () => carpetasNotas,
        "Venta": () => historialVentas
    };

    const lista = destinos[reg.tipo] ? destinos[reg.tipo]() : null;

    if(!lista) return;

    if(d.id && yaExiste(lista)){

        notificacion("Ese registro ya existe: no hace falta restaurarlo.", "warning");

        return;

    }

    confirmar("¿Restaurar " + reg.detalle + "?", ()=>{

        if(reg.tipo === "Venta"){

            restaurarVentaEliminada(d);

        }else{

            if(!d.id) d.id = nuevoId("R");

            if(reg.tipo === "Mezcla" || reg.tipo === "Anotación") lista.unshift(d);
            else lista.push(d);

            // Los precios especiales del cliente se guardaron junto con él.
            if(reg.tipo === "Cliente" && Array.isArray(d.preciosEspeciales)){

                const precios = d.preciosEspeciales;

                delete d.preciosEspeciales;

                precios.forEach(p =>{

                    if(!preciosClientesCache.some(x => x.id === p.id)) preciosClientesCache.push(p);

                });

            }

        }

        eliminaciones = eliminaciones.filter(e => e.id !== id);

        guardarDatos();

        renderEliminaciones();

        notificacion("Restaurado correctamente.");

    });

}
