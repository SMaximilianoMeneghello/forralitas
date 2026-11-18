# Novedades de la versión 1.1.0

Esta versión cambia mucho por dentro (cómo se guardan y sincronizan
los datos) y suma todo lo que le faltaba al administrador. Los datos
que ya tenés cargados se conservan: no hay que volver a cargar nada.

## Antes de actualizar (importante)

1. **Actualizá todas las PCs el mismo día.** La versión nueva guarda
   las contraseñas cifradas; una PC que quede con la versión vieja no
   va a poder iniciar sesión hasta actualizarse (si ya tenía la sesión
   abierta sigue funcionando, y se actualiza sola al reiniciar el
   programa).
2. **Cambiá las contraseñas** después de actualizar (Configuración →
   Contraseña, y el administrador puede cambiar las de los demás desde
   Configuración → Usuarios). Las contraseñas anteriores estaban
   escritas en el código del programa, que es público en GitHub.
3. Hacé una **copia de seguridad** apenas actualices (Configuración →
   Copia de seguridad → Exportar). Ahora la copia incluye TODO.

## Lo que ahora puede hacer el administrador

- **Ventas (Historial):** editar cualquier venta (fecha, cliente,
  vendedor, productos, cantidades, precios y forma de pago) y
  eliminarla. Al editar o eliminar, el programa acomoda solo el stock
  y el saldo del cliente.
- **Pagos de clientes:** editar o eliminar cualquier pago desde la
  ficha del cliente (la deuda se recalcula sola).
- **Proveedores:** editar o eliminar compras y pagos.
- **Mezclas:** anular una producción (devuelve el stock).
- **Gastos:** editar todo, incluso a nombre de quién quedó.
- **Eliminaciones:** con ♻️ se puede **restaurar** lo que se eliminó
  (ventas, productos, clientes, proveedores, gastos, mezclas y
  anotaciones), borrar registros del panel o vaciarlo.
- **Usuarios:** crear, editar, cambiar contraseñas y elegir si las
  eliminaciones de un usuario se anotan o no en el panel.
- **Permisos:** decidir qué pueden hacer los empleados (eliminar
  ventas, tocar productos, clientes, gastos, proveedores, mezclas y
  ver la caja completa).
- **Datos del negocio:** nombre, dirección, teléfono, CUIT y el texto
  del comprobante.

## Cosas nuevas para todos

- **Comprobante imprimible** de cada venta (🖨️ en el Historial y en la
  ficha del cliente) y **estado de cuenta** del cliente.
- **Número de venta** correlativo.
- **Exportar a Excel**: ventas, gastos, productos y caja. La caja
  también se puede imprimir.
- **Caja:** "Separar" ya no está fijo para maíz y alfa: se configura
  en cada producto (Productos → editar → "Separar por cada bolsa
  vendida"). Los productos de maíz y alfa quedaron configurados igual
  que antes. Si cargás el costo por bolsa, la caja muestra la
  ganancia estimada.
- **Clientes:** se puede cobrar una deuda anterior que no viene de una
  venta, filtrar "solo los que deben" y ver el total comprado.
- **Dashboard:** total por cobrar, gastos del mes.
- **Indicador de sincronización** abajo a la izquierda (☁ Sincronizado
  / ⏳ Subiendo / ⚠ Sin conexión).
- La **pantalla del galpón** vuelve a recibir el aviso de cada venta.

## Errores corregidos

- **Ventas que se perdían con dos PCs:** si dos computadoras guardaban
  casi al mismo tiempo, una pisaba lo de la otra. Ahora cada cambio se
  combina con lo que hay en la nube (dos ventas del mismo producto a
  la vez descuentan el stock las dos).
- **Trabajar sin internet:** antes, lo cargado sin conexión se perdía
  al volver a abrir el programa. Ahora queda guardado en la PC y se
  sube solo cuando vuelve internet, aunque se haya cerrado el programa.
- **Límite de tamaño:** el historial de ventas se guardaba en un solo
  documento de Firebase (máximo 1 MB, unas 1.500–2.000 ventas). Al
  llenarse, la nube dejaba de guardar sin avisar. Ahora se reparte
  solo en varias partes y puede crecer durante años. Lo mismo con el
  límite de 5 MB del almacenamiento local.
- **Eliminar una venta** no devolvía el stock ni descontaba la deuda
  del cliente (quedaba una deuda imposible de saldar).
- **Venta en curso que se desarmaba:** cuando llegaba un cambio de
  otra PC, la pantalla de Ventas volvía a "Bolsa / Efectivo / PAGA" y
  una venta fiada podía quedar registrada como pagada.
- **Cambiar la contraseña** decía "actualizada" pero a veces no se
  guardaba.
- **Usuarios eliminados que volvían a aparecer** con la contraseña
  original al reiniciar el programa.
- **Usuarios creados con mayúsculas** no podían iniciar sesión.
- **Precio especial** con un solo precio cargado (bolsa o kilo): el
  otro quedaba en $0 y se vendía gratis. Ahora usa el precio de lista.
- Elegir el cliente **después** de cargar los productos no aplicaba
  sus precios especiales.
- Nombres con símbolos (`<`, `"`, `'`) rompían las pantallas.
- Opciones de Configuración que no hacían nada (sonido de venta,
  confirmar al eliminar, stock mínimo general, dashboard): ahora
  funcionan. Se quitó "Optimizar sistema", que no hacía nada.
- Los empleados podían cambiar la apariencia, importar datos y
  restablecer la configuración: ahora es solo del administrador.

## Seguridad: lo que conviene hacer ahora

Hoy la base de datos funciona "sin cuenta": cualquiera que conozca los
datos del proyecto (que están en el código público) podría leerla. El
programa ya está preparado para cerrarla con una **cuenta del negocio**
(email y clave). Los pasos están en
`COMO_OFRECER_EL_SISTEMA_A_OTROS_NEGOCIOS.md` (parte 1 y parte 2).
