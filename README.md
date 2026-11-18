# Sistema de gestión (FORRALITAS)

Programa de escritorio (Electron) para comercios: ventas por bolsa,
kilo o monto, stock, clientes con cuenta corriente, proveedores,
gastos, mezclas, caja por empleado y sincronización entre varias PCs
con Firebase.

## Guías

- `NOVEDADES_1.1.0.md` – qué cambió en la última versión.
- `COMO_GENERAR_EL_EXE.md` – cómo generar el instalador de Windows.
- `COMO_PUBLICAR_ACTUALIZACIONES.md` – cómo publicar una actualización.
- `COMO_OFRECER_EL_SISTEMA_A_OTROS_NEGOCIOS.md` – cuentas de negocio,
  reglas de seguridad y alta de negocios nuevos.

## Comandos

```
npm install          # una sola vez
npm run electron:dev # probar el programa mientras se desarrolla
npm run build:win    # generar el instalador (queda en release/)
npm run publish:win  # publicar una actualización
```

## Cómo está armado

- `index.html` + `src/js/*.js`: las pantallas (scripts clásicos con
  funciones globales).
- `src/js/datos/`: guardado local (`almacen-local.js`) y
  sincronización con la nube (`sync-nucleo.js`, `sync-gestor.js`).
- `src/js/firebase/firebase-init.js`: conexión con Firebase.
- `firestore.rules`: reglas de seguridad de la base de datos.
- `pantalla-galpon/`: pantalla para la tele del galpón.
- `tests/`: pruebas automáticas. Ninguna toca la base real: usan el
  emulador local de Firebase.

## Pruebas

```
npm test                  # lógica de sincronización
npm run test:emulador     # (en otra terminal) emulador de Firebase
npm run test:sync         # sincronización entre varias PCs
npm run dev               # (en otra terminal) la app
npm run test:app          # recorrido completo de las pantallas
```
