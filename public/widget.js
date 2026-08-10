(function () {
  "use strict";

  var BOT_ID =
    document.currentScript &&
    document.currentScript.getAttribute("data-bot-id");
  var SCRIPT_SRC = document.currentScript && document.currentScript.src;
  var BASE_URL =
    (document.currentScript &&
      document.currentScript.getAttribute("data-base-url")) ||
    (SCRIPT_SRC
      ? SCRIPT_SRC.replace(/\/widget\.js.*$/, "")
      : "https://botbaseai.com");

  if (!BOT_ID) {
    console.error("BotbaseAI Widget: missing data-bot-id attribute");
    return;
  }

  var state = {
    open: false,
    sessionId: localStorage.getItem("bb_session_" + BOT_ID) || generateId(),
    conversationId: null,
    messages: [],
    config: null,
    streaming: false,
    thinking: false,
    isTyping: false,
    displayedText: "",
    fullText: "",
    typewriterTimer: null,
    thinkingDotTimer: null,
    dotCount: 1,
    currentBotMsgEl: null,
  };

  // Store session
  localStorage.setItem("bb_session_" + BOT_ID, state.sessionId);

  // Inject styles
  var style = document.createElement("style");
  style.textContent =
    "#bb-widget-container, #bb-widget-container * { isolation: isolate; box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; text-align: left; word-spacing: normal; letter-spacing: normal; font-variant: normal; font-weight: normal; font-style: normal; }" +
    "#bb-bubble { position: fixed; bottom: 20px; right: 20px; z-index: 2147483647; width: 56px; height: 56px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.2); border: none; transition: transform 0.2s ease; }" +
    "#bb-bubble:hover { transform: scale(1.05); }" +
    "#bb-bubble svg { width: 24px; height: 24px; }" +
    "#bb-window { position: fixed; bottom: 90px; right: 20px; z-index: 2147483646; width: 360px; max-width: calc(100vw - 40px); height: 520px; max-height: calc(100vh - 120px); border-radius: 16px; display: none; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.15); overflow: hidden; background: #ffffff; border: 1px solid #e5e7eb; transform-origin: bottom right; }" +
    "#bb-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }" +
    "#bb-header-left { display: flex; align-items: center; gap: 10px; min-width: 0; }" +
    "#bb-header-icon { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }" +
    "#bb-header-icon svg { width: 18px; height: 18px; }" +
    "#bb-header-name { color: #fff; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }" +
    "#bb-close { background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; padding: 4px; display: flex; }" +
    "#bb-close svg { width: 18px; height: 18px; }" +
    "#bb-messages { flex: 1 1 0; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; background: #f9fafb; }" +
    "#bb-messages-inner { display: flex; flex-direction: column; gap: 12px; }" +
    ".bb-row { display: flex; }" +
    ".bb-row-user { justify-content: flex-end; }" +
    ".bb-row-bot { justify-content: flex-start; }" +
    ".bb-msg { max-width: 80% !important; padding: 10px 14px !important; font-size: 14px !important; line-height: 1.6 !important; word-break: break-word !important; overflow-wrap: break-word !important; white-space: pre-wrap !important; }" +
    ".bb-msg-user { background: var(--bb-primary, #7c3aed) !important; color: #fff !important; border-radius: 16px 16px 4px 16px !important; }" +
    ".bb-msg-bot { background: #fff !important; color: #1f2937 !important; border-radius: 16px 16px 16px 4px !important; box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important; }" +
    ".bb-msg-bot pre { background: #f3f4f6 !important; padding: 8px !important; border-radius: 8px !important; overflow-x: auto !important; margin: 6px 0 !important; font-size: 13px !important; }" +
    ".bb-msg-bot code { background: #f3f4f6 !important; padding: 1px 4px !important; border-radius: 4px !important; font-size: 13px !important; }" +
    ".bb-msg-bot pre code { background: none !important; padding: 0 !important; }" +
    ".bb-msg-bot ul, .bb-msg-bot ol { margin: 4px 0 4px 20px !important; padding: 0 !important; }" +
    ".bb-msg-bot li { margin: 2px 0 !important; }" +
    ".bb-msg-bot strong { font-weight: 600; }" +
    ".bb-thinking { max-width: 80% !important; padding: 10px 14px !important; border-radius: 16px 16px 16px 4px !important; font-size: 14px !important; line-height: 1.6 !important; color: #1f2937 !important; background: #fff !important; box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important; align-self: flex-start !important; }" +
    "#bb-input-area { padding: 12px 16px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px; background: #ffffff; }" +
    "#bb-input { flex: 1; border: 1px solid #d1d5db; border-radius: 10px; padding: 10px 14px; font-size: 14px; color: #1f2937; outline: none; background: #f9fafb; }" +
    "#bb-input::placeholder { color: #9ca3af; }" +
    "#bb-send { border: none; border-radius: 10px; padding: 10px 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; background: var(--bb-primary, #7c3aed); }" +
    "#bb-send svg { width: 16px; height: 16px; }" +
    "#bb-send:hover { opacity: 0.85; }" +
    "#bb-send:disabled { opacity: 0.6; cursor: not-allowed; }" +
    "#bb-send:disabled:hover { opacity: 0.6; }" +
    "#bb-cursor { animation: bbBlink 1s step-start infinite; }" +
    "@keyframes bbBlink { 0%,50% { opacity: 1; } 51%,100% { opacity: 0; } }" +
    "#bb-window.bb-window-open { display: flex; animation: bbWindowIn 220ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }" +
    "#bb-window.bb-window-closing { display: flex; animation: bbWindowOut 180ms ease-in forwards; }" +
    "@keyframes bbWindowIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }" +
    "@keyframes bbWindowOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0.9); opacity: 0; } }" +
    "@media (max-width: 480px) { #bb-window { right: 0; bottom: 0; width: 100%; max-width: 100%; height: 100%; max-height: 100%; border-radius: 0; } }" +
    "@media (prefers-reduced-motion: reduce) { #bb-widget-container, #bb-widget-container * { animation: none !important; transition: none !important; } }";

  document.head.appendChild(style);

  // Fetch config
  fetch(BASE_URL + "/api/widget/" + BOT_ID + "/config")
    .then(function (r) {
      return r.json();
    })
    .then(function (cfg) {
      state.config = cfg;
      renderWidget();
    })
    .catch(function () {
      state.config = {
        primaryColor: "#7c3aed",
        botName: "AI Assistant",
        greeting: "Hi! How can I help you today?",
      };
      renderWidget();
    });

  var ICONS = {
    bot:
      '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    send:
      '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  };

  var ALLOWED_TAGS = new Set([
    "strong",
    "em",
    "code",
    "pre",
    "ul",
    "ol",
    "li",
    "span",
    "br",
  ]);

  function sanitizeHtml(html) {
    return html.replace(/<(\/?)(\w+)[^>]*>/g, function (match, slash, tag) {
      if (ALLOWED_TAGS.has(tag.toLowerCase())) return "<" + slash + tag + ">";
      return "";
    });
  }

  function formatMarkdown(text) {
    var html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    var lines = html.split("\n");
    var result = [];
    var inList = false;
    var listType = "ul";
    var blankCount = 0;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var bulletMatch = line.match(/^(\s*)[*-]\s+(.+)/);
      var numberedMatch = line.match(/^(\s*)\d+[.)]\s+(.+)/);

      if (bulletMatch) {
        if (!inList) {
          result.push("<ul>");
          inList = true;
          listType = "ul";
        }
        result.push("<li>" + bulletMatch[2] + "</li>");
        blankCount = 0;
      } else if (numberedMatch) {
        if (!inList) {
          result.push("<ol>");
          inList = true;
          listType = "ol";
        }
        result.push("<li>" + numberedMatch[2] + "</li>");
        blankCount = 0;
      } else {
        if (inList) {
          result.push(listType === "ul" ? "</ul>" : "</ol>");
          inList = false;
        }
        if (line.trim() === "") {
          blankCount++;
        } else {
          if (blankCount > 0 && result.length > 0) {
            result.push("<br>");
          }
          blankCount = 0;
          result.push("<span>" + line + "</span>");
        }
      }
    }
    if (inList) result.push(listType === "ul" ? "</ul>" : "</ol>");

    return result.join("");
  }

  function setImportant(el, prop, value) {
    el.style.setProperty(prop, value, "important");
  }

  function renderWidget() {
    var cfg = state.config || {};
    var primary = cfg.primaryColor || "#7c3aed";
    var name = cfg.botName || "AI Assistant";

    var container = document.createElement("div");
    container.id = "bb-widget-container";
    container.style.setProperty("--bb-primary", primary);

    // Bubble
    var bubble = document.createElement("button");
    bubble.id = "bb-bubble";
    bubble.type = "button";
    bubble.setAttribute("aria-label", "Open chat");
    setImportant(bubble, "position", "fixed");
    setImportant(bubble, "bottom", "20px");
    setImportant(bubble, "right", "20px");
    setImportant(bubble, "z-index", "2147483647");
    setImportant(bubble, "width", "56px");
    setImportant(bubble, "height", "56px");
    setImportant(bubble, "border-radius", "50%");
    setImportant(bubble, "cursor", "pointer");
    setImportant(bubble, "display", "flex");
    setImportant(bubble, "align-items", "center");
    setImportant(bubble, "justify-content", "center");
    setImportant(bubble, "box-shadow", "0 4px 16px rgba(0,0,0,0.2)");
    setImportant(bubble, "border", "none");
    setImportant(bubble, "background", primary);
    bubble.innerHTML = ICONS.bot;
    bubble.onclick = toggleWindow;
    container.appendChild(bubble);

    // Window
    var win = document.createElement("div");
    win.id = "bb-window";
    setImportant(win, "position", "fixed");
    setImportant(win, "bottom", "90px");
    setImportant(win, "right", "20px");
    setImportant(win, "z-index", "2147483646");
    setImportant(win, "width", "360px");
    setImportant(win, "max-width", "calc(100vw - 40px)");
    setImportant(win, "height", "520px");
    setImportant(win, "max-height", "calc(100vh - 120px)");
    setImportant(win, "border-radius", "16px");
    setImportant(win, "flex-direction", "column");
    setImportant(win, "box-shadow", "0 8px 32px rgba(0,0,0,0.15)");
    setImportant(win, "overflow", "hidden");
    setImportant(win, "background", "#ffffff");
    setImportant(win, "border", "1px solid #e5e7eb");
    win.style.setProperty("--bb-primary", primary);

    // Header
    var header = document.createElement("div");
    header.id = "bb-header";
    setImportant(header, "padding", "16px 20px");
    setImportant(header, "display", "flex");
    setImportant(header, "align-items", "center");
    setImportant(header, "justify-content", "space-between");
    setImportant(header, "gap", "12px");
    setImportant(header, "background", primary);
    header.innerHTML =
      '<div id="bb-header-left">' +
      '<div id="bb-header-icon">' +
      ICONS.bot +
      "</div>" +
      '<div id="bb-header-name"></div>' +
      "</div>" +
      '<button id="bb-close" type="button" aria-label="Close chat">' +
      ICONS.close +
      "</button>";
    header.querySelector("#bb-header-name").textContent = name;
    header.querySelector("#bb-close").onclick = toggleWindow;
    win.appendChild(header);

    // Messages area
    var msgs = document.createElement("div");
    msgs.id = "bb-messages";
    setImportant(msgs, "flex", "1 1 0");
    setImportant(msgs, "overflow-y", "auto");
    setImportant(msgs, "padding", "16px");
    setImportant(msgs, "display", "flex");
    setImportant(msgs, "flex-direction", "column");
    setImportant(msgs, "background", "#f9fafb");
    var msgsInner = document.createElement("div");
    msgsInner.id = "bb-messages-inner";
    setImportant(msgsInner, "display", "flex");
    setImportant(msgsInner, "flex-direction", "column");
    setImportant(msgsInner, "gap", "12px");
    msgs.appendChild(msgsInner);
    win.appendChild(msgs);

    // Input area
    var inputArea = document.createElement("div");
    inputArea.id = "bb-input-area";
    setImportant(inputArea, "padding", "12px 16px");
    setImportant(inputArea, "border-top", "1px solid #e5e7eb");
    setImportant(inputArea, "display", "flex");
    setImportant(inputArea, "gap", "8px");
    setImportant(inputArea, "background", "#ffffff");
    inputArea.innerHTML =
      '<input id="bb-input" placeholder="Type a message..." aria-label="Type your message"/>' +
      '<button id="bb-send" type="button" aria-label="Send message" disabled>' +
      ICONS.send +
      "</button>";
    win.appendChild(inputArea);

    container.appendChild(win);
    document.body.appendChild(container);

    // Input handler
    var input = document.getElementById("bb-input");
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") sendMessage();
    });
    input.addEventListener("input", updateSendState);
    document.getElementById("bb-send").addEventListener("click", sendMessage);
  }

  function updateSendState() {
    var send = document.getElementById("bb-send");
    var input = document.getElementById("bb-input");
    if (!send || !input) return;
    send.disabled = !input.value.trim() || state.thinking || state.isTyping;
  }

  function toggleWindow() {
    state.open = !state.open;
    var win = document.getElementById("bb-window");
    var bubble = document.getElementById("bb-bubble");
    if (state.open) {
      win.classList.remove("bb-window-closing");
      win.classList.add("bb-window-open");
      bubble.innerHTML = ICONS.close;
      bubble.setAttribute("aria-label", "Close chat");
      ensureGreeting();
      setTimeout(function () {
        var inp = document.getElementById("bb-input");
        if (inp) inp.focus();
      }, 250);
    } else {
      win.classList.remove("bb-window-open");
      win.classList.add("bb-window-closing");
      bubble.innerHTML = ICONS.bot;
      bubble.setAttribute("aria-label", "Open chat");
      setTimeout(function () {
        win.classList.remove("bb-window-closing");
      }, 190);
    }
  }

  function hasMessages() {
    var inner = document.getElementById("bb-messages-inner");
    return inner && inner.querySelector(".bb-msg") ? true : false;
  }

  function ensureGreeting() {
    if (hasMessages()) return;
    var cfg = state.config || {};
    addMessage("bot", cfg.greeting || "Hi! How can I help you today?");
  }

  function addMessage(role, content) {
    var inner = document.getElementById("bb-messages-inner");
    if (!inner) return;
    var row = document.createElement("div");
    row.className = "bb-row bb-row-" + role;
    var el = document.createElement("div");
    el.className = "bb-msg bb-msg-" + role;
    if (role === "user") {
      el.textContent = content;
    } else {
      el.innerHTML = sanitizeHtml(formatMarkdown(content));
    }
    row.appendChild(el);
    inner.appendChild(row);
    scrollToBottom();
  }

  function showThinking() {
    var inner = document.getElementById("bb-messages-inner");
    if (!inner) return;
    var row = document.createElement("div");
    row.className = "bb-row bb-row-bot";
    var el = document.createElement("div");
    el.className = "bb-thinking";
    el.id = "bb-thinking";
    el.textContent = "Thinking.";
    row.appendChild(el);
    inner.appendChild(row);
    scrollToBottom();

    state.dotCount = 1;
    state.thinkingDotTimer = setInterval(function () {
      state.dotCount = state.dotCount < 3 ? state.dotCount + 1 : 1;
      var thinkingEl = document.getElementById("bb-thinking");
      if (thinkingEl)
        thinkingEl.textContent = "Thinking" + ".".repeat(state.dotCount);
    }, 400);
  }

  function hideThinking() {
    if (state.thinkingDotTimer) {
      clearInterval(state.thinkingDotTimer);
      state.thinkingDotTimer = null;
    }
    var el = document.getElementById("bb-thinking");
    if (!el) return;
    var row = el.parentNode;
    if (row && row.parentNode) row.parentNode.removeChild(row);
    else if (el.parentNode) el.parentNode.removeChild(el);
  }

  function scrollToBottom() {
    var msgs = document.getElementById("bb-messages");
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function startTypewriter() {
    state.isTyping = true;
    state.displayedText = "";
    state.typewriterTimer = setInterval(function () {
      if (state.displayedText.length < state.fullText.length) {
        state.displayedText = state.fullText.slice(
          0,
          state.displayedText.length + 1,
        );
        updateBotMessage();
      } else {
        clearInterval(state.typewriterTimer);
        state.typewriterTimer = null;
        state.isTyping = false;
        updateBotMessage();
        updateSendState();
      }
    }, 25);
  }

  function updateBotMessage() {
    var el = state.currentBotMsgEl;
    if (!el) return;
    if (state.isTyping) {
      el.textContent = state.displayedText;
      var cursor = el.querySelector("#bb-cursor");
      if (!cursor) {
        cursor = document.createElement("span");
        cursor.id = "bb-cursor";
        el.appendChild(cursor);
      }
      cursor.textContent = "|";
    } else {
      el.textContent = "";
      el.innerHTML = sanitizeHtml(formatMarkdown(state.fullText));
    }
    scrollToBottom();
  }

  function renderBotResponse(content) {
    hideThinking();
    state.thinking = false;
    state.fullText = content;

    var inner = document.getElementById("bb-messages-inner");
    if (!inner) return;
    var row = document.createElement("div");
    row.className = "bb-row bb-row-bot";
    var botMsgEl = document.createElement("div");
    botMsgEl.className = "bb-msg bb-msg-bot";
    row.appendChild(botMsgEl);
    inner.appendChild(row);
    state.currentBotMsgEl = botMsgEl;
    scrollToBottom();
    startTypewriter();
  }

  function sendMessage() {
    var input = document.getElementById("bb-input");
    var text = input.value.trim();
    if (!text || state.thinking || state.isTyping) return;

    input.value = "";
    addMessage("user", text);
    state.thinking = true;
    updateSendState();
    showThinking();

    var url = BASE_URL + "/api/widget/" + BOT_ID + "/chat";
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: text,
        sessionId: state.sessionId,
        conversationId: state.conversationId,
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Chat error");

        var reader =
          res.body && res.body.getReader ? res.body.getReader() : null;
        if (!reader) {
          return res.text().then(function (text) {
            var lines = text.split("\n");
            var fallbackContent = "";
            for (var i = 0; i < lines.length; i++) {
              var line = lines[i].trim();
              if (!line) continue;
              try {
                var d = JSON.parse(line);
                if (d.type === "meta") state.conversationId = d.conversationId;
                else if (d.type === "chunk") fallbackContent += d.content;
              } catch (e) {}
            }
            renderBotResponse(
              fallbackContent ||
                "Sorry, I'm having trouble connecting. Please try again.",
            );
          });
        }

        var decoder = new TextDecoder();
        var buffer = "";
        var botContent = "";

        function readStream() {
          reader
            .read()
            .then(function (result) {
              if (result.value) {
                buffer += decoder.decode(result.value, { stream: true });
              }

              var lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (!line) continue;

                try {
                  var data = JSON.parse(line);
                  if (data.type === "meta") {
                    state.conversationId = data.conversationId;
                  } else if (data.type === "chunk") {
                    botContent += data.content;
                  } else if (data.type === "done") {
                    renderBotResponse(botContent);
                    return;
                  } else if (data.type === "error") {
                    hideThinking();
                    state.thinking = false;
                    addMessage(
                      "bot",
                      data.content ||
                        "Sorry, something went wrong. Please try again.",
                    );
                    updateSendState();
                    scrollToBottom();
                    return;
                  }
                } catch (e) {
                  // skip malformed lines
                }
              }

              if (result.done) {
                renderBotResponse(botContent);
                return;
              }

              readStream();
            })
            .catch(function () {
              renderBotResponse(
                botContent ||
                  "Sorry, I'm having trouble connecting. Please try again.",
              );
            });
        }

        readStream();
      })
      .catch(function () {
        hideThinking();
        state.thinking = false;
        addMessage(
          "bot",
          "Sorry, I'm having trouble connecting. Please try again.",
        );
        updateSendState();
      });
  }

  function generateId() {
    return "bb_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
  }
})();
