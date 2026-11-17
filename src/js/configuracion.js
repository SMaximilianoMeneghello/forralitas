/* ==========================================
   CONFIGURACIÓN
========================================== */

const CONFIG_DEFAULT = {

    negocio:{
        nombre:"FORRALITAS",
        direccion:"",
        telefono:"",
        cuit:"",
        pieTicket:"¡Gracias por su compra!"
    },

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
        cantidadVentas:5
    },

    ventas:{
        confirmarEliminar:true,
        confirmarVenta:false,
        sonidoVenta:true,
        imprimirAlVender:false,
        avisoGalpon:true
    },

    inventario:{
        stockMinimo:5,
        alertas:true
    },

    // Lo que pueden hacer los empleados (ver PERMISOS_EMPLEADO en auth.js).
    permisos:{},

    // Ajustes de datos ya aplicados (ver migrarDatos en app.js).
    migraciones:{}

};

let configuracionSistema = JSON.parse(JSON.stringify(CONFIG_DEFAULT));

try{

    // Se usa la última configuración guardada para pintar la app con
    // sus colores desde el primer instante.
    const previa = JSON.parse(localStorage.getItem("configuracionSistema"));

    if(previa && typeof previa === "object") configuracionSistema = previa;

}catch(e){ /* nada */ }

/* Completa la configuración con los valores por defecto de las
   opciones que todavía no existían cuando se guardó. */
function completarConfiguracion(){

    const completar = (destino, defecto) =>{

        Object.keys(defecto).forEach(k =>{

            const esGrupo = defecto[k] !== null && typeof defecto[k] === "object" && !Array.isArray(defecto[k]);

            if(esGrupo){

                if(!destino[k] || typeof destino[k] !== "object") destino[k] = {};

                completar(destino[k], defecto[k]);

            }else if(destino[k] === undefined){

                destino[k] = defecto[k];

            }

        });

    };

    if(!configuracionSistema || typeof configuracionSistema !== "object") configuracionSistema = {};

    completar(configuracionSistema, CONFIG_DEFAULT);

}

completarConfiguracion();

function guardarConfiguracion(){

    guardarDatos("configuracionSistema");

}

function aplicarTema(){

    const tema = configuracionSistema.tema;

    const raiz = document.documentElement.style;

    raiz.setProperty("--color-principal", tema.color);
    raiz.setProperty("--color-primario", tema.color);
    raiz.setProperty("--verde", tema.color);
    raiz.setProperty("--radio", tema.radio + "px");

    if(document.body){

        document.body.style.background = tema.fondo;

        document.body.classList.toggle("sinSombras", !tema.sombras);

        document.body.classList.toggle("sinAnimaciones", !tema.animaciones);

    }

    document.documentElement.style.fontSize = tema.fuente + "px";

}

/* Nombre del negocio en el menú, el login y el título de la ventana. */
function aplicarDatosNegocio(){

    const nombre = (configuracionSistema.negocio.nombre || "").trim() || "Mi negocio";

    document.querySelectorAll(".nombreNegocio").forEach(el =>{ el.textContent = nombre; });

    document.title = nombre;

}

/* ==========================================
   TAMAÑO DE TARJETAS
   (preferencia local de esta computadora,
   no se sincroniza a propósito)
========================================== */

function escalaTarjetasActual(){

    return localStorage.getItem("escalaTarjetas") || "normal";

}

function aplicarEscalaTarjetas(){

    const escala = escalaTarjetasActual();

    if(!document.body) return;

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

/* ==========================================
   RENDER CONFIGURACIÓN
========================================== */

function marcado(valor){

    return valor ? "checked" : "";

}

function renderConfiguracion(){

    const cfg = configuracionSistema;

    const admin = esAdmin();

    const seccionesAdmin = !admin ? "" : `

    <div class="cardConfig" style="grid-column:1/-1">

    <h2>🏪 Datos del negocio</h2>

    <p class="ayudaConfig">Aparecen en el menú, en la pantalla de ingreso y en los comprobantes impresos.</p>

    <div class="filaConfig">
        <div><label>Nombre del negocio</label><input id="negocioNombre" type="text" value="${esc(cfg.negocio.nombre)}"></div>
        <div><label>Dirección</label><input id="negocioDireccion" type="text" value="${esc(cfg.negocio.direccion)}"></div>
        <div><label>Teléfono</label><input id="negocioTelefono" type="text" value="${esc(cfg.negocio.telefono)}"></div>
        <div><label>CUIT (opcional)</label><input id="negocioCuit" type="text" value="${esc(cfg.negocio.cuit)}"></div>
    </div>

    <label>Texto al pie del comprobante</label>
    <input id="negocioPie" type="text" value="${esc(cfg.negocio.pieTicket)}">

    <button class="btnGuardar" id="guardarNegocio">Guardar datos del negocio</button>

    </div>

    <div class="cardConfig" style="grid-column:1/-1">

    <h2>👥 Usuarios</h2>

    <p class="ayudaConfig">
        Creá una cuenta para cada persona. Cada uno ve en Caja solo lo que cargó
        (salvo que le des permiso para ver todo).
    </p>

    <button class="btnAgregar" id="btnNuevoUsuarioAdmin" style="margin-bottom:14px">+ Nuevo usuario</button>

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

    <div class="cardConfig">

    <h2>🔑 Permisos de los empleados</h2>

    <p class="ayudaConfig">El administrador siempre puede hacer todo. Marcá lo que pueden hacer los empleados.</p>

    ${PERMISOS_EMPLEADO.map(p => `
        <label>
            <input type="checkbox" class="chkPermiso" data-permiso="${p.clave}"
                ${marcado(cfg.permisos[p.clave] !== undefined ? cfg.permisos[p.clave] : p.defecto)}>
            ${esc(p.texto)}
        </label>
    `).join("")}

    <button class="btnGuardar" id="guardarPermisos">Guardar permisos</button>

    </div>

    <div class="cardConfig">

    <h2>💰 Ventas</h2>

    <label><input id="confirmarVenta" type="checkbox" ${marcado(cfg.ventas.confirmarVenta)}> Pedir confirmación antes de registrar una venta</label>

    <label><input id="confirmarEliminar" type="checkbox" ${marcado(cfg.ventas.confirmarEliminar)}> Pedir confirmación al quitar un producto de la venta</label>

    <label><input id="sonidoVenta" type="checkbox" ${marcado(cfg.ventas.sonidoVenta)}> Sonido al registrar la venta</label>

    <label><input id="imprimirAlVender" type="checkbox" ${marcado(cfg.ventas.imprimirAlVender)}> Imprimir el comprobante al registrar la venta</label>

    <label><input id="avisoGalpon" type="checkbox" ${marcado(cfg.ventas.avisoGalpon)}> Avisar cada venta a la pantalla del galpón</label>

    <button class="btnGuardar" id="guardarVentas">Guardar Ventas</button>

    </div>

    <div class="cardConfig">

    <h2>📦 Inventario</h2>

    <label>Stock mínimo para los productos que no tienen uno propio</label>

    <input id="stockMinimo" type="text" inputmode="numeric" autocomplete="off" oninput="limpiarNumero(this)" value="${esc(cfg.inventario.stockMinimo)}">

    <label><input id="alertasStock" type="checkbox" ${marcado(cfg.inventario.alertas)}> Avisar cuando un producto queda con poco stock al venderlo</label>

    <button class="btnGuardar" id="guardarInventario">Guardar Inventario</button>

    </div>

    <div class="cardConfig">

    <h2>📊 Dashboard</h2>

    <label><input id="chkVentas" type="checkbox" ${marcado(cfg.dashboard.mostrarUltimasVentas)}> Mostrar últimas ventas</label>

    <label><input id="chkStock" type="checkbox" ${marcado(cfg.dashboard.mostrarStock)}> Mostrar productos con poco stock</label>

    <label>Cantidad de últimas ventas</label>

    <input id="cantVentas" type="text" inputmode="numeric" autocomplete="off" oninput="limpiarNumero(this)" value="${esc(cfg.dashboard.cantidadVentas)}">

    <button class="btnGuardar" id="guardarDashboard">Guardar Dashboard</button>

    </div>

    <div class="cardConfig">

    <h2>🎨 Apariencia</h2>

    <label>Color principal</label>
    <input id="colorPrincipal" type="color" value="${esc(cfg.tema.color)}">

    <label>Color de fondo</label>
    <input id="colorFondo" type="color" value="${esc(cfg.tema.fondo)}">

    <label>Tamaño letra</label>
    <input id="tamFuente" type="range" min="12" max="22" value="${esc(cfg.tema.fuente)}">

    <label>Radio Bordes</label>
    <input id="radio" type="range" min="6" max="35" value="${esc(cfg.tema.radio)}">

    <label><input id="animaciones" type="checkbox" ${marcado(cfg.tema.animaciones)}> Animaciones</label>

    <label><input id="sombras" type="checkbox" ${marcado(cfg.tema.sombras)}> Sombras</label>

    <button class="btnGuardar" id="guardarTema">Guardar Apariencia</button>

    </div>

    <div class="cardConfig">

    <h2>💾 Copia de seguridad</h2>

    <p class="ayudaConfig">
        Guardá cada tanto una copia de TODOS los datos en un archivo
        (por ejemplo en un pendrive). Con "Importar" se puede volver a esa copia.
    </p>

    <button class="btnGuardar" id="btnExportarDatos">⬇ Exportar copia de seguridad</button>

    <button class="btnSecundario" id="btnImportarDatos">⬆ Importar copia de seguridad</button>

    <button class="btnSecundario" id="btnRestablecerConfiguracion">Restablecer apariencia y opciones</button>

    </div>

    <div class="cardConfig">

    <h2>☁ Sincronización</h2>

    <p id="detalleSync" class="ayudaConfig"></p>

    <button class="btnGuardar" id="btnSincronizarAhora">Sincronizar ahora</button>

    </div>

    ${htmlCuentaNegocio()}

    `;

    contenido().innerHTML = `

    <div class="configuracion">

    <div class="cardConfig">

    <h2>👤 Mi Cuenta</h2>

    <p><b>Nombre:</b> ${esc(usuarioActual.nombre)}</p>

    <p><b>Usuario:</b> ${esc(usuarioActual.usuario)}</p>

    <p><b>Rol:</b> ${admin ? "Administrador" : "Empleado"}</p>

    </div>

    <div class="cardConfig">

    <h2>🔐 Contraseña</h2>

    <div class="grupoInput">
    <label>Actual</label>
    <input id="passwordActual" type="password" autocomplete="current-password">
    </div>

    <div class="grupoInput">
    <label>Nueva</label>
    <input id="passwordNueva" type="password" autocomplete="new-password">
    </div>

    <div class="grupoInput">
    <label>Repetir</label>
    <input id="passwordRepetir" type="password" autocomplete="new-password">
    </div>

    <button class="btnGuardar" id="btnCambiarPassword">Guardar contraseña</button>

    </div>

    <div class="cardConfig">

    <h2>🗂️ Tamaño de tarjetas</h2>

    <p class="ayudaConfig">
        Es una preferencia de esta computadora: cada PC puede elegir
        la suya sin afectar a las demás.
    </p>

    <label>Tamaño</label>

    <select id="escalaTarjetas">
        <option value="normal" ${escalaTarjetasActual() === "normal" ? "selected" : ""}>Normal</option>
        <option value="chicas" ${escalaTarjetasActual() === "chicas" ? "selected" : ""}>Compactas (entran más por fila)</option>
        <option value="grandes" ${escalaTarjetasActual() === "grandes" ? "selected" : ""}>Grandes (más fáciles de leer)</option>
    </select>

    <button class="btnGuardar" id="guardarEscalaTarjetas">Guardar Tamaño</button>

    </div>

    ${seccionesAdmin}

    </div>

    `;

    const enlazar = (id, fn) =>{

        const el = document.getElementById(id);

        if(el) el.onclick = fn;

    };

    enlazar("btnCambiarPassword", cambiarPassword);
    enlazar("guardarEscalaTarjetas", guardarEscalaTarjetas);

    if(!admin) return;

    enlazar("guardarNegocio", guardarNegocio);
    enlazar("btnNuevoUsuarioAdmin", abrirModalNuevoUsuarioAdmin);
    enlazar("guardarPermisos", guardarPermisos);
    enlazar("guardarVentas", guardarVentasConfig);
    enlazar("guardarInventario", guardarInventario);
    enlazar("guardarDashboard", guardarDashboardConfig);
    enlazar("guardarTema", guardarTema);
    enlazar("btnExportarDatos", exportarDatos);
    enlazar("btnImportarDatos", importarDatos);
    enlazar("btnRestablecerConfiguracion", restablecerConfiguracion);
    enlazar("btnSincronizarAhora", sincronizarAhoraManual);
    enlazar("btnMigrarACuenta", migrarACuenta);
    enlazar("btnDesvincularPC", desvincularPC);

    actualizarTablaUsuariosAdmin();

    actualizarDetalleSync();

}

/* ==========================================
   DATOS DEL NEGOCIO / PERMISOS
========================================== */

function guardarNegocio(){

    if(!soloAdmin()) return;

    const nombre = document.getElementById("negocioNombre").value.trim();

    if(!nombre){

        notificacion("El nombre del negocio no puede quedar vacío.", "warning");

        return;

    }

    const n = configuracionSistema.negocio;

    n.nombre = nombre;
    n.direccion = document.getElementById("negocioDireccion").value.trim();
    n.telefono = document.getElementById("negocioTelefono").value.trim();
    n.cuit = document.getElementById("negocioCuit").value.trim();
    n.pieTicket = document.getElementById("negocioPie").value.trim();

    guardarConfiguracion();

    aplicarDatosNegocio();

    notificacion("Datos del negocio guardados.");

}

function guardarPermisos(){

    if(!soloAdmin()) return;

    document.querySelectorAll(".chkPermiso").forEach(chk =>{

        configuracionSistema.permisos[chk.dataset.permiso] = chk.checked;

    });

    guardarConfiguracion();

    notificacion("Permisos guardados.");

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
                <td>${esc(u.nombre)}</td>
                <td>${esc(u.usuario)}</td>
                <td>
                    ${u.rol === "admin" ? "Administrador" : "Empleado"}
                    ${u.ocultarEliminaciones ? ` <small title="Sus eliminaciones no se anotan en el panel">(sin registro de eliminaciones)</small>` : ""}
                </td>
                <td class="accionesTabla">
                    <button
                        class="btnAccion btnEditar"
                        title="Editar"
                        onclick="editarUsuarioAdmin('${esc(u.usuario)}')">
                        ✏️
                    </button>
                    <button
                        class="btnAccion btnBorrar"
                        title="Eliminar"
                        onclick="eliminarUsuarioAdmin('${esc(u.usuario)}')">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join("");

}

function abrirModalNuevoUsuarioAdmin(){

    if(!soloAdmin()) return;

    usuarioAdminEditandoUsuario = null;

    document.getElementById("tituloModalUsuario").textContent = "Nuevo Usuario";

    limpiar("nombreUsuarioNuevo", "loginUsuarioNuevo", "passwordUsuarioNuevo");

    document.getElementById("loginUsuarioNuevo").disabled = false;

    document.getElementById("rolUsuarioNuevo").value = "empleado";

    document.getElementById("ocultarEliminacionesUsuario").checked = false;

    document.getElementById("grupoPasswordUsuarioNuevo").querySelector("label").textContent = "Contraseña";

    abrir("modalUsuario");

    setTimeout(()=> document.getElementById("nombreUsuarioNuevo").focus(), 100);

}

function editarUsuarioAdmin(loginUsuario){

    if(!soloAdmin()) return;

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

    document.getElementById("ocultarEliminacionesUsuario").checked = !!u.ocultarEliminaciones;

    abrir("modalUsuario");

}

function guardarUsuarioAdmin(){

    if(!soloAdmin()) return;

    const nombre = document.getElementById("nombreUsuarioNuevo").value.trim();

    const loginUsuario = normalizarLogin(document.getElementById("loginUsuarioNuevo").value);

    const password = document.getElementById("passwordUsuarioNuevo").value;

    const rol = document.getElementById("rolUsuarioNuevo").value;

    const ocultarEliminaciones = document.getElementById("ocultarEliminacionesUsuario").checked;

    if(!nombre || !loginUsuario){

        notificacion("Completá el nombre y el usuario.", "warning");

        return;

    }

    if(password && password.length < 6){

        notificacion("La contraseña debe tener al menos 6 caracteres.", "warning");

        return;

    }

    if(usuarioAdminEditandoUsuario){

        const u = usuarios.find(x => x.usuario === usuarioAdminEditandoUsuario);

        if(!u) return;

        const otrosAdmins = usuarios.filter(x => x.rol === "admin" && x !== u).length;

        if(u.rol === "admin" && rol !== "admin" && otrosAdmins === 0){

            notificacion("Tiene que quedar al menos un administrador.", "warning");

            return;

        }

        const nombreAnterior = u.nombre;

        u.nombre = nombre;
        u.rol = rol;
        u.ocultarEliminaciones = ocultarEliminaciones;

        if(password) asignarPassword(u, password);

        // La Caja separa por nombre del vendedor: si cambia el nombre,
        // lo que ya cargó sigue quedando a su nombre.
        if(nombreAnterior !== nombre) renombrarVendedor(u.usuario, nombre);

        notificacion("Usuario actualizado.");

    }else{

        if(!/^[a-z0-9._-]+$/.test(loginUsuario)){

            notificacion("El usuario solo puede tener letras, números, puntos y guiones (sin espacios).", "warning");

            return;

        }

        if(buscarUsuario(loginUsuario)){

            notificacion("Ya existe un usuario con ese nombre de acceso.", "warning");

            return;

        }

        if(!password){

            notificacion("Ingresá una contraseña para el usuario nuevo.", "warning");

            return;

        }

        const cuenta = { usuario: loginUsuario, nombre, rol, ocultarEliminaciones };

        asignarPassword(cuenta, password);

        usuarios.push(cuenta);

        notificacion("Usuario creado.");

    }

    guardarDatos("usuarios", "historialVentas", "gastos", "clientes");

    cerrar("modalUsuario");

    actualizarTablaUsuariosAdmin();

    mostrarUsuarioActual();

    aplicarPermisos();

    usuarioAdminEditandoUsuario = null;

}

function renombrarVendedor(login, nombreNuevo){

    const cambiar = (reg) =>{

        if(reg.vendedor && reg.vendedor.usuario === login) reg.vendedor.nombre = nombreNuevo;

    };

    historialVentas.forEach(cambiar);

    gastos.forEach(cambiar);

    clientes.forEach(c => (c.pagos || []).forEach(cambiar));

}

function eliminarUsuarioAdmin(loginUsuario){

    if(!soloAdmin()) return;

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

    const cuenta = buscarUsuario(usuarioActual.usuario);

    if(!cuenta || !passwordCorrecta(cuenta, actual)){

        notificacion("La contraseña actual es incorrecta.", "error");

        return;

    }

    if(nueva.length < 6){

        notificacion("La nueva contraseña debe tener al menos 6 caracteres.", "warning");

        return;

    }

    if(nueva !== repetir){

        notificacion("Las contraseñas nuevas no coinciden.", "warning");

        return;

    }

    asignarPassword(cuenta, nueva);

    usuarioActual = cuenta;

    guardarUsuarios();

    limpiar("passwordActual", "passwordNueva", "passwordRepetir");

    notificacion("Contraseña actualizada correctamente.");

}

/* ==========================================
   GUARDAR AJUSTES
========================================== */

function guardarTema(){

    if(!soloAdmin()) return;

    const tema = configuracionSistema.tema;

    tema.color = document.getElementById("colorPrincipal").value;
    tema.fondo = document.getElementById("colorFondo").value;
    tema.fuente = document.getElementById("tamFuente").value;
    tema.radio = document.getElementById("radio").value;
    tema.animaciones = document.getElementById("animaciones").checked;
    tema.sombras = document.getElementById("sombras").checked;

    guardarConfiguracion();

    aplicarTema();

    notificacion("Tema actualizado.", "success");

}

function guardarDashboardConfig(){

    if(!soloAdmin()) return;

    const d = configuracionSistema.dashboard;

    d.mostrarUltimasVentas = document.getElementById("chkVentas").checked;
    d.mostrarStock = document.getElementById("chkStock").checked;
    d.cantidadVentas = Math.min(50, Math.max(1, parseInt(document.getElementById("cantVentas").value) || 5));

    guardarConfiguracion();

    notificacion("Dashboard actualizado.", "success");

}

function guardarInventario(){

    if(!soloAdmin()) return;

    const valor = parseInt(document.getElementById("stockMinimo").value);

    configuracionSistema.inventario.stockMinimo = isNaN(valor) ? 5 : valor;

    configuracionSistema.inventario.alertas = document.getElementById("alertasStock").checked;

    guardarConfiguracion();

    notificacion("Configuración guardada.", "success");

}

function guardarVentasConfig(){

    if(!soloAdmin()) return;

    const v = configuracionSistema.ventas;

    v.confirmarVenta = document.getElementById("confirmarVenta").checked;
    v.confirmarEliminar = document.getElementById("confirmarEliminar").checked;
    v.sonidoVenta = document.getElementById("sonidoVenta").checked;
    v.imprimirAlVender = document.getElementById("imprimirAlVender").checked;
    v.avisoGalpon = document.getElementById("avisoGalpon").checked;

    guardarConfiguracion();

    notificacion("Configuración guardada.", "success");

}

/* ==========================================
   COPIA DE SEGURIDAD (EXPORTAR / IMPORTAR)
========================================== */

const TABLAS_RESPALDO = [
    "productos", "clientes", "proveedores", "gastos", "historialVentas",
    "eliminaciones", "mezclas", "carpetasNotas", "usuarios", "preciosClientes",
    "configuracionSistema"
];

function exportarDatos(){

    if(!soloAdmin()) return;

    const datos = {
        formato: "respaldo-gestion",
        version: 2,
        fecha: new Date().toISOString(),
        negocio: configuracionSistema.negocio.nombre
    };

    ENTIDADES_SINCRONIZADAS.forEach(ent =>{ datos[ent.nombre] = ent.obtener(); });

    const nombre = "Respaldo_"
        + (configuracionSistema.negocio.nombre || "negocio").replace(/[^a-zA-Z0-9]+/g, "_")
        + "_" + fechaLocalISO(new Date()) + ".json";

    descargarArchivo(nombre, JSON.stringify(datos), "application/json");

    notificacion("Copia de seguridad exportada.", "success");

}

function importarDatos(){

    if(!soloAdmin()) return;

    const input = document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = e =>{

        const archivo = e.target.files[0];

        if(!archivo) return;

        const lector = new FileReader();

        lector.onload = function(){

            let datos;

            try{

                datos = JSON.parse(lector.result);

            }catch(err){

                notificacion("El archivo no es una copia de seguridad válida.", "error");

                return;

            }

            const presentes = TABLAS_RESPALDO.filter(t =>
                t === "configuracionSistema"
                    ? (datos[t] && typeof datos[t] === "object")
                    : Array.isArray(datos[t])
            );

            if(presentes.length === 0){

                notificacion("El archivo no es una copia de seguridad válida.", "error");

                return;

            }

            if(Array.isArray(datos.usuarios) && !datos.usuarios.some(u => u.rol === "admin")){

                notificacion("Esa copia no tiene ningún usuario administrador: no se puede importar.", "error");

                return;

            }

            confirmar(
                "Se van a REEMPLAZAR los datos actuales por los de la copia"
                + (datos.fecha ? " del " + fechaHoraTexto(datos.fecha) : "")
                + " (" + presentes.length + " tablas). Lo cargado después de esa copia se pierde. ¿Continuar?",
                ()=>{

                    ENTIDADES_SINCRONIZADAS.forEach(ent =>{

                        if(!presentes.includes(ent.nombre)) return;

                        let valor = JSON.parse(JSON.stringify(datos[ent.nombre]));

                        if(ent.clave){

                            valor = SyncNucleo.normalizarClaves(valor, ent.clave, ent.prefijoId).lista;

                        }

                        ent.asignar(valor);

                    });

                    completarConfiguracion();

                    guardarDatos();

                    aplicarTema();

                    aplicarDatosNegocio();

                    revincularReferencias();

                    if(usuarioActual){

                        aplicarPermisos();

                        mostrarUsuarioActual();

                        renderConfiguracion();

                    }

                    notificacion("Copia de seguridad importada correctamente.", "success");

                }
            );

        };

        lector.readAsText(archivo);

    };

    input.click();

}

function restablecerConfiguracion(){

    if(!soloAdmin()) return;

    confirmar("¿Restablecer la apariencia y las opciones de ventas, inventario y dashboard? (No toca los datos del negocio, los permisos ni la información cargada).", ()=>{

        ["tema", "dashboard", "ventas", "inventario"].forEach(grupo =>{

            configuracionSistema[grupo] = JSON.parse(JSON.stringify(CONFIG_DEFAULT[grupo]));

        });

        guardarConfiguracion();

        aplicarTema();

        renderConfiguracion();

        notificacion("Opciones restablecidas.", "success");

    });

}

/* ==========================================
   SINCRONIZACIÓN
========================================== */

function actualizarDetalleSync(){

    const el = document.getElementById("detalleSync");

    if(!el || !gestorSync) return;

    const e = gestorSync.estado();

    if(!e.nube){

        el.textContent = "Esta instalación guarda los datos solo en esta computadora.";

    }else if(e.sinPermiso){

        el.textContent = "La base de datos rechazó la conexión. Revisá la cuenta del negocio.";

    }else if(e.pendientes > 0){

        el.textContent = "Hay " + e.pendientes + " cambio(s) guardados en esta PC esperando para subir. "
            + "Se suben solos apenas haya conexión.";

    }else if(e.confirmadas < e.total){

        el.textContent = "Sin conexión con la nube: se está trabajando con los datos de esta PC.";

    }else{

        el.textContent = "Todo sincronizado con la nube.";

    }

}

async function sincronizarAhoraManual(){

    if(!gestorSync) return;

    await gestorSync.sincronizarAhora();

    actualizarDetalleSync();

    const e = gestorSync.estado();

    notificacion(
        e.pendientes > 0 ? "Todavía quedan cambios por subir (sin conexión)." : "Sincronización completa.",
        e.pendientes > 0 ? "warning" : "success"
    );

}

/* ==========================================
   CUENTA DEL NEGOCIO
   Con una cuenta (email y clave), los datos
   del negocio quedan protegidos: solo las PCs
   que ingresaron con esa cuenta pueden leerlos.
========================================== */

function htmlCuentaNegocio(){

    if(!hayNube() || !conexionActual) return "";

    if(conexionActual.modo === "cuenta"){

        return `
            <div class="cardConfig">
            <h2>🔒 Cuenta del negocio</h2>
            <p class="ayudaConfig">
                Esta PC está vinculada a la cuenta <b>${esc(conexionActual.email || "")}</b>.
                Los datos solo se pueden ver desde las computadoras que ingresaron con esa cuenta.
            </p>
            <button class="btnSecundario" id="btnDesvincularPC">Desvincular esta PC</button>
            </div>
        `;

    }

    return `
        <div class="cardConfig">
        <h2>🔒 Proteger los datos con una cuenta</h2>
        <p class="ayudaConfig">
            Hoy esta instalación funciona sin cuenta. Si ya te crearon una cuenta para el negocio
            (email y clave), ingresala acá: se copian todos los datos a la cuenta y, desde ese
            momento, cada PC del negocio va a tener que ingresar con ella una sola vez.
        </p>
        <label>Email de la cuenta</label>
        <input id="migrarEmail" type="text" autocomplete="off">
        <label>Clave de la cuenta</label>
        <input id="migrarClave" type="password" autocomplete="off">
        <button class="btnGuardar" id="btnMigrarACuenta">Pasar a cuenta</button>
        </div>
    `;

}

async function migrarACuenta(){

    if(!soloAdmin()) return;

    const email = document.getElementById("migrarEmail").value.trim();
    const clave = document.getElementById("migrarClave").value;
    const boton = document.getElementById("btnMigrarACuenta");

    if(!email || !clave){

        notificacion("Completá el email y la clave de la cuenta.", "warning");

        return;

    }

    boton.disabled = true;

    try{

        const cuenta = await window.FirebaseDB.cuenta.ingresar(email, clave);

        const destino = window.FirebaseDB.adaptadorCuenta(cuenta.uid);

        const yaTiene = await destino.leer("usuarios");

        if(yaTiene && Array.isArray(yaTiene.datos) && yaTiene.datos.length > 0){

            await window.FirebaseDB.cuenta.salir();

            notificacion("Esa cuenta ya tiene datos de un negocio cargados. Usá una cuenta nueva.", "error");

            boton.disabled = false;

            return;

        }

        // Se sube primero todo lo pendiente del modo clásico.
        await gestorSync.sincronizarAhora();

        gestorSync.detener();

        // Copia local para la cuenta: al reiniciar, como la cuenta está
        // vacía, se sube todo completo.
        const prefijo = "n:" + cuenta.uid + ":";

        for(const ent of ENTIDADES_SINCRONIZADAS){

            await AlmacenLocal.guardarJson(ent.nombre, JSON.stringify(ent.obtener()), prefijo);

        }

        // Marca para que las demás PCs dejen de usar el modo sin cuenta y
        // pidan ingresar con la cuenta. Si no se puede dejar, no se sigue.
        await window.FirebaseDB.adaptadorClasico().escribir("_migrado", {
            datos: { fecha: new Date().toISOString() },
            actualizado: Date.now()
        });

        guardarConexion({ modo: "cuenta", uid: cuenta.uid, email: cuenta.email });

        location.reload();

    }catch(e){

        boton.disabled = false;

        console.error("[Cuenta] No se pudo pasar a cuenta:", e);

        // No se cambió nada: se vuelve a trabajar como antes.
        if(!leerConexion() || leerConexion().modo !== "cuenta"){

            try{ await window.FirebaseDB.cuenta.salir(); }catch(e2){ /* nada */ }

        }

        notificacion(
            e && e.code && String(e.code).indexOf("auth/") === 0
                ? textoErrorCuenta(e)
                : "No se pudo completar el pase a cuenta (" + ((e && (e.code || e.message)) || "error") + "). No se cambió nada: recargá el programa y probá de nuevo.",
            "error"
        );

    }

}

function desvincularPC(){

    if(!soloAdmin()) return;

    const pendientes = gestorSync ? gestorSync.estado().pendientes : 0;

    if(pendientes > 0){

        notificacion("Hay cambios sin subir. Esperá a que se sincronicen antes de desvincular esta PC.", "warning");

        return;

    }

    confirmar(
        "¿Desvincular esta PC de la cuenta del negocio? Para volver a usar el programa acá va a haber que ingresar otra vez el email y la clave del negocio.",
        async ()=>{

            if(gestorSync) gestorSync.detener();

            try{ await window.FirebaseDB.cuenta.salir(); }catch(e){ /* nada */ }

            guardarConexion(null);

            localStorage.removeItem("sesionActual");

            location.reload();

        }
    );

}

/* ==========================================
   INICIALIZAR TEMA
========================================== */

aplicarTema();

aplicarEscalaTarjetas();

window.addEventListener("load", ()=>{

    aplicarTema();

    aplicarEscalaTarjetas();

    aplicarDatosNegocio();

});
