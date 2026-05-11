/**
 * content.js — The Field Agent
 * Injected into ChatGPT and Gemini pages.
 * Listens for "scrape_chat" messages and extracts all messages from the DOM.
 */

// ─── Detect which platform we're on ──────────────────────────────────────────
function detectPlatform() {
  const url = window.location.href;
  if (url.includes("chatgpt.com")) return "chatgpt";
  if (url.includes("gemini.google.com")) return "gemini";
  return "unknown";
}

// ─── Utility: try multiple selectors, return first that yields results ────────
function queryAll(...selectors) {
  for (const sel of selectors) {
    try {
      const result = document.querySelectorAll(sel);
      if (result.length > 0) return Array.from(result);
    } catch (e) {
      // invalid selector, skip
    }
  }
  return [];
}

// ─── ChatGPT Scraper ──────────────────────────────────────────────────────────
function scrapeChatGPT() {
  const messages = [];

  // ChatGPT wraps each message in an <article> with data-message-author-role
  const articles = queryAll(
    'article[data-message-author-role]',
    '[data-testid^="conversation-turn"]',
    '.group\\/conversation-turn'
  );

  if (articles.length === 0) {
    // Fallback: look for any structured turn containers
    const fallbackTurns = queryAll('[class*="ConversationItem"]', '[class*="message-"]');
    fallbackTurns.forEach((turn) => {
      const text = turn.innerText.trim();
      if (text) messages.push({ role: "unknown", text });
    });
    return messages;
  }

  articles.forEach((article) => {
    const role = article.getAttribute("data-message-author-role") || "unknown";

    // Extract text from the markdown content area
    const contentEl =
      article.querySelector(".markdown") ||
      article.querySelector('[data-message-content-editable="true"]') ||
      article.querySelector('[class*="prose"]') ||
      article.querySelector("p, li, pre") ||
      article;

    const text = contentEl ? contentEl.innerText.trim() : article.innerText.trim();
    if (text) {
      messages.push({
        role: role === "user" ? "user" : "assistant",
        text,
      });
    }
  });

  return messages;
}

// ─── Gemini Scraper ───────────────────────────────────────────────────────────
function scrapeGemini() {
  const messages = [];

  // Try to find the conversation container
  const turns = queryAll(
    'user-query',
    '.user-query',
    '[class*="user-query"]'
  );

  const responses = queryAll(
    'model-response',
    '.model-response',
    'message-content',
    '[class*="model-response"]',
    '[class*="response-container"]'
  );

  // Approach 1: Interleaved DOM — walk through the conversation in order
  const allTurns = queryAll(
    '.conversation-container > *',
    'chat-history > *',
    '[jsname] > [jsname]',
    '.ng-star-inserted'
  );

  if (allTurns.length > 0) {
    allTurns.forEach((el) => {
      const cls = (el.className || "").toLowerCase();
      const tag = (el.tagName || "").toLowerCase();

      let role = null;
      if (
        tag === "user-query" ||
        cls.includes("user-query") ||
        cls.includes("human") ||
        el.querySelector('[class*="user-query"]')
      ) {
        role = "user";
      } else if (
        tag === "model-response" ||
        tag === "message-content" ||
        cls.includes("model") ||
        cls.includes("response") ||
        el.querySelector("model-response, message-content")
      ) {
        role = "assistant";
      }

      if (role) {
        const text = el.innerText.trim();
        if (text && text.length > 1) {
          messages.push({ role, text });
        }
      }
    });
  }

  // Approach 2: Separate user + assistant queries if above didn't work
  if (messages.length === 0) {
    // Collect user queries
    const userEls = queryAll(
      'user-query',
      '.query-text',
      '[class*="query-text"]',
      '[data-initial-query]'
    );
    userEls.forEach((el) => {
      const text = el.innerText.trim();
      if (text) messages.push({ role: "user", text, _order: el.getBoundingClientRect().top });
    });

    // Collect model responses
    const modelEls = queryAll(
      'model-response',
      'message-content',
      '.response-content',
      '[class*="model-response-text"]'
    );
    modelEls.forEach((el) => {
      const text = el.innerText.trim();
      if (text) messages.push({ role: "assistant", text, _order: el.getBoundingClientRect().top });
    });

    // Sort by vertical position (approximate conversation order)
    messages.sort((a, b) => (a._order || 0) - (b._order || 0));
    messages.forEach((m) => delete m._order);
  }

  return messages;
}

// ─── Master scrape dispatcher ─────────────────────────────────────────────────
function scrapeMessages() {
  const platform = detectPlatform();

  let messages = [];
  if (platform === "chatgpt") {
    messages = scrapeChatGPT();
  } else if (platform === "gemini") {
    messages = scrapeGemini();
  }

  return { platform, messages };
}

// ─── Message Listener ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape_chat") {
    try {
      const result = scrapeMessages();
      sendResponse({ success: true, ...result });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }

  if (request.action === "ping") {
    sendResponse({ success: true, platform: detectPlatform() });
  }

  // IMPORTANT: return true to keep the message channel open for async response
  return true;
});
