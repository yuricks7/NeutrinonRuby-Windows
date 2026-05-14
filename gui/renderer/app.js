window.addEventListener("DOMContentLoaded", () => {
  const songSelect = document.getElementById("song-select");

  /**
   * 「MusicXML」フォルダの一覧を取得
   */
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
  function renderModelSelectors(parts) {
    const area = document.getElementById("model-select-area");
    area.innerHTML = ""; // 一旦クリア

    const models = ["MERROW", "SOMA"];

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
    });
  }

  songSelect.addEventListener("change", async () => {
    const song = songSelect.value;
    if (!song) return;

    try {
      const parts = await window.neutrinoApi.getParts(song);

      // チェックボックス更新
      document.querySelectorAll("#parts input").forEach(cb => cb.checked = false);
      parts.forEach(part => {
        const cb = document.querySelector(`#parts input[value="${part}"]`);
        if (cb) cb.checked = true;
      });

      // モデル選択UIを生成
      renderModelSelectors(parts);

    } catch (e) {
      showErrorModal("パート検出に失敗しました:\n" + e);
    }
  });

  function showErrorModal(message) {
    const modal = document.getElementById("error-modal");
    const msg = document.getElementById("error-message");
    msg.textContent = message;
    modal.classList.remove("hidden");
  }

  document.getElementById("error-close").addEventListener("click", () => {
    document.getElementById("error-modal").classList.add("hidden");
  });

  const songInput = document.getElementById("song");
  const runButton = document.getElementById("run-button");
  const logElement = document.getElementById("log");
  const progressElement = document.getElementById("progress");

  function appendLog(text) {
    logElement.textContent += text;
    logElement.scrollTop = logElement.scrollHeight;
  }

  function updateProgress(part, percent) {
    const id = `progress-${part}`;
    let row = document.getElementById(id);
    if (!row) {
      row = document.createElement("div");
      row.id = id;
      row.innerHTML = `<b>${part}</b>: <span class="bar"></span>`;
      progressElement.appendChild(row);
    }
    const filled = "#".repeat(percent / 10);
    const empty = "-".repeat(10 - percent / 10);
    row.querySelector(".bar").textContent = `[${filled}${empty}] ${percent}%`;
  }

  window.neutrinoApi.onLog((data) => {
    appendLog(data);
  });

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
});
