(function () {
  "use strict";

  var BOT_ID = document.currentScript && document.currentScript.getAttribute("data-bot-id");
  var SCRIPT_SRC = document.currentScript && document.currentScript.src;
  var BASE_URL = (document.currentScript && document.currentScript.getAttribute("data-base-url")) || (SCRIPT_SRC ? SCRIPT_SRC.replace(/\/widget\.js.*$/, "") : "https://botbaseai.com");

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
    "#bb-widget-container, #bb-widget-container * { isolation: isolate; box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: normal; text-align: left; word-spacing: normal; letter-spacing: normal; font-variant: normal; font-weight: normal; font-style: normal; }" +
    "#bb-bubble { position: fixed; bottom: 20px; right: 20px; z-index: 2147483647; width: 60px; height: 60px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }" +
    "#bb-bubble:hover { transform: scale(1.05); }" +
    "#bb-bubble svg { width: 28px; height: 28px; fill: white; }" +
    "#bb-window { position: fixed; bottom: 90px; right: 20px; z-index: 2147483646; width: 380px; max-width: calc(100vw - 40px); height: 600px; max-height: calc(100vh - 120px); border-radius: 16px; display: none; flex-direction: column; box-shadow: 0 10px 60px rgba(0,0,0,0.5); overflow: hidden; transform-origin: bottom right; transform: scale(0.8); opacity: 0; }" +
    "#bb-header { padding: 16px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); }" +
    "#bb-header img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }" +
    "#bb-header-text { flex: 1; }" +
    "#bb-header-name { font-size: 15px; font-weight: 600; color: #fff; }" +
    "#bb-header-status { font-size: 12px; opacity: 0.8; }" +
    "#bb-close { background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 22px; padding: 4px; }" +
    "#bb-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }" +
    "#bb-messages-inner { display: flex; flex-direction: column; gap: 8px; }" +
    ".bb-msg { max-width: 85%!important; padding: 10px 14px!important; border-radius: 14px!important; font-size: 14px!important; line-height: 1.5!important; word-break: break-word!important; overflow-wrap: break-word!important; white-space: pre-wrap!important; }" +
    ".bb-msg-user { align-self: flex-end!important; color: #fff!important; }" +
    ".bb-msg-bot { align-self: flex-start!important; }" +
    ".bb-thinking { align-self: flex-start!important; padding: 10px 14px!important; border-radius: 14px!important; font-size: 14px!important; line-height: 1.5!important; }" +
    "#bb-cursor { animation: bbBlink 1s step-start infinite; }" +
    "@keyframes bbBlink { 0%,50% { opacity: 1; } 51%,100% { opacity: 0; } }" +
    "#bb-input-area { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 8px; }" +
    "#bb-input { flex: 1; border: none; border-radius: 10px; padding: 10px 14px; font-size: 14px; outline: none; }" +
    "#bb-send { border: none; border-radius: 10px; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; }" +
    "#bb-send:hover { opacity: 0.8; }" +
    "#bb-send svg { width: 18px; height: 18px; fill: white; }" +
    "#bb-send:disabled { opacity: 0.5; cursor: not-allowed; }" +
    "#bb-send:disabled:hover { opacity: 0.5; }" +
    "#bb-welcome { text-align: center!important; padding: 40px 20px!important; }" +
    "#bb-welcome p { margin-top: 8px!important; font-size: 14px!important; opacity: 0.7!important; }" +
    "@media (max-width: 480px) { #bb-window { right: 0; bottom: 0; width: 100%; max-width: 100%; height: 100%; max-height: 100%; border-radius: 0; } }" +
    "#bb-bubble { transform-origin: center; }" +
    "#bb-bubble::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid var(--bb-primary, #7c3aed); animation: bbPing 3s ease-out infinite; pointer-events: none; }" +
    "@keyframes bbPing { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.4); opacity: 0; } }" +
    "#bb-window.bb-window-open { display: flex; animation: bbWindowIn 280ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }" +
    "#bb-window.bb-window-closing { display: flex; animation: bbWindowOut 200ms ease-in forwards; }" +
    "@keyframes bbWindowIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }" +
    "@keyframes bbWindowOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0.8); opacity: 0; } }" +
    "#bb-window.bb-window-open #bb-welcome { animation: bbGreetingIn 320ms ease-out 150ms both; }" +
    "@keyframes bbGreetingIn { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }" +
    "@media (prefers-reduced-motion: reduce) { #bb-widget-container, #bb-widget-container * { animation: none !important; transition: none !important; } }";

  document.head.appendChild(style);

  // Fetch config
  fetch(BASE_URL + "/api/widget/" + BOT_ID + "/config")
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      state.config = cfg;
      renderWidget();
    })
    .catch(function () {
      state.config = {
        primaryColor: "#7c3aed",
        backgroundColor: "#1e1b4b",
        textColor: "#ffffff",
        greeting: "Hi! How can I help you?",
        botName: "BotbaseAI Agent",
      };
      renderWidget();
    });

  function setImportant(el, prop, value) {
    el.style.setProperty(prop, value, "important");
  }

  function renderWidget() {
    var cfg = state.config || {};
    var primary = cfg.primaryColor || "#7c3aed";
    var bg = cfg.backgroundColor || "#1e1b4b";

    var container = document.createElement("div");
    container.id = "bb-widget-container";

    // Bubble
    var bubble = document.createElement("div");
    bubble.id = "bb-bubble";
    setImportant(bubble, "position", "fixed");
    setImportant(bubble, "bottom", "20px");
    setImportant(bubble, "right", "20px");
    setImportant(bubble, "z-index", "2147483647");
    setImportant(bubble, "width", "60px");
    setImportant(bubble, "height", "60px");
    setImportant(bubble, "border-radius", "50%");
    setImportant(bubble, "cursor", "pointer");
    setImportant(bubble, "display", "flex");
    setImportant(bubble, "align-items", "center");
    setImportant(bubble, "justify-content", "center");
    setImportant(bubble, "box-shadow", "0 4px 20px rgba(0,0,0,0.3)");
    setImportant(bubble, "background", primary);
    bubble.style.setProperty("--bb-primary", primary);
    bubble.setAttribute("aria-label", "Open chat");
    bubble.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h10v2H7zM7 12h7v2H7z"/></svg>';
    bubble.onclick = toggleWindow;
    container.appendChild(bubble);

    // Window
    var win = document.createElement("div");
    win.id = "bb-window";
    setImportant(win, "position", "fixed");
    setImportant(win, "bottom", "90px");
    setImportant(win, "right", "20px");
    setImportant(win, "z-index", "2147483646");
    setImportant(win, "width", "380px");
    setImportant(win, "max-width", "calc(100vw - 40px)");
    setImportant(win, "height", "600px");
    setImportant(win, "max-height", "calc(100vh - 120px)");
    setImportant(win, "border-radius", "16px");
    setImportant(win, "flex-direction", "column");
    setImportant(win, "box-shadow", "0 10px 60px rgba(0,0,0,0.5)");
    setImportant(win, "overflow", "hidden");
    setImportant(win, "background", bg);
    setImportant(win, "color", cfg.textColor || "#fff");

    // Header
    var header = document.createElement("div");
    header.id = "bb-header";
    setImportant(header, "padding", "16px 20px");
    setImportant(header, "display", "flex");
    setImportant(header, "align-items", "center");
    setImportant(header, "gap", "12px");
    setImportant(header, "border-bottom", "1px solid rgba(255,255,255,0.1)");
    setImportant(header, "background", primary);
    header.innerHTML =
      (cfg.logoUrl ? '<img src="' + cfg.logoUrl + '" alt=""/>' : "") +
      '<div id="bb-header-text">' +
      '<div id="bb-header-name">' + (cfg.botName || "BotbaseAI Agent") + "</div>" +
      '<div id="bb-header-status">Online</div>' +
      "</div>" +
      '<button id="bb-close" aria-label="Close chat">&times;</button>';
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
    setImportant(msgs, "gap", "8px");
    msgs.innerHTML =
      '<div id="bb-messages-inner">' +
      '<div id="bb-welcome">' +
      '<svg width="40" height="40" viewBox="0 0 24 24" style="opacity:0.6"><path fill="' + (cfg.textColor || "#fff") + '" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>' +
      "<p>" + (cfg.greeting || "Hi! How can I help you?") + "</p>" +
      "</div>" +
      "</div>";
    var msgsInner = msgs.firstChild;
    setImportant(msgsInner, "display", "flex");
    setImportant(msgsInner, "flex-direction", "column");
    setImportant(msgsInner, "gap", "8px");
    win.appendChild(msgs);

    // Input area
    var inputArea = document.createElement("div");
    inputArea.id = "bb-input-area";
    setImportant(inputArea, "padding", "12px 16px");
    setImportant(inputArea, "border-top", "1px solid rgba(255,255,255,0.1)");
    setImportant(inputArea, "display", "flex");
    setImportant(inputArea, "gap", "8px");
    inputArea.innerHTML =
      '<input id="bb-input" placeholder="Type a message..." aria-label="Type your message" style="flex:1!important;border:none!important;border-radius:10px!important;padding:10px 14px!important;font-size:14px!important;outline:none!important;background:' + darken(bg, 20) + "!important;color:" + (cfg.textColor || "#fff") + '!important"/>' +
      '<button id="bb-send" aria-label="Send message" style="border:none!important;border-radius:10px!important;width:40px!important;height:40px!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;background:' + primary + '!important;">' +
      '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
      "</button>";
    win.appendChild(inputArea);

    container.appendChild(win);
    document.body.appendChild(container);

    // Input handler
    document.getElementById("bb-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") sendMessage();
    });
    document.getElementById("bb-send").addEventListener("click", sendMessage);
  }

  function toggleWindow() {
    state.open = !state.open;
    var win = document.getElementById("bb-window");
    var bubble = document.getElementById("bb-bubble");
    if (state.open) {
      win.classList.remove("bb-window-closing");
      win.classList.add("bb-window-open");
      setImportant(bubble, "display", "none");
      setTimeout(function () {
        var inp = document.getElementById("bb-input");
        if (inp) inp.focus();
      }, 300);
    } else {
      win.classList.remove("bb-window-open");
      win.classList.add("bb-window-closing");
      setImportant(bubble, "display", "flex");
      setTimeout(function () {
        win.classList.remove("bb-window-closing");
      }, 210);
    }
  }

  function addMessage(role, content) {
    var inner = document.getElementById("bb-messages-inner");
    if (!inner) return;
    var welcome = document.getElementById("bb-welcome");
    if (welcome) welcome.remove();

    var div = document.createElement("div");
    div.className = "bb-msg bb-msg-" + role;
    setImportant(div, "align-self", role === "user" ? "flex-end" : "flex-start");
    if (role === "user") {
      setImportant(div, "background", state.config ? state.config.primaryColor : "#7c3aed");
    } else {
      setImportant(div, "background", darken(state.config ? state.config.backgroundColor : "#1e1b4b", 15));
      setImportant(div, "color", state.config ? state.config.textColor || "#fff" : "#fff");
    }
    div.textContent = content;
    inner.appendChild(div);
    scrollToBottom();
  }

  function showThinking() {
    var inner = document.getElementById("bb-messages-inner");
    if (!inner) return;
    var welcome = document.getElementById("bb-welcome");
    if (welcome) welcome.remove();

    var el = document.createElement("div");
    el.className = "bb-thinking";
    el.id = "bb-thinking";
    setImportant(el, "background", darken(state.config ? state.config.backgroundColor : "#1e1b4b", 15));
    setImportant(el, "color", state.config ? state.config.textColor || "#fff" : "#fff");
    el.textContent = "Thinking.";
    inner.appendChild(el);
    scrollToBottom();

    state.dotCount = 1;
    state.thinkingDotTimer = setInterval(function () {
      state.dotCount = state.dotCount < 3 ? state.dotCount + 1 : 1;
      var thinkingEl = document.getElementById("bb-thinking");
      if (thinkingEl) thinkingEl.textContent = "Thinking" + ".".repeat(state.dotCount);
    }, 400);
  }

  function hideThinking() {
    if (state.thinkingDotTimer) {
      clearInterval(state.thinkingDotTimer);
      state.thinkingDotTimer = null;
    }
    var el = document.getElementById("bb-thinking");
    if (el) el.remove();
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
        state.displayedText = state.fullText.slice(0, state.displayedText.length + 1);
        updateBotMessage();
      } else {
        clearInterval(state.typewriterTimer);
        state.typewriterTimer = null;
        state.isTyping = false;
        updateBotMessage();
        document.getElementById("bb-send").disabled = false;
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
      el.textContent = state.fullText;
    }
    scrollToBottom();
  }

  function sendMessage() {
    var input = document.getElementById("bb-input");
    var text = input.value.trim();
    if (!text || state.thinking || state.isTyping) return;

    input.value = "";
    addMessage("user", text);
    state.thinking = true;
    document.getElementById("bb-send").disabled = true;
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

        var reader = res.body && res.body.getReader ? res.body.getReader() : null;
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
            hideThinking();
            state.thinking = false;
            state.fullText = fallbackContent || "Sorry, I'm having trouble connecting. Please try again.";

            var inner = document.getElementById("bb-messages-inner");
            var botMsgEl = document.createElement("div");
            botMsgEl.className = "bb-msg bb-msg-bot";
            if (state.currentBotMsgEl) state.currentBotMsgEl.removeAttribute("id");
            state.currentBotMsgEl = botMsgEl;
            setImportant(botMsgEl, "background", darken(state.config ? state.config.backgroundColor : "#1e1b4b", 15));
            setImportant(botMsgEl, "color", state.config ? state.config.textColor || "#fff" : "#fff");
            setImportant(botMsgEl, "align-self", "flex-start");
            inner.appendChild(botMsgEl);
            scrollToBottom();

            startTypewriter();
          });
        }

        var decoder = new TextDecoder();
        var buffer = "";
        var botContent = "";

        function readStream() {
          reader.read().then(function (result) {
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
                  hideThinking();
                  state.thinking = false;
                  state.fullText = botContent;

                  var inner = document.getElementById("bb-messages-inner");
                  var botMsgEl = document.createElement("div");
                  botMsgEl.className = "bb-msg bb-msg-bot";
                  if (state.currentBotMsgEl) state.currentBotMsgEl.removeAttribute("id");
                  state.currentBotMsgEl = botMsgEl;
                  setImportant(botMsgEl, "background", darken(state.config ? state.config.backgroundColor : "#1e1b4b", 15));
                  setImportant(botMsgEl, "color", state.config ? state.config.textColor || "#fff" : "#fff");
                  setImportant(botMsgEl, "align-self", "flex-start");
                  inner.appendChild(botMsgEl);
                  scrollToBottom();

                  startTypewriter();
                  return;
                } else if (data.type === "error") {
                  hideThinking();
                  state.thinking = false;
                  addMessage("bot", data.content || "Sorry, something went wrong. Please try again.");
                  document.getElementById("bb-send").disabled = false;
                  scrollToBottom();
                  return;
                }
              } catch (e) {
                // skip malformed lines
              }
            }

            if (result.done) {
              hideThinking();
              state.thinking = false;
              state.fullText = botContent;

              var inner = document.getElementById("bb-messages-inner");
              var botMsgEl = document.createElement("div");
              botMsgEl.className = "bb-msg bb-msg-bot";
              if (state.currentBotMsgEl) state.currentBotMsgEl.removeAttribute("id");
              state.currentBotMsgEl = botMsgEl;
              setImportant(botMsgEl, "background", darken(state.config ? state.config.backgroundColor : "#1e1b4b", 15));
              setImportant(botMsgEl, "color", state.config ? state.config.textColor || "#fff" : "#fff");
              setImportant(botMsgEl, "align-self", "flex-start");
              inner.appendChild(botMsgEl);
              scrollToBottom();

              startTypewriter();
              return;
            }

              readStream();
          }).catch(function () {
            hideThinking();
            state.thinking = false;
            state.fullText = botContent || "Sorry, I'm having trouble connecting. Please try again.";

            var inner = document.getElementById("bb-messages-inner");
            var botMsgEl = document.createElement("div");
            botMsgEl.className = "bb-msg bb-msg-bot";
            if (state.currentBotMsgEl) state.currentBotMsgEl.removeAttribute("id");
            state.currentBotMsgEl = botMsgEl;
            setImportant(botMsgEl, "background", darken(state.config ? state.config.backgroundColor : "#1e1b4b", 15));
            setImportant(botMsgEl, "color", state.config ? state.config.textColor || "#fff" : "#fff");
            setImportant(botMsgEl, "align-self", "flex-start");
            inner.appendChild(botMsgEl);
            scrollToBottom();

            startTypewriter();
          });
        }

        readStream();
      })
      .catch(function () {
        hideThinking();
        state.thinking = false;
        addMessage("bot", "Sorry, I'm having trouble connecting. Please try again.");
        document.getElementById("bb-send").disabled = false;
      });
  }

  function generateId() {
    return "bb_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
  }

  function darken(hex, amount) {
    if (!hex) return "#1a1a2e";
    var c = hex.replace("#", "");
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var r = Math.max(0, parseInt(c.substr(0, 2), 16) - amount);
    var g = Math.max(0, parseInt(c.substr(2, 2), 16) - amount);
    var b = Math.max(0, parseInt(c.substr(4, 2), 16) - amount);
    return "#" + r.toString(16).padStart(2, "0") + g.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0");
  }
})();
