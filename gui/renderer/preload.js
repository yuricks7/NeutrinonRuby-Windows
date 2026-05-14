const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("neutrinoApi", {
  runNeutrino: (params) => ipcRenderer.invoke("run-neutrino", params),
  onLog: (callback) => ipcRenderer.on("log", (_event, data) => callback(data)),
  getSongFolders: () => ipcRenderer.invoke("get-song-folders")
});