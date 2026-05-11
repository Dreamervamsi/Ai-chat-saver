# 🤖 AI Chat Saver

> A Chrome Extension to save your **ChatGPT** and **Google Gemini** conversations locally — 100% offline, 100% private.

![Version](https://img.shields.io/badge/version-1.0.0-6366f1?style=flat-square)
![Manifest](https://img.shields.io/badge/Manifest-V3-8b5cf6?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-34d399?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Chrome-f59e0b?style=flat-square)

---

## ✨ Features

- 💾 **One-click save** — Save any ChatGPT or Gemini chat instantly
- 📚 **History list** — Browse all your saved chats with timestamps and previews
- 👁 **Full viewer** — Read saved chats in a clean, full-page bubble layout
- ⬇ **Export to Markdown** — Download any chat as a `.md` file
- 🗑 **Delete anytime** — Remove individual chats or clear everything
- 🔒 **100% local** — Uses `chrome.storage.local`. No servers, no accounts, no internet required
- 🎨 **Dark UI** — Sleek dark glassmorphism design with indigo/purple accents

---

## 📸 Screenshots

| Popup | Chat Viewer |
|-------|-------------|
| Save button with live platform detection | Full bubble-style message thread |
| History list with source chip + timestamp | Export to Markdown, Delete options |

---

## 🗂 Project Structure

```
ai-chat-saver/
├── manifest.json          # Extension config (Manifest V3)
├── README.md              # You are here
│
├── content/
│   └── content.js         # Injected into ChatGPT & Gemini — scrapes the DOM
│
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # Popup logic: save, load, delete, message passing
│   └── popup.css          # Dark glassmorphism styling
│
├── viewer/
│   ├── viewer.html        # Full-page chat viewer
│   ├── viewer.js          # Render messages, export, delete
│   └── viewer.css         # Bubble layout, staggered animations
│
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🚀 Installation (Developer Mode)

> No Chrome Web Store listing yet — install it manually in under 60 seconds.

**1. Download / Clone this repo**
```
git clone https://github.com/your-username/ai-chat-saver.git
```
Or just download and unzip the folder.

**2. Open Chrome Extensions**
```
chrome://extensions
```

**3. Enable Developer Mode**
- Toggle **"Developer mode"** ON (top-right corner)

**4. Load the extension**
- Click **"Load unpacked"**
- Select the `ai-chat-saver/` folder
- Done! The 🤖 icon appears in your Chrome toolbar

---

## 🎯 How to Use

### Saving a Chat
1. Open **[chatgpt.com](https://chatgpt.com)** or **[gemini.google.com](https://gemini.google.com)**
2. Have a conversation (or open an existing one)
3. Click the **🤖 AI Chat Saver** icon in the Chrome toolbar
4. The popup detects the platform automatically (`🟢 ChatGPT` or `🔵 Gemini`)
5. Click **"💾 Save Current Chat"**
6. The chat is saved and appears in the history list below

### Viewing a Chat
- Click **"👁 View"** on any saved chat card
- Opens in a full-page viewer with message bubbles, timestamps, and message count
- Supports basic Markdown formatting (code blocks, inline code, bold)

### Exporting a Chat
- In the viewer, click **"⬇ Export .md"**
- Downloads the chat as a `.md` Markdown file to your computer

### Deleting Chats
- **Single chat:** Click **"🗑 Delete"** on a card in the popup, or in the viewer
- **All chats:** Click the 🗑️ icon in the popup header → confirm

---

## ⚙️ How It Works — Under the Hood

```
You click "Save"
    │
    ▼
popup.js detects active tab URL (ChatGPT or Gemini)
    │
    ▼
Sends message { action: "scrape_chat" } to content.js on that tab
    │
    ▼
content.js scrapes the DOM:
  • ChatGPT → <article data-message-author-role="..."> elements
  • Gemini  → <user-query>, <model-response> elements (multi-selector fallback)
    │
    ▼
Returns [{ role: "user"|"assistant", text: "..." }, ...]
    │
    ▼
popup.js adds metadata (timestamp, source, preview, id)
    │
    ▼
Saved to chrome.storage.local (The Vault — 100% local, never leaves your device)
    │
    ▼
Popup re-renders history list ✅
```

---

## 🔐 Permissions Explained

| Permission | Why it's needed |
|------------|-----------------|
| `storage` | Save/load chats in `chrome.storage.local` |
| `activeTab` | Identify the current tab's URL |
| `scripting` | Inject content script if needed |
| `tabs` | Open the viewer in a new tab |
| `host_permissions` → chatgpt.com, gemini.google.com | Allow content script to run on these sites |

> **No network requests are made.** All data stays on your machine.

---

## ⚠️ Known Limitations

| Issue | Notes |
|-------|-------|
| **Selector drift** | ChatGPT and Gemini update their DOM regularly. If scraping breaks, the selectors in `content.js` may need updating. |
| **Dynamic loading** | Some messages may not be in the DOM if you haven't scrolled through them. Scroll through the full chat before saving. |
| **Refresh required** | After installing/updating the extension, refresh the ChatGPT or Gemini tab before saving. |
| **Storage limit** | `chrome.storage.local` has a 5MB default quota. Very long chats may approach this limit. |

---

## 🛣 Roadmap

- [ ] 🔍 Full-text search across saved chats
- [ ] 🏷 Tags and folders to organize chats
- [ ] 📤 Export to PDF
- [ ] 🔔 Auto-save mode (save on interval)
- [ ] 🌐 Add support for Claude (`claude.ai`) and Microsoft Copilot
- [ ] ☁️ Optional cloud backup via user-provided API key

---

## 🤝 Contributing

Pull requests are welcome! If ChatGPT or Gemini changes their DOM and scraping breaks, please open an issue with the new selector pattern.

1. Fork the repo
2. Create a branch: `git checkout -b fix/chatgpt-selectors`
3. Make changes and test locally
4. Submit a pull request

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 👤 Author

Built with ❤️ using vanilla JS and Chrome Extension APIs (Manifest V3).

---

> **Privacy note:** This extension never sends your data anywhere. All chat history is stored exclusively in your browser's local storage using `chrome.storage.local` and can be cleared at any time.
