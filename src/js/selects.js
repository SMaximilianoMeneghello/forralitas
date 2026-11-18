/* ==========================================
   LISTAS DESPLEGABLES MODERNAS
   ------------------------------------------
   Reemplaza los <select> nativos por un menú con
   el estilo de la app y los colores del tema.
   El select original queda oculto y sigue siendo la
   fuente de verdad: el resto de la app lee y escribe
   .value igual que antes. Sirve también para los
   selects que se crean al vuelo (filas de mezclas, etc.).
========================================== */

(function(){

    // Valor nativo del select, para leer/escribir sin pasar por nuestra intercepción.
    const valorNativo = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");

    let popover = null;
    let selectActivo = null;
    let botonActivo = null;
    let indiceResaltado = -1;

    function opcionesDe(select){

        return Array.from(select.options);

    }

    function textoSeleccionado(select){

        const op = select.options[select.selectedIndex];

        return op ? op.textContent.trim() : "";

    }

    function actualizarTexto(select){

        const boton = select._selectBoton;

        if(!boton) return;

        const texto = textoSeleccionado(select);

        boton.querySelector(".selectTexto").textContent = texto || "Seleccioná";
        boton.classList.toggle("selectVacio", !texto);
        boton.disabled = select.disabled;

    }

    function mejorar(select){

        if(select.dataset.select || select.multiple) return;

        select.dataset.select = "1";

        const wrap = document.createElement("div");
        wrap.className = "selectPersonal";

        select.parentNode.insertBefore(wrap, select);
        wrap.appendChild(select);

        select.classList.add("selectOculto");
        select.tabIndex = -1;

        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "selectBoton";
        boton.setAttribute("aria-haspopup", "listbox");
        boton.innerHTML = '<span class="selectTexto"></span><span class="selectFlecha" aria-hidden="true"></span>';
        wrap.appendChild(boton);

        select._selectBoton = boton;

        // Cuando el código cambia .value, el botón muestra la opción nueva.
        Object.defineProperty(select, "value", {
            configurable: true,
            get(){ return valorNativo.get.call(this); },
            set(v){
                valorNativo.set.call(this, v);
                actualizarTexto(this);
            }
        });

        boton.addEventListener("click", e =>{
            e.stopPropagation();
            abrir(select, boton);
        });

        boton.addEventListener("keydown", e => teclado(e, select, boton));

        actualizarTexto(select);

    }

    /* ---------- Menú ---------- */

    function crearPopover(){

        popover = document.createElement("div");
        popover.className = "selectPop";
        popover.setAttribute("role", "listbox");

        popover.addEventListener("click", e =>{

            const item = e.target.closest("[data-indice]");

            if(item) elegir(Number(item.dataset.indice));

        });

        document.body.appendChild(popover);

    }

    function dibujar(){

        const opciones = opcionesDe(selectActivo);

        popover.innerHTML = opciones.length
            ? opciones.map((op, i) => `
                <button type="button"
                    class="selectOpcion${i === selectActivo.selectedIndex ? " selectOpcionActiva" : ""}${i === indiceResaltado ? " selectOpcionResaltada" : ""}"
                    data-indice="${i}"
                    role="option"
                    aria-selected="${i === selectActivo.selectedIndex}"
                    ${op.disabled ? "disabled" : ""}>
                    <span>${op.textContent.trim()}</span>
                    <span class="selectMarca" aria-hidden="true">✓</span>
                </button>
            `).join("")
            : '<p class="selectVacioMenu">No hay opciones</p>';

    }

    function posicionar(boton){

        const r = boton.getBoundingClientRect();
        const ancho = Math.max(r.width, 180);
        const alto = popover.offsetHeight;
        const margen = 10;

        popover.style.width = ancho + "px";

        let left = r.left;
        if(left + ancho > window.innerWidth - margen) left = window.innerWidth - ancho - margen;
        if(left < margen) left = margen;

        let top = r.bottom + 6;
        if(top + alto > window.innerHeight - margen) top = r.top - alto - 6;
        if(top < margen) top = margen;

        popover.style.left = left + "px";
        popover.style.top = top + "px";

    }

    function abrir(select, boton){

        if(selectActivo === select && popover && popover.classList.contains("visible")){
            cerrar();
            return;
        }

        if(!popover) crearPopover();

        selectActivo = select;
        botonActivo = boton;
        indiceResaltado = select.selectedIndex;

        dibujar();

        boton.setAttribute("aria-expanded", "true");
        popover.classList.add("visible");

        posicionar(boton);

        const activa = popover.querySelector(".selectOpcionActiva");
        if(activa) activa.scrollIntoView({ block: "nearest" });

    }

    function cerrar(){

        if(botonActivo) botonActivo.setAttribute("aria-expanded", "false");

        if(popover) popover.classList.remove("visible");

        selectActivo = null;
        botonActivo = null;
        indiceResaltado = -1;

    }

    function elegir(indice){

        if(!selectActivo) return;

        const select = selectActivo;

        if(indice < 0 || indice >= select.options.length) return;

        valorNativo.set.call(select, select.options[indice].value);
        actualizarTexto(select);

        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));

        cerrar();

        const boton = select._selectBoton;
        if(boton) boton.focus();

    }

    // Teclado: flechas para moverse, Enter para elegir, Escape para cerrar.
    function teclado(e, select, boton){

        const abierto = selectActivo === select && popover && popover.classList.contains("visible");

        if(e.key === "ArrowDown" || e.key === "ArrowUp"){

            e.preventDefault();

            if(!abierto){

                abrir(select, boton);
                return;

            }

            const total = select.options.length;
            indiceResaltado = (indiceResaltado + (e.key === "ArrowDown" ? 1 : -1) + total) % total;
            dibujar();

            const resaltada = popover.querySelector(".selectOpcionResaltada");
            if(resaltada) resaltada.scrollIntoView({ block: "nearest" });

        }else if(e.key === "Enter" || e.key === " "){

            if(abierto && indiceResaltado >= 0){

                e.preventDefault();
                elegir(indiceResaltado);

            }

        }else if(e.key === "Escape"){

            cerrar();

        }

    }

    /* ---------- Eventos globales ---------- */

    document.addEventListener("mousedown", e =>{

        if(!popover || !popover.classList.contains("visible")) return;

        if(popover.contains(e.target)) return;
        if(e.target.closest && e.target.closest(".selectBoton")) return;

        cerrar();

    });

    document.addEventListener("keydown", e =>{

        if(e.key === "Escape") cerrar();

    });

    window.addEventListener("resize", () =>{

        if(popover && popover.classList.contains("visible") && botonActivo) posicionar(botonActivo);

    });

    /* ---------- Arranque y selects nuevos ---------- */

    function escanear(raiz){

        if(!raiz.querySelectorAll) return;

        raiz.querySelectorAll("select:not([data-select])").forEach(mejorar);

    }

    function iniciar(){

        escanear(document);

        new MutationObserver(mutaciones =>{

            mutaciones.forEach(m =>{

                // Si cambian las opciones de un select ya mejorado, se actualiza el texto.
                const select = m.target.tagName === "SELECT" ? m.target : (m.target.closest ? m.target.closest("select") : null);

                if(select && select._selectBoton) actualizarTexto(select);

                m.addedNodes.forEach(nodo =>{

                    if(nodo.nodeType !== 1) return;

                    if(nodo.matches && nodo.matches("select:not([data-select])")){

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
