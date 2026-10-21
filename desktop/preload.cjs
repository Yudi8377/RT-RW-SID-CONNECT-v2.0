const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("rtRwSidOffline", {
  getStatus: () => ipcRenderer.invoke("offline-db:status")
});