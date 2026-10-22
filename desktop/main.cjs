const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");
const path = require("path");
const { openLocalDatabase } = require("./local-db.cjs");

const root = path.join(process.resourcesPath, "app-content");
const appEntry = path.join(__dirname, "offline-shell.html");
const websiteEntry = path.join(root, "website", "index.html");
const seedPath = path.join(root, "offline-data", "supabase-snapshot-v1.0", "master-data.json");
let localDatabase = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    title: "RT/RW–SID CONNECT v2.0 — Smart Village", backgroundColor: "#08111f",
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "Aplikasi", submenu: [
      { label: "RT/RW–SID CONNECT", click: () => win.loadFile(appEntry) },
      { label: "Smart Village Website", click: () => win.loadFile(websiteEntry) },
      { type: "separator" }, { role: "reload" }, { role: "toggleDevTools" }, { type: "separator" }, { role: "quit" }
    ]},
    { label: "Jendela", submenu: [{ role: "togglefullscreen" }, { role: "resetZoom" }] }
  ]));
  win.loadFile(appEntry);
}

app.whenReady().then(async () => {
  localDatabase = await openLocalDatabase({ userDataPath: app.getPath("userData"), seedPath });
  ipcMain.handle("offline-db:status", () => localDatabase.getStatus());
  ipcMain.handle("offline-residents:list", () => localDatabase.listResidents({ limit: 200 }));
  ipcMain.handle("offline-residents:save", (_event, input) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Data warga tidak valid.");
    const residentCode = String(input.resident_code || "").trim().toUpperCase();
    const displayName = String(input.display_name || "").trim();
    const rtCode = String(input.rt_code || "").trim();
    const rwCode = String(input.rw_code || "").trim();
    const status = input.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!/^[A-Z0-9-]{2,24}$/.test(residentCode)) throw new Error("Kode warga harus 2–24 karakter A-Z, angka, atau tanda hubung.");
    if (!displayName || displayName.length > 100) throw new Error("Nama tampilan wajib diisi dan maksimal 100 karakter.");
    if (!/^\d{1,3}$/.test(rtCode) || !/^\d{1,3}$/.test(rwCode)) throw new Error("Kode RT dan RW harus 1–3 digit.");
    if (input.id && !/^[0-9a-f-]{36}$/i.test(String(input.id))) throw new Error("ID warga tidak valid.");
    return localDatabase.saveResident({ id: input.id || undefined, resident_code: residentCode, display_name: displayName, rt_code: rtCode, rw_code: rwCode, status });
  });
  ipcMain.handle("offline-residents:delete", (_event, id) => {
    if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) throw new Error("ID warga tidak valid.");
    return localDatabase.deleteResident(String(id));
  });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch((error) => { console.error("Offline database bootstrap failed:", error); app.quit(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { if (localDatabase) localDatabase.close(); });
app.on("web-contents-created", (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: "deny" }; });
});