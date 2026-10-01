const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

const root = path.join(process.resourcesPath, "app-content");
const appEntry = path.join(root, "index.html");
const websiteEntry = path.join(root, "website", "index.html");

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: "RT/RW–SID CONNECT v2.0 — Smart Village",
    backgroundColor: "#08111f",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "Aplikasi", submenu: [
      { label: "RT/RW–SID CONNECT", click: () => win.loadFile(appEntry) },
      { label: "Smart Village Website", click: () => win.loadFile(websiteEntry) },
      { type: "separator" },
      { role: "reload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "quit" }
    ]},
    { label: "Jendela", submenu: [{ role: "togglefullscreen" }, { role: "resetZoom" }] }
  ]));

  win.loadFile(appEntry);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("web-contents-created", (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
});
