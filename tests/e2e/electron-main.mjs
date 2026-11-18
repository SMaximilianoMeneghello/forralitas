import { app, BrowserWindow } from "electron";
app.whenReady().then(() =>{
    const w = new BrowserWindow({ width: 1400, height: 900, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    w.loadFile(new URL("../../dist/index.html", import.meta.url).pathname);
});
app.on("window-all-closed", () => app.quit());
