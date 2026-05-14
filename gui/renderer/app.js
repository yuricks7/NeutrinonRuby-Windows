window.addEventListener("DOMContentLoaded", () => {
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
      showErrorModal("MusicXML フォルダ一覧の取得に失敗しました:\n" + e);
    }
  }

  loadSongFolders();


songSelect.addEventListener("change", async () => {
  const song = songSelect.value;
  if (!song) return;

  try {
    const parts = await window.neutrinoApi.getParts(song);

    // すべてのチェックを一旦外す
    document.querySelectorAll("#parts input").forEach(cb => {
      cb.checked = false;
    });

    // 検出されたパートだけチェック
    parts.forEach(part => {
      const cb = document.querySelector(`#parts input[value="${part}"]`);
      if (cb) cb.checked = true;
    });

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
    // // ★ モーダルテスト
    // showErrorModal("これはテストエラーです");
    // return;
  });
});
