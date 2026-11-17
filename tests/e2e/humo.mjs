import { abrirNavegador, nuevaPC, crearPrimerAdmin, visible } from "./util.mjs";
const nav = await abrirNavegador();
const { pagina, errores } = await nuevaPC(nav, { modo: "local" });
await crearPrimerAdmin(pagina);
for(const id of ["Dashboard","Ventas","Productos","Clientes","Proveedores","Gastos","Historial","Mezclas","Anotaciones","Reportes","Configuracion","Eliminaciones"]){
    await pagina.click("#" + id);
    await pagina.waitForTimeout(150);
}
await pagina.screenshot({ path: process.argv[2] || "/tmp/humo.png" });
console.log("errores:", errores);
await nav.close();
