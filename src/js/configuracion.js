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

    document.getElementById("guardarDashboard").onclick = guardarDashboardConfig;

    document.getElementById("guardarInventario").onclick = guardarInventario;

    document.getElementById("guardarVentas").onclick = guardarVentasConfig;

    document.getElementById("btnExportarDatos").onclick = exportarDatos;

    document.getElementById("btnImportarDatos").onclick = importarDatos;

    document.getElementById("btnOptimizarSistema").onclick = optimizarSistema;

    document.getElementById("btnRestablecerConfiguracion").onclick = restablecerConfiguracion;

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
