const { app, BrowserWindow, ipcMain } = require("electron");
const path     = require("path");
const { exec } = require("child_process");
const iconv    = require("iconv-lite");
const fs       = require("fs");

/**
 * 処理
 */
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

  // HTMLを読み込む
  win.loadFile(path.join(__dirname, "renderer", "index.html"));

  // JSONを読み込む
  const configPath = path.join(__dirname, "config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const rootWslDir  = config.paths.root_wsl_directory;
  const neutrinoDir = config.paths.apps_directory;

  // ======================================
  // IPCハンドラ（NEUTRINO操作関係のAPI）
  // ======================================

  // WSLのRubyを呼び出してNEUTRINOを実行
  let currentProcess = null; // 中断用の変数
  ipcMain.handle("run-neutrino", async (event, { song, parts, modelMap }) => {

    // 現在処理中のパート一覧をapp.jsに送る
    event.sender.send("parts-list", parts);

    return new Promise((resolve, reject) => {

      // 設定ファイル（JSON）をRubyに渡す
      const partsJson    = JSON.stringify(parts || []);
      const modelMapJson = JSON.stringify(modelMap || {});
      const configJson = JSON.stringify(config);
      const cmd = `wsl ruby ${rootWslDir}neutrino.rb "${song}" '${partsJson}' '${modelMapJson}' '${configJson}'`;

      // 実行
      currentProcess = exec(cmd, { encoding: "binary", maxBuffer: 1024 * 1024 * 10 });

      // 文字化け対策
      function safeDecode(data) {
        if (!data) return "";

        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, "binary");

        // まず UTF-8 として decode
        let utf8 = iconv.decode(buf, "utf-8");

        // UTF-8 が文字化けしているか判定（� が大量に含まれる）
        const mojibake = utf8.includes("�");

        if (mojibake) {
          // Shift_JIS として decode し直す
          return iconv.decode(buf, "shift_jis");
        }

        return utf8;
      }

      currentProcess.stdout.on("data", (data) => {
        event.sender.send("log", safeDecode(data));
      });

      currentProcess.stderr.on("data", (data) => {
        event.sender.send("log", safeDecode(data));
      });

      currentProcess.on("close", code => {
        currentProcess = null; // 終了したらクリア
        if (code !== 0) {
          reject(new Error(`NEUTRINO exited with code ${code}`));
        } else {
          resolve();
        }
      });
    });
  });

  // 強制終了用ハンドラ
  ipcMain.handle("stop-neutrino", (event) => {
    if (!currentProcess) return;

    // WSL 内の ruby と neutrino を強制終了
    exec(`wsl pkill -f neutrino`);
    exec(`wsl pkill -f ruby`);

    currentProcess.kill("SIGKILL"); // 強制終了
    currentProcess = null;

    // ★ ログに「中断しました」を送る
    event.sender.send("log", "\n=== 中断しました ===\n")
  });

  /**
   * 設定ファイルを取得する
   */
  ipcMain.handle("get-config", async () => config);

  /**
   * 曲名を取得する
   */
  ipcMain.handle("get-song-folders", async () => {
    return new Promise((resolve, reject) => {
      const cmd = `wsl ruby ${rootWslDir}lib/list_musicxml_folders.rb`;

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

  /**
   * パート一覧を取得する
   */
  ipcMain.handle("detect-parts", async (_event, song) => {
    return new Promise((resolve, reject) => {
      const cmd = `wsl ruby ${rootWslDir}lib/detect_parts.rb ${song}`;

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

  /**
   * モデル一覧を返す
   */
  ipcMain.handle("get-model-list", async () => {
    try {
      const modelDir = `${neutrinoDir}model`;
      const dirs = fs.readdirSync(modelDir, { withFileTypes: true })
                    .filter(d => d.isDirectory())
                    .map(d => d.name);
      return dirs;
    } catch (e) {
      console.error("get-model-list error:", e);
      return []; // ★ 失敗しても空配列を返す
    }
  });

  /**
   * モデルの設定JSONを返す
   */
  ipcMain.handle("get-model-config", async () => {
    try {
      const configPath = `${neutrinoDir}config-model.json`;
      const json = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(json);
    } catch (e) {
      console.error("get-model-config error:", e);
      return { defaultModels: {} }; // ★ 失敗しても空の設定を返す
    }
  });
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