/* ==========================================
   CALENDARIO PROPIO
   ------------------------------------------
   Reemplaza los campos de fecha nativos
   (input type="date") por un calendario con el
   estilo de la app y los colores del tema.
   El input original queda oculto y sigue siendo
   la fuente de verdad: el resto de la app lee y
   escribe .value igual que antes (formato AAAA-MM-DD).
========================================== */

(function(){

    const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    const DIAS_SEMANA = ["Lu","Ma","Mi","Ju","Vi","Sá","Do"];

    // Valor nativo del input, para leerlo/escribirlo sin pasar por nuestra intercepción.
    const valorNativo = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

    let popover = null;
    let campoActivo = null;
    let botonActivo = null;
    let mesVista = new Date();

    function pad(n){ return String(n).padStart(2, "0"); }

    function aISO(d){
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }

    function desdeISO(s){
        if(!s) return null;
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y, m - 1, d);
    }

    function textoFecha(s){
        const d = desdeISO(s);
        return d ? pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() : "";
    }

    function actualizarTexto(input){
        const boton = input._fechaBoton;
        if(!boton) return;
        const texto = textoFecha(input.value);
        boton.querySelector(".fechaTexto").textContent = texto || "Elegí una fecha";
        boton.classList.toggle("fechaVacia", !texto);
    }

    function mejorar(input){

        if(input.dataset.calendario) return;

        input.dataset.calendario = "1";

        const wrap = document.createElement("div");
        wrap.className = "fechaCalendario";

        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);

        input.classList.add("fechaOculta");
        input.tabIndex = -1;

        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "fechaBoton";
        boton.innerHTML = '<span class="fechaIcono">📅</span><span class="fechaTexto"></span>';
        wrap.appendChild(boton);

        input._fechaBoton = boton;

        // Cuando el código de la app cambia .value, el botón muestra la nueva fecha.
        Object.defineProperty(input, "value", {
            configurable: true,
            get(){ return valorNativo.get.call(this); },
            set(v){
                valorNativo.set.call(this, v);
                actualizarTexto(this);
            }
        });

        boton.disabled = input.disabled;

        boton.addEventListener("click", e =>{
            e.stopPropagation();
            abrir(input, boton);
        });

        actualizarTexto(input);

    }

    /* ---------- Popover ---------- */

    function crearPopover(){

        popover = document.createElement("div");
        popover.className = "calendarioPop";

        popover.addEventListener("click", e =>{

            const dia = e.target.closest("[data-iso]");
            const nav = e.target.closest("[data-mes]");
            const accion = e.target.closest("[data-accion]");

            if(dia){

                seleccionar(dia.dataset.iso);

            }else if(nav){

                mesVista = new Date(mesVista.getFullYear(), mesVista.getMonth() + Number(nav.dataset.mes), 1);
                dibujar();

            }else if(accion){

                const a = accion.dataset.accion;

                if(a === "hoy") seleccionar(aISO(new Date()));
                if(a === "limpiar") seleccionar("");
                if(a === "cerrar") cerrar();

            }

        });

        document.body.appendChild(popover);

    }

    function dibujar(){

        const seleccionada = campoActivo ? campoActivo.value : "";
        const hoy = aISO(new Date());

        const primero = new Date(mesVista.getFullYear(), mesVista.getMonth(), 1);
        const cantidad = new Date(mesVista.getFullYear(), mesVista.getMonth() + 1, 0).getDate();

        // La semana empieza en lunes.
        const desplazamiento = (primero.getDay() + 6) % 7;

        let celdas = "";

        for(let i = 0; i < desplazamiento; i++){
            celdas += '<span class="calVacio"></span>';
        }

        for(let dia = 1; dia <= cantidad; dia++){

            const d = new Date(mesVista.getFullYear(), mesVista.getMonth(), dia);
            const iso = aISO(d);

            const clases = ["calDia"];

            if(iso === hoy) clases.push("calHoy");
            if(iso === seleccionada) clases.push("calSel");

            celdas += '<button type="button" class="' + clases.join(" ") + '" data-iso="' + iso + '">' + dia + '</button>';

        }

        popover.innerHTML = `
            <div class="calCabecera">
                <button type="button" class="calNav" data-mes="-1" aria-label="Mes anterior">‹</button>
                <strong>${MESES[mesVista.getMonth()]} ${mesVista.getFullYear()}</strong>
                <button type="button" class="calNav" data-mes="1" aria-label="Mes siguiente">›</button>
            </div>
            <div class="calSemana">
                ${DIAS_SEMANA.map(d => "<span>" + d + "</span>").join("")}
            </div>
            <div class="calGrilla">${celdas}</div>
            <div class="calPie">
                <button type="button" class="calAccion" data-accion="limpiar">Limpiar</button>
                <button type="button" class="calAccion calAccionPrincipal" data-accion="hoy">Hoy</button>
            </div>
        `;

    }

    function posicionar(boton){

        const r = boton.getBoundingClientRect();
        const ancho = popover.offsetWidth;
        const alto = popover.offsetHeight;
        const margen = 10;

        let left = r.left;
        if(left + ancho > window.innerWidth - margen) left = window.innerWidth - ancho - margen;
        if(left < margen) left = margen;

        let top = r.bottom + 8;
        if(top + alto > window.innerHeight - margen) top = r.top - alto - 8;
        if(top < margen) top = margen;

        popover.style.left = left + "px";
        popover.style.top = top + "px";

    }

    function abrir(input, boton){

        if(campoActivo === input && popover && popover.classList.contains("visible")){
            cerrar();
            return;
        }

        if(!popover) crearPopover();

        campoActivo = input;
        botonActivo = boton;

        mesVista = desdeISO(input.value) || new Date();
        mesVista = new Date(mesVista.getFullYear(), mesVista.getMonth(), 1);

        dibujar();

        popover.classList.add("visible");
        posicionar(boton);

    }

    function cerrar(){

        if(popover) popover.classList.remove("visible");

        campoActivo = null;
        botonActivo = null;

    }

    function seleccionar(iso){

        if(!campoActivo) return;

        const input = campoActivo;

        valorNativo.set.call(input, iso);
        actualizarTexto(input);

        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));

        cerrar();

    }

    /* ---------- Eventos globales ---------- */

    document.addEventListener("mousedown", e =>{

        if(!popover || !popover.classList.contains("visible")) return;

        if(popover.contains(e.target)) return;
        if(e.target.closest && e.target.closest(".fechaBoton")) return;

        cerrar();

    });

    document.addEventListener("keydown", e =>{

        if(e.key === "Escape") cerrar();

    });

    // Si la pantalla se re-dibuja con el calendario abierto, se cierra.
    window.addEventListener("resize", () =>{

        if(popover && popover.classList.contains("visible") && botonActivo){

            posicionar(botonActivo);

        }

    });

    /* ---------- Arranque ---------- */

    function escanear(raiz){

        if(!raiz.querySelectorAll) return;

        raiz.querySelectorAll('input[type="date"]:not([data-calendario])').forEach(mejorar);

    }

    function iniciar(){

        escanear(document);

        new MutationObserver(mutaciones =>{

            mutaciones.forEach(m =>{

                m.addedNodes.forEach(nodo =>{

                    if(nodo.nodeType !== 1) return;

                    if(nodo.matches && nodo.matches('input[type="date"]')){

                        mejorar(nodo);

                    }else{

                        escanear(nodo);

                    }

                });

            });

        }).observe(document.body, { childList: true, subtree: true });

    }

    if(document.body){

        iniciar();

    }else{

        document.addEventListener("DOMContentLoaded", iniciar);

    }

})();
