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

let currentProcess = null; // 中断用の変数

// WSLのRubyを呼び出してNEUTRINOを実行
ipcMain.handle("run-neutrino", async (event, { song, parts, modelMap }) => {
  return new Promise((resolve, reject) => {

    // modelMapをJSONに変換
    const modelMapJson = JSON.stringify(modelMap || {});

    // RubyにsongとmodelMapJsonを渡す
    const cmd = `wsl ruby ${ROOT_WSL_DIRECTORY}neutrino.rb "${song}" '${modelMapJson}'`;

    currentProcess = exec(cmd);

    currentProcess.stdout.on("data", data => {
      event.sender.send("log", data.toString());
    });

    currentProcess.stderr.on("data", data => {
      event.sender.send("log", data.toString());
    });

    currentProcess.on("close", code => {
      currentProcess = null; // 終了したらクリア
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`NEUTRINO exited with code ${code}`));
      }
    });


    // const child = exec(cmd);

    // child.stdout.on("data", data => {
    //   event.sender.send("log", data.toString());
    // });

    // child.stderr.on("data", data => {
    //   event.sender.send("log", data.toString());
    // });

    // child.on("close", code => {
    //   if (code === 0) {
    //     resolve();
    //   } else {
    //     reject(new Error(`NEUTRINO exited with code ${code}`));
    //   }
    // });
  });
});

// 強制終了用ハンドラ
ipcMain.handle("stop-neutrino", () => {
  if (!currentProcess) return;

  // WSL 内の ruby と neutrino を強制終了
  exec(`wsl pkill -f neutrino`);
  exec(`wsl pkill -f ruby`);

  currentProcess.kill("SIGKILL"); // 強制終了
  currentProcess = null;

  // ★ ログに「中断しました」を送る
  event.sender.send("log", "\n=== 中断しました ===\n")
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