/**
 * viewer.js — Chat Viewer Brain
 * Reads the chat ID from URL params, loads from storage, renders the thread.
 */

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const navSource    = document.getElementById("nav-source");
const btnBack      = document.getElementById("btn-back");
const btnExport    = document.getElementById("btn-export");
const btnDelete    = document.getElementById("btn-delete");
const chatMeta     = document.getElementById("chat-meta");
const metaTitle    = document.getElementById("meta-title");
const metaDate     = document.getElementById("meta-date");
const metaCount    = document.getElementById("meta-count");
const notFound     = document.getElementById("not-found");
const msgThread    = document.getElementById("message-thread");

// ─── Get chat ID from URL ─────────────────────────────────────────────────────
const params  = new URLSearchParams(window.location.search);
const chatId  = params.get("id");

// ─── Load chat from storage ───────────────────────────────────────────────────
async function loadChat(id) {
  return new Promise((resolve) => {
    chrome.storage.local.get("chats", (data) => {
      const chats = data.chats || [];
      const chat  = chats.find((c) => String(c.id) === String(id));
      resolve(chat || null);
    });
  });
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function formatDate(isoStr) {
  return new Date(isoStr).toLocaleString(undefined, {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
    hour:    "2-digit",
    minute:  "2-digit",
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;");
}

/**
 * Very lightweight markdown-ish formatter:
 * - ``` code blocks ```
 * - `inline code`
 * - **bold**
 */
function formatText(raw) {
  let html = escapeHtml(raw);

  // Fenced code blocks
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  return html;
}

// ─── Render the chat thread ───────────────────────────────────────────────────
function renderChat(chat) {
  // Update page title
  document.title = `${chat.preview?.substring(0, 40) || "Chat"} — AI Chat Saver`;

  // Source chip
  const sourceLabel = chat.source === "chatgpt" ? "ChatGPT" : "Gemini";
  navSource.textContent = sourceLabel;
  navSource.className   = `source-chip ${chat.source}`;

  // Meta header
  const firstUser = chat.messages.find((m) => m.role === "user");
  metaTitle.textContent = (firstUser?.text || chat.preview || "Saved Chat")
    .split("\n")[0]
    .substring(0, 120);
  metaDate.textContent  = formatDate(chat.timestamp);
  metaCount.textContent = `${chat.messages.length} message${chat.messages.length !== 1 ? "s" : ""}`;

  // Avatar emoji per role
  const avatars = {
    user:      "🧑",
    assistant: chat.source === "chatgpt" ? "🤖" : "✨",
    unknown:   "❓",
  };

  const roleLabels = {
    user:      "You",
    assistant: sourceLabel,
    unknown:   "Unknown",
  };

  // Render bubbles
  chat.messages.forEach((msg, i) => {
    const role    = msg.role || "unknown";
    const bubble  = document.createElement("div");
    bubble.className = `message-bubble ${role}`;

    bubble.innerHTML = `
      <div class="bubble-avatar">${avatars[role] || "❓"}</div>
      <div class="bubble-content">
        <div class="bubble-header">
          <span class="bubble-role">${roleLabels[role] || role}</span>
          <span class="bubble-index">#${i + 1}</span>
        </div>
        <div class="bubble-text">${formatText(msg.text)}</div>
      </div>
    `;

    msgThread.appendChild(bubble);
  });
}

// ─── Export as Markdown ───────────────────────────────────────────────────────
function exportMarkdown(chat) {
  const sourceLabel = chat.source === "chatgpt" ? "ChatGPT" : "Gemini";
  const date = formatDate(chat.timestamp);

  let md = `# ${sourceLabel} — Saved Chat\n`;
  md += `**Date:** ${date}\n\n`;
  md += `---\n\n`;

  chat.messages.forEach((msg, i) => {
    const role = msg.role === "user" ? "**You**" : `**${sourceLabel}**`;
    md += `${role} _(#${i + 1})_\n\n`;
    md += `${msg.text}\n\n`;
    md += `---\n\n`;
  });

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `chat-${chat.source}-${chat.id}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Delete this chat ─────────────────────────────────────────────────────────
async function deleteChat(id) {
  if (!confirm("Delete this chat? This cannot be undone.")) return;
  await new Promise((resolve) => {
    chrome.storage.local.get("chats", (data) => {
      const updated = (data.chats || []).filter((c) => String(c.id) !== String(id));
      chrome.storage.local.set({ chats: updated }, resolve);
    });
  });
  window.close();
}

// ─── Scroll-to-top button ─────────────────────────────────────────────────────
const btnTop = document.createElement("button");
btnTop.id = "btn-top";
btnTop.title = "Scroll to top";
btnTop.textContent = "↑";
document.body.appendChild(btnTop);

window.addEventListener("scroll", () => {
  btnTop.classList.toggle("visible", window.scrollY > 300);
});
btnTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// ─── Init ─────────────────────────────────────────────────────────────────────
(async function init() {
  if (!chatId) {
    chatMeta.classList.add("hidden");
    notFound.classList.remove("hidden");
    return;
  }

  const chat = await loadChat(chatId);

  if (!chat) {
    chatMeta.classList.add("hidden");
    notFound.classList.remove("hidden");
    return;
  }

  renderChat(chat);

  // Wire up buttons
  btnBack.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else window.close();
  });

  btnExport.addEventListener("click", () => exportMarkdown(chat));
  btnDelete.addEventListener("click", () => deleteChat(chat.id));
})();
