const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("neutrinoApi", {
  runNeutrino: (params) => ipcRenderer.invoke("run-neutrino", params),
  stopNeutrino: () => ipcRenderer.invoke("stop-neutrino"),
  onLog: (callback) => ipcRenderer.on("log", (_event, data) =>
    callback(data)
  ),
  getSongFolders: () => ipcRenderer.invoke("get-song-folders"),
  getParts: (song) => ipcRenderer.invoke("detect-parts", song)
});