/* ==========================================
   AUTENTICACIÓN / LOGIN
========================================== */

let usuarios = [];
let usuarioActual = null;

const USUARIOS_POR_DEFECTO = [
    {
        usuario: "lorenaforralitas",
        password: "forrajeriaforralitas",
        nombre: "Lorena",
        rol: "empleado"
    },
    {
        usuario: "dernaforralitas",
        password: "forrajeriaforralitas",
        nombre: "Derna",
        rol: "empleado"
    },
    {
        usuario: "maxiforralitas",
        password: "forrajeriaforralitas",
        nombre: "Maxi",
        rol: "empleado"
    },
    {
        usuario: "maxiadmin",
        password: "forralitasadmin",
        nombre: "Maxi (Administrador)",
        rol: "admin"
    }
];

/* El usuario maxiforralitas puede eliminar ventas pero sus eliminaciones
   NO aparecen en el panel del administrador. Los demás usuarios sí. */
const USUARIO_OCULTO_ELIMINACIONES = "maxiforralitas";

async function cargarUsuarios(){

    // Respaldo local (arranque instantáneo / sin internet).
    usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    if(window.FirebaseDB){

        const remoto = await window.FirebaseDB.leerColeccion("usuarios");

        if(remoto !== undefined && remoto !== null){

            usuarios = remoto;

        }

    }

    let cambios = false;

    USUARIOS_POR_DEFECTO.forEach(def=>{

        if(!usuarios.some(u => u.usuario === def.usuario)){

            usuarios.push({ ...def });

            cambios = true;

        }

    });

    if(cambios) guardarUsuarios();

    if(window.FirebaseDB){

        window.FirebaseDB.escucharColeccion("usuarios", (remoto) =>{

            usuarios = remoto;

            localStorage.setItem("usuarios", JSON.stringify(usuarios));

        });

    }

}

function guardarUsuarios(){

    localStorage.setItem("usuarios", JSON.stringify(usuarios));

    if(window.FirebaseDB) window.FirebaseDB.guardarColeccion("usuarios", usuarios);

}

function sesionActiva(){

    const guardado = localStorage.getItem("sesionActual");

    if(!guardado) return false;

    usuarioActual = usuarios.find(u => u.usuario === guardado) || null;

    return !!usuarioActual;

}

function esAdmin(){

    return !!usuarioActual && usuarioActual.rol === "admin";

}

/* True cuando el usuario actual es maxiforralitas: puede eliminar pero
   no queda registrado en el panel de eliminaciones. */
function esUsuarioOcultoEliminaciones(){

    return !!usuarioActual
        && usuarioActual.usuario === USUARIO_OCULTO_ELIMINACIONES;

}

/* ==========================================
   LOGIN / LOGOUT
========================================== */

function iniciarEventosLogin(){

    const form = document.getElementById("formLogin");

    if(form){

        form.addEventListener("submit", (e)=>{

            e.preventDefault();

            iniciarSesion();

        });

    }

}

function iniciarSesion(){

    const usuario = document.getElementById("loginUsuario").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    const cuenta = usuarios.find(u=>u.usuario===usuario);

    if(!cuenta || cuenta.password!==password){

        document.getElementById("loginError").textContent="Usuario o contraseña incorrectos.";
        return;

    }

    usuarioActual=cuenta;

    localStorage.setItem("sesionActual",cuenta.usuario);

    document.getElementById("loginError").textContent="";

    ocultarLogin();

    iniciarAppLogueada();

}
function cerrarSesion(){

    localStorage.removeItem("sesionActual");

    usuarioActual = null;

    mostrarLogin();

}

function mostrarLogin(){

    document.getElementById("pantallaLogin").style.display="flex";

    document.getElementById("appPrincipal").classList.add("oculto");

}

function ocultarLogin(){

    document.getElementById("pantallaLogin").style.display="none";

    document.getElementById("appPrincipal").classList.remove("oculto");

}

/* ==========================================
   USUARIO ACTUAL EN LA UI
========================================== */

function mostrarUsuarioActual(){

    const cont = document.getElementById("usuarioActualUI");

    if(!cont || !usuarioActual) return;

    cont.innerHTML = `
        <span class="nombreUsuario">👤 ${usuarioActual.nombre}</span>
        <button id="btnCerrarSesion" class="btnCerrarSesion">Salir</button>
    `;

    const btn = document.getElementById("btnCerrarSesion");

    if(btn) btn.onclick = cerrarSesion;

}

/* ==========================================
   PERMISOS SEGÚN ROL
========================================== */

function aplicarPermisos(){

    const botonEliminaciones = document.getElementById("Eliminaciones");

    if(botonEliminaciones){

        botonEliminaciones.style.display = esAdmin() ? "" : "none";

    }

}

/* ==========================================
   HISTORIAL DE ELIMINACIONES (SOLO ADMIN)
========================================== */

function registrarEliminacion(tipo, detalle, datos){

    // maxiforralitas puede eliminar, pero no queda registrado en el panel.
    if(esUsuarioOcultoEliminaciones()){

        return;

    }

    eliminaciones.unshift({

        id: "E" + Date.now(),

        fecha: new Date().toISOString(),

        fechaTexto: fechaHoraTexto(new Date()),

        usuario: usuarioActual ? usuarioActual.usuario : "desconocido",

        nombre: usuarioActual ? usuarioActual.nombre : "Desconocido",

        rol: usuarioActual ? usuarioActual.rol : "-",

        tipo,

        detalle,

        datos: datos || null

    });

    guardarDatos();

}

/* ==========================================
   RENDER HISTORIAL DE ELIMINACIONES
========================================== */

function renderEliminaciones(){

    if(!esAdmin()){

        contenido().innerHTML = `
            <div class="card">
                <p>Sección exclusiva del administrador.</p>
            </div>
        `;

        return;

    }

    // Se muestran todas las eliminaciones excepto las de maxiforralitas.
    const visibles = eliminaciones.filter(e =>

        e.usuario !== USUARIO_OCULTO_ELIMINACIONES

    );

    let filas = "";

    if(visibles.length === 0){

        filas = `
            <tr>
                <td colspan="5" class="tablaVacia">
                    Todavía no hay eliminaciones registradas.
                </td>
            </tr>
        `;

    }else{

        visibles.forEach(e=>{

            filas += `
                <tr>
                    <td>${e.fechaTexto}</td>
                    <td>${e.nombre} <small>(${e.usuario})</small></td>
                    <td>${e.tipo}</td>
                    <td>${e.detalle}</td>
                </tr>
            `;

        });

    }

    contenido().innerHTML = `

        <div class="cardEliminaciones">

            <p class="notaEliminaciones">
                Registro exclusivo del administrador. Aquí queda constancia de
                todo lo que las empleadas eliminan del sistema.
            </p>

            <div class="tablaEliminaciones">

                <table>

                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Usuario</th>
                            <th>Tipo</th>
                            <th>Detalle</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${filas}
                    </tbody>

                </table>

            </div>

        </div>

    `;

}
