window.addEventListener("DOMContentLoaded", () => {
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
