/* ==========================================
   EFECTOS DEL CURSOR
   ------------------------------------------
   Solo los BOTONES reaccionan al mouse:
   - Se atraen un poco hacia el cursor.
   - Hacen una onda al hacer clic.
   Tarjetas, tablas y filas no se mueven nunca.
   Se controla desde Configuración > Apariencia
   (clase del body: efectos-off / efectos-suave / efectos-intenso).
   Solo corre con mouse de precisión.
========================================== */

(function(){

    if(!window.matchMedia("(pointer: fine)").matches) return;

    const SELECTOR_BOTON = [
        ".btnGuardar", ".btnAgregar", ".btnBuscar", ".btnHoy", ".btnTodas",
        ".btnCancelar", ".btnEliminar", ".btnAccion", ".configTab",
        ".sidebar button", ".paletaOpcion"
    ].join(", ");

    let botonActivo = null;
    let eventoPendiente = null;
    let frameProgramado = false;

    function nivel(){

        const b = document.body.classList;

        if(b.contains("efectos-off")) return "off";

        return b.contains("efectos-intenso") ? "intenso" : "suave";

    }

    function quitarAtraccion(){

        if(!botonActivo) return;

        botonActivo.removeAttribute("data-magnet");
        botonActivo.style.removeProperty("--magX");
        botonActivo.style.removeProperty("--magY");

        botonActivo = null;

    }

    // El botón se corre un poquito hacia el cursor, nunca más de unos píxeles.
    function aplicarAtraccion(el, e, n){

        const r = el.getBoundingClientRect();

        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);

        // Solo cuando el cursor está encima o muy cerca del botón.
        if(Math.abs(dx) > r.width / 2 + 16 || Math.abs(dy) > r.height / 2 + 16){

            quitarAtraccion();
            return;

        }

        const fuerza = n === "intenso" ? .16 : .08;
        const tope = n === "intenso" ? 6 : 3;

        const limitar = v => Math.max(-tope, Math.min(tope, v));

        el.setAttribute("data-magnet", "");
        el.style.setProperty("--magX", limitar(dx * fuerza).toFixed(1) + "px");
        el.style.setProperty("--magY", limitar(dy * fuerza).toFixed(1) + "px");

    }

    function procesar(){

        frameProgramado = false;

        const n = nivel();

        if(n === "off"){

            quitarAtraccion();
            return;

        }

        const el = eventoPendiente.target instanceof Element ? eventoPendiente.target : null;

        const boton = el ? el.closest(SELECTOR_BOTON) : null;

        if(boton !== botonActivo){

            quitarAtraccion();

            if(boton) botonActivo = boton;

        }

        if(boton) aplicarAtraccion(boton, eventoPendiente, n);

    }

    function alMoverMouse(e){

        if(e.pointerType !== "mouse") return;

        eventoPendiente = e;

        if(!frameProgramado){

            frameProgramado = true;
            requestAnimationFrame(procesar);

        }

    }

    function alPresionar(e){

        if(nivel() === "off") return;

        const boton = e.target instanceof Element ? e.target.closest("button") : null;

        if(!boton || boton.disabled) return;

        const r = boton.getBoundingClientRect();

        const onda = document.createElement("span");

        onda.className = "efectoRipple";
        onda.style.left = (e.clientX - r.left) + "px";
        onda.style.top = (e.clientY - r.top) + "px";

        boton.appendChild(onda);

        setTimeout(() => onda.remove(), 700);

    }

    function iniciar(){

        document.addEventListener("pointermove", alMoverMouse, { passive: true });
        document.addEventListener("pointerdown", alPresionar);

        document.documentElement.addEventListener("pointerleave", quitarAtraccion);

    }

    if(document.body){

        iniciar();

    }else{

        document.addEventListener("DOMContentLoaded", iniciar);

    }

})();
