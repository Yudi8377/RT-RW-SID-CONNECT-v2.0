const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("rtRwSidOffline", {
  getStatus: () => ipcRenderer.invoke("offline-db:status"),
  listResidents: () => ipcRenderer.invoke("offline-residents:list"),
  saveResident: (resident) => ipcRenderer.invoke("offline-residents:save", resident),
  deleteResident: (id) => ipcRenderer.invoke("offline-residents:delete", id)
});