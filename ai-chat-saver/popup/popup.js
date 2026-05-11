/**
 * popup.js — The Control Panel Brain
 * Runs only when the popup is open.
 * Handles button clicks, message passing, storage, and UI rendering.
 */

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const btnSave       = document.getElementById("btn-save");
const btnSaveLabel  = document.getElementById("btn-save-label");
const btnClearAll   = document.getElementById("btn-clear-all");
const platformBadge = document.getElementById("platform-badge");
const statusMsg     = document.getElementById("status-msg");
const chatList      = document.getElementById("chat-list");
const chatCount     = document.getElementById("chat-count");
const emptyState    = document.getElementById("empty-state");

// ─── Storage helpers ──────────────────────────────────────────────────────────
async function loadChats() {
  return new Promise((resolve) => {
    chrome.storage.local.get("chats", (data) => {
      resolve(data.chats || []);
    });
  });
}

async function saveChats(chats) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ chats }, resolve);
  });
}

// ─── Status message ───────────────────────────────────────────────────────────
let statusTimer = null;
function showStatus(msg, type = "success", duration = 3000) {
  statusMsg.textContent = msg;
  statusMsg.className = `status-msg ${type}`;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusMsg.className = "status-msg hidden";
  }, duration);
}

// ─── Platform detection via content.js ping ───────────────────────────────────
async function detectPlatform() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return resolve("unknown");
      const tab = tabs[0];
      const url = tab.url || "";

      if (url.includes("chatgpt.com")) return resolve("chatgpt");
      if (url.includes("gemini.google.com")) return resolve("gemini");
      resolve("unsupported");
    });
  });
}

function updatePlatformBadge(platform) {
  platformBadge.classList.remove("hidden", "chatgpt", "gemini", "unsupported");

  const configs = {
    chatgpt:     { label: "🟢 ChatGPT", cls: "chatgpt" },
    gemini:      { label: "🔵 Gemini",  cls: "gemini" },
    unsupported: { label: "⛔ Not a supported AI page", cls: "unsupported" },
    unknown:     { label: "⛔ Not a supported AI page", cls: "unsupported" },
  };

  const cfg = configs[platform] || configs.unknown;
  platformBadge.textContent = cfg.label;
  platformBadge.classList.add(cfg.cls);
  platformBadge.classList.remove("hidden");

  const isSupported = platform === "chatgpt" || platform === "gemini";
  btnSave.disabled = !isSupported;
  btnSaveLabel.textContent = isSupported ? "Save Current Chat" : "Open ChatGPT or Gemini";
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Render history list ──────────────────────────────────────────────────────
function renderHistory(chats) {
  chatList.innerHTML = "";
  chatCount.textContent = chats.length;

  if (chats.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  // Show newest first
  [...chats].reverse().forEach((chat) => {
    const li = document.createElement("li");
    li.className = "chat-card";
    li.setAttribute("data-id", chat.id);

    const sourceLabel = chat.source === "chatgpt" ? "ChatGPT" : "Gemini";
    const msgCount = chat.messages.length;

    li.innerHTML = `
      <div class="card-top">
        <span class="card-source ${chat.source}">${sourceLabel}</span>
        <span class="card-time">${formatTime(chat.timestamp)} · ${msgCount} msg${msgCount !== 1 ? "s" : ""}</span>
      </div>
      <div class="card-preview">${escapeHtml(chat.preview || "No preview")}</div>
      <div class="card-actions">
        <button class="card-btn view"  data-id="${chat.id}">👁 View</button>
        <button class="card-btn delete" data-id="${chat.id}">🗑 Delete</button>
      </div>
    `;

    chatList.appendChild(li);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Save chat ────────────────────────────────────────────────────────────────
async function handleSave() {
  btnSave.disabled = true;
  btnSave.innerHTML = `<div class="spinner"></div><span>Scraping…</span>`;

  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error("No active tab found.");

    // Ask content.js to scrape
    const response = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { action: "scrape_chat" }, (res) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(res);
        }
      });
    });

    if (!response || !response.success) {
      throw new Error(response?.error || "Scrape failed. Try refreshing the page.");
    }

    const { messages, platform } = response;

    if (!messages || messages.length === 0) {
      throw new Error("No messages found. Make sure there is an active chat on screen.");
    }

    // Build the first user message as preview
    const firstUser = messages.find((m) => m.role === "user");
    const preview = (firstUser?.text || messages[0].text || "").substring(0, 100);

    const newChat = {
      id:        Date.now(),
      source:    platform,
      timestamp: new Date().toISOString(),
      preview,
      messages,
    };

    const existing = await loadChats();
    await saveChats([...existing, newChat]);

    const fresh = await loadChats();
    renderHistory(fresh);

    showStatus(`✅ Saved ${messages.length} messages!`, "success");

  } catch (err) {
    showStatus(`❌ ${err.message}`, "error", 5000);
    console.error("[AI Chat Saver]", err);
  } finally {
    btnSave.disabled = false;
    btnSave.innerHTML = `<span class="btn-icon">💾</span><span id="btn-save-label">Save Current Chat</span>`;
  }
}

// ─── View chat in new tab ─────────────────────────────────────────────────────
function handleView(id) {
  const viewerUrl = chrome.runtime.getURL(`viewer/viewer.html?id=${id}`);
  chrome.tabs.create({ url: viewerUrl });
}

// ─── Delete a single chat ─────────────────────────────────────────────────────
async function handleDelete(id) {
  const chats = await loadChats();
  const updated = chats.filter((c) => String(c.id) !== String(id));
  await saveChats(updated);
  renderHistory(updated);
  showStatus("🗑 Chat deleted.", "success", 2000);
}

// ─── Clear all chats ──────────────────────────────────────────────────────────
async function handleClearAll() {
  if (!confirm("Delete ALL saved chats? This cannot be undone.")) return;
  await saveChats([]);
  renderHistory([]);
  showStatus("All chats cleared.", "success", 2000);
}

// ─── Event delegation for chat list buttons ───────────────────────────────────
chatList.addEventListener("click", (e) => {
  const viewBtn   = e.target.closest(".card-btn.view");
  const deleteBtn = e.target.closest(".card-btn.delete");

  if (viewBtn)   { e.stopPropagation(); handleView(viewBtn.dataset.id); }
  if (deleteBtn) { e.stopPropagation(); handleDelete(deleteBtn.dataset.id); }
});

// ─── Main events ──────────────────────────────────────────────────────────────
btnSave.addEventListener("click", handleSave);
btnClearAll.addEventListener("click", handleClearAll);

// ─── Init ─────────────────────────────────────────────────────────────────────
(async function init() {
  // Detect platform
  const platform = await detectPlatform();
  updatePlatformBadge(platform);

  // Load and render saved chats
  const chats = await loadChats();
  renderHistory(chats);
})();
