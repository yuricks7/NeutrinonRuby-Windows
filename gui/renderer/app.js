window.addEventListener("DOMContentLoaded", () => {
  const ORDER = ["Soprano", "Alto", "Tenor", "Baritone"];

  // // まだ使ってない
  // const songInput = document.getElementById("song");

  /**
   * パート一覧を取得
   */
  let currentParts = [];
  let partProgress = {};
  window.neutrinoApi.getPartsList((parts) => {
    // 並び順を固定
    parts.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

    // 並べ替えたデータを格納
    currentParts = parts;
    partProgress = {};
    parts.forEach(p => partProgress[p] = 0);

    renderOverallProgress(); // 全体進捗を初期化
  });


  /**
   * 「MusicXML」フォルダの一覧を取得
   */
  const songSelect = document.getElementById("song-select");
  async function loadSongFolders() {
    try {
      const folders = await window.neutrinoApi.getSongFolders();
      folders.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        songSelect.appendChild(option);
      });
    } catch (e) {
      showErrorModal("MusicXMLフォルダ一覧の取得に失敗しました:\n" + e);
    }
  }

  loadSongFolders();

  /**
   * パートごとにモデルの選択肢を表示する
   *
   * @param {string[]} parts 対象とするパート
   */
  async function renderModelSelectors(parts) {
    const area = document.getElementById("model-select-area");
    area.innerHTML = ""; // 一旦クリア

    // ★ モデル一覧を取得（フォルダから）
    const models = await window.neutrinoApi.getModelList();

    // ★ 初期値（JSON）を取得
    const config = await window.neutrinoApi.getConfig();
    const defaults = config.models.default;

    // ★ モデル名をソート
    models.sort();

    parts.forEach(part => {
      const wrapper = document.createElement("div");
      wrapper.className = "model-row";

      wrapper.innerHTML = `
        <label>${part} モデル:</label>
        <select class="model-select" data-part="${part}">
          ${models.map(m => `<option value="${m}">${m}</option>`).join("")}
        </select>
      `;

      area.appendChild(wrapper);

      // 初期値をセット
      const select = wrapper.querySelector("select");
      if (defaults[part]) {
        select.value = defaults[part];
      }
    });
  }

  /**
   * 曲名を選択する
   */
  songSelect.addEventListener("change", async () => {
    const song = songSelect.value;
    if (!song) return;

    try {
      // パート順を固定
      const parts = await window.neutrinoApi.getParts(song);
      parts.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

      // チェックボックス更新
      document.querySelectorAll("#parts input").forEach(checkBox => checkBox.checked = false);
      parts.forEach(part => {
        const checkedPart = document.querySelector(`#parts input[value="${part}"]`);
        if (checkedPart) checkedPart.checked = true;
      });

      // モデル選択UIを生成
      await renderModelSelectors(parts);

    } catch (e) {
      showErrorModal("パート検出に失敗しました:\n" + e);
    }
  });

  /**
   * モーダルでエラーメッセージを表示する
   *
   * @param {string} message
   */
  function showErrorModal(message) {
    const modal = document.getElementById("error-modal");
    const msg   = document.getElementById("error-message");
    msg.textContent = message;
    modal.classList.remove("hidden");
  }

  /**
   * モーダルを閉じる
   */
  document.getElementById("error-close").addEventListener("click", () => {
    document.getElementById("error-modal").classList.add("hidden");
  });

  /**
   * パートごとの進捗を更新する
   *
   * @param {string} part
   * @param {number} percent
   */
  function updatePartProgressUI(part, percent) {
    const area = document.getElementById("progress");
    let row = document.getElementById(`progress-${part}`);

    if (!row) {
      row = document.createElement("div");
      row.id = `progress-${part}`;
      area.appendChild(row);
    }

    // パート名の幅を揃える
    const longest   = "Baritone";
    const partLabel = part.padEnd(longest.length + 1);

    // 進捗バーを生成する
    const MAX = 10;
    const GRID = 10;
    const filled = "#".repeat(percent / GRID);
    const empty  = "-".repeat(MAX - percent / GRID);
    const bar = `[${filled}${empty}]`;

    // 進捗バーの書式
    row.textContent = `${partLabel} ${bar} ${String(percent).padStart(3)}%`;

    // 処理を完了したらグレーアウトする
    const DONE = "progress-done";
    if (percent >= 100) {
      row.classList.add(DONE);
    } else {
      row.classList.remove(DONE);
    }
  }

  /**
   * 全体の進捗を更新
   */
  function renderOverallProgress() {
    const area = document.getElementById("progress");

    // 要素の生成
    let overall = document.getElementById("overall-progress");
    if (!overall) {
      overall = document.createElement("div");
      overall.id = "overall-progress";
      overall.style.fontWeight = "bold";
      overall.style.marginBottom = "8px";
      area.prepend(overall);
    }

    // パーセンテージを算出
    const done = Object.values(partProgress).filter(v => v === 100).length;
    const total = currentParts.length;
    const percent = Math.floor((done / total) * 100);

    // 書式の設定
    overall.textContent = `[全体進捗] ${done}/${total} (${percent}%)`;
  }

  /**
   * ログの整形
   */
  window.neutrinoApi.onLog((data) => {
    const logArea      = document.getElementById("log");
    const progressLine = document.getElementById("progress-line");

      // 進捗バーの編集
    const finishMatch = data.match(/finish\s*:\s[\d\.]+\s*\[sec\]/m); // 改行なし（にしたい）
    if (finishMatch) {
      const currentPart = currentParts.find(part => partProgress[part] < 100);
      if (currentPart) {
        partProgress[currentPart] = 100;   // ★ ここが重要
        updatePartProgressUI(currentPart, 100);
        renderOverallProgress();
      }
    }

    // 処理するファイルパスの出力位置を揃える
    let cleaned = data.replace(/^\s+$/gm, "\n"); //`→`を削除しつつ、パスを改行で揃える
    cleaned = cleaned.replace(/→\s*(C:\\[^\n]+)/g, (match, group) => { // `→`を含む行をそのままパスだけにする
      const parts = group.split(/\s+(?=C:\\)/g);
      return parts.map(p => "\n" + p).join("");
    });

    logArea.textContent += cleaned;
    logArea.scrollTop = logArea.scrollHeight;

    // 処理中のパートを表示
    const p = data.match(/progress\s*=\s*(\d+)\s*%/);
    if (p) {
      const percent = Number(p[1]);

      // 処理中のパートを選択
      const currentPart = currentParts.find(part => partProgress[part] < 100); // 最初の未完了パート
      if (currentPart) {
        partProgress[currentPart] = percent;
        updatePartProgressUI(currentPart, percent);
        renderOverallProgress();
      }
    }
  });

  /**
   * Runボタンのイベント
   */
  const runButton = document.getElementById("run-button");
  runButton.addEventListener("click", async () => {
    const song = songSelect.value;

    const parts = Array.from(document.querySelectorAll("#parts input:checked"))
      .map(x => x.value);

    // modelMapを生成
    const modelMap = {};
    document.querySelectorAll(".model-select").forEach(sel => {
      const part = sel.dataset.part;
      const model = sel.value;
      modelMap[part] = model;
    });

    try {
      // RubyにmodelMapを渡す
      await window.neutrinoApi.runNeutrino({ song, parts, modelMap });
    } catch (e) {
      showErrorModal(e.message);
    }
  });

  /**
   * 緊急停止ボタンのイベント
   */
  const stopButton = document.getElementById("stop-button");
  stopButton.addEventListener("click", () => {
    window.neutrinoApi.stopNeutrino();
  });
});
