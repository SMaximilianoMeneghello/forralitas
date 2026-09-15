/* ==========================================
   CONFIGURACIÓN
========================================== */

const CONFIG_DEFAULT = {

    tema:{

        color:"#2e7d32",

        fondo:"#f5f6fa",

        fuente:"16",

        animaciones:true,

        sombras:true,

        radio:18

    },

    dashboard:{

        mostrarUltimasVentas:true,

        mostrarStock:true,

        mostrarClientes:true,

        mostrarGastos:true,

        cantidadVentas:5

    },

    ventas:{

        confirmarEliminar:true,

        confirmarVenta:false,

        sonidoVenta:true,

        ventaRapida:true

    },

    inventario:{

        stockMinimo:5,

        alertas:true,

        mostrarSinStock:true

    }

};

let configuracionSistema = JSON.parse(localStorage.getItem("configuracionSistema")) || CONFIG_DEFAULT;

function guardarConfiguracion(){

    localStorage.setItem("configuracionSistema", JSON.stringify(configuracionSistema));

    if(window.FirebaseDB) window.FirebaseDB.guardarColeccion("configuracionSistema", configuracionSistema);

}

/* ==========================================
   SINCRONIZAR CONFIGURACIÓN CON FIREBASE
   La app ya se pinta con el valor local/por
   defecto al instante; esto la actualiza si
   hay una configuración distinta en la nube.
========================================== */
async function sincronizarConfiguracionFirebase(){

    if(!window.FirebaseDB) return;

    const remoto = await window.FirebaseDB.leerColeccion("configuracionSistema");

    if(remoto === undefined) return; // sin conexión

    if(remoto === null){

        window.FirebaseDB.guardarColeccion("configuracionSistema", configuracionSistema);

    }else{

        configuracionSistema = remoto;

        localStorage.setItem("configuracionSistema", JSON.stringify(configuracionSistema));

        aplicarTema();

    }

    window.FirebaseDB.escucharColeccion("configuracionSistema", (remoto) =>{

        configuracionSistema = remoto;

        localStorage.setItem("configuracionSistema", JSON.stringify(configuracionSistema));

        aplicarTema();

    });

}

function aplicarTema(){

    document.documentElement.style.setProperty("--color-principal", configuracionSistema.tema.color);

    document.documentElement.style.setProperty("--color-primario", configuracionSistema.tema.color);

    document.documentElement.style.setProperty("--verde", configuracionSistema.tema.color);

    document.documentElement.style.setProperty("--radio", configuracionSistema.tema.radio + "px");

    document.body.style.background = configuracionSistema.tema.fondo;

    document.documentElement.style.fontSize = configuracionSistema.tema.fuente + "px";

    if(configuracionSistema.tema.sombras){

        document.body.classList.remove("sinSombras");

    }else{

        document.body.classList.add("sinSombras");

    }

    if(configuracionSistema.tema.animaciones){

        document.body.classList.remove("sinAnimaciones");

    }else{

        document.body.classList.add("sinAnimaciones");

    }

}

aplicarTema();

/* ==========================================
   TAMAÑO DE TARJETAS
   (preferencia local de esta computadora,
   no se sincroniza con Firebase a propósito)
========================================== */

function escalaTarjetasActual(){

    return localStorage.getItem("escalaTarjetas") || "normal";

}

function aplicarEscalaTarjetas(){

    const escala = escalaTarjetasActual();

    document.body.classList.remove("tarjetasChicas", "tarjetasGrandes");

    if(escala === "chicas") document.body.classList.add("tarjetasChicas");

    if(escala === "grandes") document.body.classList.add("tarjetasGrandes");

}

function guardarEscalaTarjetas(){

    const valor = document.getElementById("escalaTarjetas").value;

    localStorage.setItem("escalaTarjetas", valor);

    aplicarEscalaTarjetas();

    notificacion("Tamaño de tarjetas actualizado (solo en esta computadora).", "success");

}

aplicarEscalaTarjetas();

/* ==========================================
   RENDER CONFIGURACIÓN
========================================== */

function renderConfiguracion(){

    contenido().innerHTML = `

    <div class="configuracion">

    <div class="cardConfig">

    <h2>👤 Mi Cuenta</h2>

    <p><b>Nombre:</b> ${usuarioActual.nombre}</p>

    <p><b>Usuario:</b> ${usuarioActual.usuario}</p>

    <p><b>Rol:</b> ${usuarioActual.rol}</p>

    </div>

    ${esAdmin() ? `
    <div class="cardConfig" style="grid-column:1/-1">

    <h2>👥 Gestión de usuarios (Administrador)</h2>

    <p style="margin-bottom:14px;color:#777">
        Creá cuentas para cada empleado, cambiales el nombre, el rol o la
        contraseña. Cada uno solo ve sus propias ventas y gastos en Caja.
    </p>

    <button class="btnAgregar" id="btnNuevoUsuarioAdmin" style="margin-bottom:14px">
        + Nuevo usuario
    </button>

    <div class="tablaClientes">
        <table>
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody id="tablaUsuariosAdmin"></tbody>
        </table>
    </div>

    </div>
    ` : ""}

    <div class="cardConfig">

    <h2>🔐 Contraseña</h2>

    <div class="grupoInput">

    <label>Actual</label>

    <input id="passwordActual" type="password">

    </div>

    <div class="grupoInput">

    <label>Nueva</label>

    <input id="passwordNueva" type="password">

    </div>

    <div class="grupoInput">

    <label>Repetir</label>

    <input id="passwordRepetir" type="password">

    </div>

    <button class="btnGuardar" id="btnCambiarPassword">

    Guardar contraseña

    </button>

    </div>

    <div class="cardConfig">

    <h2>🎨 Apariencia</h2>

    <label>Color principal</label>

    <input id="colorPrincipal" type="color" value="${configuracionSistema.tema.color}">

    <label>Color de fondo</label>

    <input id="colorFondo" type="color" value="${configuracionSistema.tema.fondo}">

    <label>Tamaño letra</label>

    <input id="tamFuente" type="range" min="12" max="22" value="${configuracionSistema.tema.fuente}">

    <label>Radio Bordes</label>

    <input id="radio" type="range" min="6" max="35" value="${configuracionSistema.tema.radio}">

    <label>

    <input id="animaciones" type="checkbox" ${configuracionSistema.tema.animaciones ? "checked" : ""}>

    Animaciones

    </label>

    <label>

    <input id="sombras" type="checkbox" ${configuracionSistema.tema.sombras ? "checked" : ""}>

    Sombras

    </label>

    <button class="btnGuardar" id="guardarTema">

    Guardar Apariencia

    </button>

    </div>

    <div class="cardConfig">

    <h2>🗂️ Tamaño de tarjetas</h2>

    <p style="font-size:13px;color:#888;margin-top:-6px;margin-bottom:10px">
        Es una preferencia de esta computadora: cada PC puede elegir
        la suya sin afectar a las demás.
    </p>

    <label>Tamaño</label>

    <select id="escalaTarjetas">
        <option value="normal" ${escalaTarjetasActual() === "normal" ? "selected" : ""}>Normal</option>
        <option value="chicas" ${escalaTarjetasActual() === "chicas" ? "selected" : ""}>Compactas (entran más por fila)</option>
        <option value="grandes" ${escalaTarjetasActual() === "grandes" ? "selected" : ""}>Grandes (más fáciles de leer)</option>
    </select>

    <button class="btnGuardar" id="guardarEscalaTarjetas">

    Guardar Tamaño

    </button>

    </div>

    <div class="cardConfig">

    <h2>📊 Dashboard</h2>

    <label>

    <input id="chkVentas" type="checkbox" ${configuracionSistema.dashboard.mostrarUltimasVentas ? "checked" : ""}>

    Mostrar últimas ventas

    </label>

    <label>

    <input id="chkStock" type="checkbox" ${configuracionSistema.dashboard.mostrarStock ? "checked" : ""}>

    Mostrar poco stock

    </label>

    <label>

    Cantidad de ventas

    </label>

    <input id="cantVentas" type="text" inputmode="numeric" autocomplete="off" oninput="limpiarNumero(this)" value="${configuracionSistema.dashboard.cantidadVentas}">

    <button class="btnGuardar" id="guardarDashboard">

    Guardar Dashboard

    </button>

    </div>

    <div class="cardConfig">

    <h2>📦 Inventario</h2>

    <label>Stock mínimo</label>

    <input id="stockMinimo" type="text" inputmode="numeric" autocomplete="off" oninput="limpiarNumero(this)" value="${configuracionSistema.inventario.stockMinimo}">

    <label>

    <input id="alertasStock" type="checkbox" ${configuracionSistema.inventario.alertas ? "checked" : ""}>

    Alertas

    </label>

    <button class="btnGuardar" id="guardarInventario">

    Guardar Inventario

    </button>

    </div>

    <div class="cardConfig">

    <h2>💰 Ventas</h2>

    <label>

    <input id="confirmarEliminar" type="checkbox" ${configuracionSistema.ventas.confirmarEliminar ? "checked" : ""}>

    Confirmar eliminar

    </label>

    <label>

    <input id="ventaRapida" type="checkbox" ${configuracionSistema.ventas.ventaRapida ? "checked" : ""}>

    Venta rápida

    </label>

    <label>

    <input id="sonidoVenta" type="checkbox" ${configuracionSistema.ventas.sonidoVenta ? "checked" : ""}>

    Sonido venta

    </label>

    <button class="btnGuardar" id="guardarVentas">

    Guardar Ventas

    </button>

    </div>

    <div class="cardConfig">

    <h2>💾 Sistema</h2>

    <button class="btnGuardar" id="btnExportarDatos">

    Exportar Datos

    </button>

    <button class="btnGuardar" id="btnImportarDatos">

    Importar Datos

    </button>

    <button class="btnGuardar" id="btnOptimizarSistema">

    Optimizar Sistema

    </button>

    <button class="btnGuardar" id="btnRestablecerConfiguracion">

    Restablecer Configuración

    </button>

    </div>

    </div>

    `;

    document.getElementById("btnCambiarPassword").onclick = cambiarPassword;

    document.getElementById("guardarTema").onclick = guardarTema;

    document.getElementById("guardarEscalaTarjetas").onclick = guardarEscalaTarjetas;

    document.getElementById("guardarDashboard").onclick = guardarDashboardConfig;

    document.getElementById("guardarInventario").onclick = guardarInventario;

    document.getElementById("guardarVentas").onclick = guardarVentasConfig;

    document.getElementById("btnExportarDatos").onclick = exportarDatos;

    document.getElementById("btnImportarDatos").onclick = importarDatos;

    document.getElementById("btnOptimizarSistema").onclick = optimizarSistema;

    document.getElementById("btnRestablecerConfiguracion").onclick = restablecerConfiguracion;

    if(esAdmin()){

        actualizarTablaUsuariosAdmin();

        document.getElementById("btnNuevoUsuarioAdmin").onclick = abrirModalNuevoUsuarioAdmin;

        document.getElementById("guardarUsuarioAdmin").onclick = guardarUsuarioAdmin;

    }

}

/* ==========================================
   GESTIÓN DE USUARIOS (SOLO ADMIN)
========================================== */

let usuarioAdminEditandoUsuario = null;

function actualizarTablaUsuariosAdmin(){

    const tbody = document.getElementById("tablaUsuariosAdmin");

    if(!tbody) return;

    tbody.innerHTML = [...usuarios]
        .sort((a,b) => (a.nombre || "").localeCompare(b.nombre || ""))
        .map(u => `
            <tr>
                <td>${u.nombre}</td>
                <td>${u.usuario}</td>
                <td>${u.rol === "admin" ? "Administrador" : "Empleado"}</td>
                <td class="accionesTabla">
                    <button
                        class="btnAccion btnEditar"
                        title="Editar"
                        onclick="editarUsuarioAdmin('${u.usuario}')">
                        ✏️
                    </button>
                    <button
                        class="btnAccion btnBorrar"
                        title="Eliminar"
                        onclick="eliminarUsuarioAdmin('${u.usuario}')">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join("");

}

function abrirModalNuevoUsuarioAdmin(){

    usuarioAdminEditandoUsuario = null;

    document.getElementById("tituloModalUsuario").textContent = "Nuevo Usuario";

    limpiar("nombreUsuarioNuevo", "loginUsuarioNuevo", "passwordUsuarioNuevo");

    document.getElementById("loginUsuarioNuevo").disabled = false;

    document.getElementById("rolUsuarioNuevo").value = "empleado";

    document.getElementById("grupoPasswordUsuarioNuevo").querySelector("label").textContent = "Contraseña";

    abrir("modalUsuario");

}

function editarUsuarioAdmin(loginUsuario){

    const u = usuarios.find(x => x.usuario === loginUsuario);

    if(!u) return;

    usuarioAdminEditandoUsuario = loginUsuario;

    document.getElementById("tituloModalUsuario").textContent = "Editar Usuario";

    document.getElementById("nombreUsuarioNuevo").value = u.nombre || "";

    document.getElementById("loginUsuarioNuevo").value = u.usuario || "";

    // El usuario (login) no se puede cambiar una vez creado: queda
    // referenciado en ventas y gastos viejos para saber quién los cargó.
    document.getElementById("loginUsuarioNuevo").disabled = true;

    document.getElementById("passwordUsuarioNuevo").value = "";

    document.getElementById("grupoPasswordUsuarioNuevo").querySelector("label").textContent =
        "Nueva contraseña (dejar vacío para no cambiarla)";

    document.getElementById("rolUsuarioNuevo").value = u.rol || "empleado";

    abrir("modalUsuario");

}

function guardarUsuarioAdmin(){

    const nombre = document.getElementById("nombreUsuarioNuevo").value.trim();

    const loginUsuario = document.getElementById("loginUsuarioNuevo").value.trim();

    const password = document.getElementById("passwordUsuarioNuevo").value;

    const rol = document.getElementById("rolUsuarioNuevo").value;

    if(!nombre || !loginUsuario){

        notificacion("Completá el nombre y el usuario.", "warning");

        return;

    }

    if(usuarioAdminEditandoUsuario){

        const u = usuarios.find(x => x.usuario === usuarioAdminEditandoUsuario);

        if(!u) return;

        u.nombre = nombre;

        u.rol = rol;

        if(password) u.password = password;

        notificacion("Usuario actualizado.");

    }else{

        if(usuarios.some(x => x.usuario === loginUsuario)){

            notificacion("Ya existe un usuario con ese nombre de acceso.", "warning");

            return;

        }

        if(!password){

            notificacion("Ingresá una contraseña para el usuario nuevo.", "warning");

            return;

        }

        usuarios.push({ usuario: loginUsuario, password, nombre, rol });

        notificacion("Usuario creado.");

    }

    guardarUsuarios();

    cerrar("modalUsuario");

    actualizarTablaUsuariosAdmin();

    usuarioAdminEditandoUsuario = null;

}

function eliminarUsuarioAdmin(loginUsuario){

    if(loginUsuario === usuarioActual.usuario){

        notificacion("No podés eliminar tu propia cuenta mientras estás logueado con ella.", "warning");

        return;

    }

    const u = usuarios.find(x => x.usuario === loginUsuario);

    if(!u) return;

    if(u.rol === "admin" && usuarios.filter(x => x.rol === "admin").length <= 1){

        notificacion("Tiene que quedar al menos un administrador.", "warning");

        return;

    }

    confirmar(

        "¿Eliminar el usuario \"" + u.nombre + "\"? Sus ventas y gastos ya cargados quedan igual, solo se elimina el acceso.",

        ()=>{

            usuarios = usuarios.filter(x => x.usuario !== loginUsuario);

            guardarUsuarios();

            actualizarTablaUsuariosAdmin();

            notificacion("Usuario eliminado.", "error");

        }

    );

}

/* ==========================================
   CAMBIAR CONTRASEÑA
========================================== */

function cambiarPassword(){

    const actual = document.getElementById("passwordActual").value;

    const nueva = document.getElementById("passwordNueva").value;

    const repetir = document.getElementById("passwordRepetir").value;

    if(actual !== usuarioActual.password){

        notificacion("La contraseña actual es incorrecta.", "error");

        return;

    }

    if(nueva.length < 4){

        notificacion("La nueva contraseña debe tener al menos 4 caracteres.", "warning");

        return;

    }

    if(nueva !== repetir){

        notificacion("Las contraseñas nuevas no coinciden.", "warning");

        return;

    }

    usuarioActual.password = nueva;

    guardarUsuarios();

    document.getElementById("passwordActual").value = "";

    document.getElementById("passwordNueva").value = "";

    document.getElementById("passwordRepetir").value = "";

    notificacion("Contraseña actualizada correctamente.");

}

/* ==========================================
   GUARDAR AJUSTES
========================================== */

function guardarTema(){

    configuracionSistema.tema.color =
        document.getElementById("colorPrincipal").value;

    configuracionSistema.tema.fondo =
        document.getElementById("colorFondo").value;

    configuracionSistema.tema.fuente =
        document.getElementById("tamFuente").value;

    configuracionSistema.tema.radio =
        document.getElementById("radio").value;

    configuracionSistema.tema.animaciones =
        document.getElementById("animaciones").checked;

    configuracionSistema.tema.sombras =
        document.getElementById("sombras").checked;

    guardarConfiguracion();

    aplicarTema();

    notificacion("Tema actualizado.", "success");

}

function guardarDashboardConfig(){

    configuracionSistema.dashboard.mostrarUltimasVentas =
        document.getElementById("chkVentas").checked;

    configuracionSistema.dashboard.mostrarStock =
        document.getElementById("chkStock").checked;

    configuracionSistema.dashboard.cantidadVentas =
        parseInt(document.getElementById("cantVentas").value) || 5;

    guardarConfiguracion();

    notificacion("Dashboard actualizado.", "success");

}

function guardarInventario(){

    configuracionSistema.inventario.stockMinimo =
        parseInt(document.getElementById("stockMinimo").value) || 5;

    configuracionSistema.inventario.alertas =
        document.getElementById("alertasStock").checked;

    guardarConfiguracion();

    notificacion("Configuración guardada.", "success");

}

function guardarVentasConfig(){

    configuracionSistema.ventas.confirmarEliminar =
        document.getElementById("confirmarEliminar").checked;

    configuracionSistema.ventas.ventaRapida =
        document.getElementById("ventaRapida").checked;

    configuracionSistema.ventas.sonidoVenta =
        document.getElementById("sonidoVenta").checked;

    guardarConfiguracion();

    notificacion("Configuración guardada.", "success");

}

/* ==========================================
   EXPORTAR / IMPORTAR
========================================== */

function exportarDatos(){

    const datos = {

        productos,

        historialVentas,

        clientes,

        gastos,

        proveedores,

        usuarios,

        configuracionSistema

    };

    const blob = new Blob(

        [JSON.stringify(datos, null, 2)],

        { type: "application/json" }

    );

    const a = document.createElement("a");

    a.href = URL.createObjectURL(blob);

    a.download = "Backup_Forralitas.json";

    a.click();

    notificacion("Backup exportado correctamente.", "success");

}

function importarDatos(){

    const input = document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = e =>{

        const archivo = e.target.files[0];

        if(!archivo) return;

        const lector = new FileReader();

        lector.onload = function(){

            try{

                const datos = JSON.parse(lector.result);

                if(datos.productos) productos = datos.productos;

                if(datos.historialVentas) historialVentas = datos.historialVentas;

                if(datos.clientes) clientes = datos.clientes;

                if(datos.gastos) gastos = datos.gastos;

                if(datos.proveedores) proveedores = datos.proveedores;

                if(datos.usuarios) usuarios = datos.usuarios;

                if(datos.configuracionSistema)
                    configuracionSistema = datos.configuracionSistema;

                guardarDatos();

                guardarUsuarios();

                guardarConfiguracion();

                aplicarTema();

                notificacion("Datos importados correctamente.", "success");

            }catch{

                notificacion("Archivo inválido.", "error");

            }

        };

        lector.readAsText(archivo);

    };

    input.click();

}

/* ==========================================
   RESTABLECER
========================================== */

function restablecerConfiguracion(){

    confirmar("¿Restablecer toda la configuración?", ()=>{

        configuracionSistema = JSON.parse(JSON.stringify(CONFIG_DEFAULT));

        guardarConfiguracion();

        aplicarTema();

        renderConfiguracion();

        notificacion("Configuración restablecida.", "success");

    });

}

/* ==========================================
   OPTIMIZAR
========================================== */

function optimizarSistema(){

    let total = 0;

    total += productos.length;

    total += historialVentas.length;

    total += clientes.length;

    total += gastos.length;

    total += proveedores.length;

    total += usuarios.length;

    guardarDatos();

    guardarUsuarios();

    guardarConfiguracion();

    notificacion(

        "Optimización finalizada. Registros analizados: " + total,

        "success"

    );

}

/* ==========================================
   INICIALIZAR TEMA
========================================== */

window.addEventListener("load", ()=>{

    aplicarTema();

});
