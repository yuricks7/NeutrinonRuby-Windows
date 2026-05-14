const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { exec } = require("child_process");

const ROOT_WSL_DIRECTORY = '/home/yuricks7/dev/Ruby/projects/20260426_NEUTRINO/neutrino/';

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

// WSLのRubyを呼び出してNEUTRINOを実行
ipcMain.handle("run-neutrino", async (event, { song, parts, modelMap }) => {
  return new Promise((resolve, reject) => {

    // modelMapをJSONに変換
    const modelMapJson = JSON.stringify(modelMap || {});

    // RubyにsongとmodelMapJsonを渡す
    const cmd = `wsl ruby ${ROOT_WSL_DIRECTORY}neutrino.rb "${song}" '${modelMapJson}'`;

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
    const cmd = `wsl ruby ${ROOT_WSL_DIRECTORY}lib/list_musicxml_folders.rb`;

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

ipcMain.handle("detect-parts", async (_event, song) => {
  return new Promise((resolve, reject) => {
    const cmd = `wsl ruby ${ROOT_WSL_DIRECTORY}lib/detect_parts.rb ${song}`;

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