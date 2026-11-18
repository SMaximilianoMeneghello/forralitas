# Cómo ofrecer el sistema a otros negocios

Desde la versión 1.1.0 el mismo programa (el mismo instalador y las
mismas actualizaciones automáticas) sirve para muchos negocios. Cada
negocio tiene una **cuenta** (un email y una clave) y sus datos quedan
en una carpeta propia de la base de datos, que ningún otro negocio
puede ver.

- El **email y la clave del negocio** se usan una sola vez por PC,
  para "vincularla" al negocio.
- Adentro, cada persona sigue teniendo su **usuario y contraseña**
  (administrador o empleado), como siempre.

Todo esto se configura una sola vez en la consola de Firebase
(https://console.firebase.google.com, proyecto `forralitas-3394f`).

---

## Parte 1 – Preparar Firebase (una sola vez)

1. **Activar el ingreso con email y clave**
   Consola de Firebase → *Authentication* → *Comenzar* → pestaña
   *Sign-in method* → *Correo electrónico/contraseña* → Habilitar →
   Guardar.

2. **Publicar las reglas de seguridad**
   Consola de Firebase → *Firestore Database* → pestaña *Reglas*.
   Borrá lo que haya, pegá el contenido completo del archivo
   `firestore.rules` de este proyecto y apretá *Publicar*.

   Con esas reglas, los negocios con cuenta ya quedan protegidos, y
   FORRALITAS sigue funcionando como hasta ahora (modo clásico) hasta
   que hagas la parte 2.

---

## Parte 2 – Pasar FORRALITAS a una cuenta (recomendado)

Hacelo con el negocio cerrado o en un momento sin ventas.

1. En la consola de Firebase → *Authentication* → *Users* →
   *Agregar usuario*: poné un email tuyo de verdad (sirve para
   recuperar la clave si te la olvidás) y una clave larga. Anotalos.
2. En una PC, entrá al programa como administrador →
   **Configuración → "Proteger los datos con una cuenta"** → escribí
   ese email y esa clave → *Pasar a cuenta*. El programa copia todos
   los datos a la cuenta y se reinicia.
3. En cada una de las otras PCs va a aparecer una pantalla pidiendo
   la cuenta del negocio: ingresá el mismo email y la misma clave
   (una sola vez por PC). Después cada persona entra con su usuario
   de siempre.
4. Cuando todas las PCs ya estén usando la cuenta, volvé a la consola
   → *Firestore Database* → *Reglas*, **borrá el bloque
   "MODO CLÁSICO"** (está indicado en el archivo) y publicá. A partir
   de ahí nadie puede leer los datos sin la cuenta.
5. (Opcional) En *Firestore Database* → *Datos* podés borrar la
   colección vieja `forralitasDatos`: ya no se usa.

**Pantalla del galpón:** si la usás, abrila agregando `?cuenta=1` al
final de la dirección (por ejemplo `index.html?cuenta=1`). La primera
vez pide el email y la clave del negocio.

---

## Parte 3 – Dar de alta un negocio nuevo

Por cada negocio al que le ofrezcas el sistema:

1. Consola de Firebase → *Authentication* → *Users* → *Agregar
   usuario*: un email y una clave para ese negocio.
2. Pasale al negocio:
   - el instalador (el mismo `.exe` de siempre),
   - el email y la clave de su cuenta.
3. Al abrir el programa por primera vez en una PC nueva aparece
   "Vincular esta PC": ponen el email y la clave del negocio.
4. Como el negocio está vacío, el programa les pide **crear el
   administrador** y el nombre del negocio. Desde ahí cargan sus
   productos, clientes, usuarios, etc.

**Dar de baja un negocio** (por ejemplo, si deja de pagar): consola →
*Authentication* → *Users* → los tres puntitos de esa cuenta →
*Inhabilitar cuenta*. En menos de una hora sus PCs dejan de poder
leer y guardar en la nube. Para volver a habilitarlo, lo mismo.

**Cambiar la clave de un negocio:** consola → *Authentication* →
*Users* → los tres puntitos → *Restablecer contraseña* (le llega un
mail a esa dirección para elegir una clave nueva; por eso conviene
que el email de cada cuenta sea real).

**Nunca borres la cuenta de un negocio que tiene datos:** los datos
están atados a esa cuenta. Si la borrás y creás otra con el mismo
email, el programa la toma como un negocio nuevo y vacío.

---

## Cosas a tener en cuenta

- **Costo de Firebase.** Todos los negocios usan tu proyecto de
  Firebase. El plan gratuito ("Spark") permite 50.000 lecturas y
  20.000 escrituras por día en total. Un negocio chico usa una
  fracción de eso, pero con varios negocios conviene pasar al plan
  "Blaze" (se paga solo lo que se usa; para este uso suele ser muy
  poco) y ponerle un tope de presupuesto.
- **Nombre del programa.** El instalador y el ícono siguen diciendo
  "FORRALITAS". Adentro, cada negocio ve su propio nombre (menú,
  ingreso y comprobantes). Si querés que el instalador tenga un
  nombre neutro, hay que cambiar `productName` en `package.json`,
  pero ojo: eso se instala como un programa distinto, así que las PCs
  que ya lo tienen instalado no se actualizarían solas. Conviene
  decidirlo antes de repartirlo a muchos negocios.
- **Actualizaciones.** Todos los negocios reciben las actualizaciones
  que publiques con `npm run publish:win`, igual que hoy.
- **Copias de seguridad.** Cada administrador puede bajar la copia
  completa de su negocio desde Configuración → Copia de seguridad.
- **Si usás otro proyecto de Firebase** (uno nuevo solo para vender):
  hay que reemplazar los datos de `FIREBASE_CONFIG` en
  `src/js/firebase/firebase-init.js` (y en `pantalla-galpon/index.html`)
  por los del proyecto nuevo, y repetir la parte 1 ahí.
