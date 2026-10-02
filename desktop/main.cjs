const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");
const path = require("path");
const { openLocalDatabase } = require("./local-db.cjs");

const root = path.join(process.resourcesPath, "app-content");
const appEntry = path.join(root, "index.html");
const editionGateEntry = path.join(__dirname, "edition-gate.html");
const offlineStatusEntry = path.join(__dirname, "offline-shell.html");
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
      { label: "SIM RT/RW OS", click: () => win.loadFile(appEntry) },
      { label: "Edisi / Aktivasi", click: () => win.loadFile(editionGateEntry) },
      { label: "Offline Runtime / Database", click: () => win.loadFile(offlineStatusEntry) },
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
  ipcMain.handle("desktop:open-os", () => { createWindow.__unused = true; return BrowserWindow.getAllWindows()[0]?.loadFile(appEntry); });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch((error) => { console.error("Offline database bootstrap failed:", error); app.quit(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { if (localDatabase) localDatabase.close(); });
app.on("web-contents-created", (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: "deny" }; });
});