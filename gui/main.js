const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { exec } = require("child_process");

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "renderer", "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
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

// WSL の Ruby を呼び出して NEUTRINO を実行
ipcMain.handle("run-neutrino", async (event, { song, parts }) => {
  return new Promise((resolve, reject) => {
    const cmd = `wsl ruby /home/yuri/neutrino/neutrino.rb ${song}`;
    const child = exec(cmd);

    child.stdout.on("data", data => {
      event.sender.send("log", data.toString());
    });

    child.stderr.on("data", data => {
      event.sender.send("log", data.toString());
    });

    child.on("close", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`NEUTRINO exited with code ${code}`));
      }
    });
  });
});

// 「get-song-folders」ハンドラ
ipcMain.handle("get-song-folders", async () => {
  return new Promise((resolve, reject) => {
    const cmd = `wsl ruby /home/yuri/neutrino/lib/list_musicxml_folders.rb`;

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(stderr || err.message);
        return;
      }

      try {
        const list = JSON.parse(stdout);
        resolve(list);
      } catch (e) {
        reject("JSON parse error: " + e.message);
      }
    });
  });
});