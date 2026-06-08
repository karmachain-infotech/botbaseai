(function () {
  "use strict";

  var BOT_ID = document.currentScript && document.currentScript.getAttribute("data-bot-id");
  var BASE_URL = (document.currentScript && document.currentScript.getAttribute("data-base-url")) || "https://botbaseai.com";

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
  };

  // Store session
  localStorage.setItem("bb_session_" + BOT_ID, state.sessionId);

  // Inject styles
  var style = document.createElement("style");
  style.textContent =
    "#bb-widget-container * { box-sizing: border-box; margin: 0; padding: 0; }" +
    "#bb-widget-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }" +
    "#bb-bubble { position: fixed; bottom: 20px; right: 20px; z-index: 999999; width: 60px; height: 60px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3); transition: transform 0.2s; }" +
    "#bb-bubble:hover { transform: scale(1.05); }" +
    "#bb-bubble svg { width: 28px; height: 28px; fill: white; }" +
    "#bb-window { position: fixed; bottom: 90px; right: 20px; z-index: 999998; width: 380px; max-width: calc(100vw - 40px); height: 600px; max-height: calc(100vh - 120px); border-radius: 16px; display: none; flex-direction: column; box-shadow: 0 10px 60px rgba(0,0,0,0.5); overflow: hidden; }" +
    "#bb-header { padding: 16px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); }" +
    "#bb-header img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }" +
    "#bb-header-text { flex: 1; }" +
    "#bb-header-name { font-size: 15px; font-weight: 600; color: #fff; }" +
    "#bb-header-status { font-size: 12px; opacity: 0.8; }" +
    "#bb-close { background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 22px; padding: 4px; }" +
    "#bb-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }" +
    "#bb-messages-inner { display: flex; flex-direction: column; gap: 8px; }" +
    ".bb-msg { max-width: 85%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }" +
    ".bb-msg-user { align-self: flex-end; color: #fff; }" +
    ".bb-msg-bot { align-self: flex-start; }" +
    ".bb-typing { display: flex; gap: 4px; padding: 10px 14px; align-self: flex-start; border-radius: 14px; }" +
    ".bb-typing span { width: 8px; height: 8px; border-radius: 50%; animation: bbBounce 1.4s infinite; }" +
    ".bb-typing span:nth-child(2) { animation-delay: 0.2s; }" +
    ".bb-typing span:nth-child(3) { animation-delay: 0.4s; }" +
    "@keyframes bbBounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }" +
    "#bb-input-area { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 8px; }" +
    "#bb-input { flex: 1; border: none; border-radius: 10px; padding: 10px 14px; font-size: 14px; outline: none; }" +
    "#bb-send { border: none; border-radius: 10px; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity 0.2s; }" +
    "#bb-send:hover { opacity: 0.8; }" +
    "#bb-send svg { width: 18px; height: 18px; fill: white; }" +
    "#bb-send:disabled { opacity: 0.5; cursor: default; }" +
    "#bb-welcome { text-align: center; padding: 40px 20px; }" +
    "#bb-welcome p { margin-top: 8px; font-size: 14px; opacity: 0.7; }" +
    "@media (max-width: 480px) { #bb-window { right: 0; bottom: 0; width: 100%; max-width: 100%; height: 100%; max-height: 100%; border-radius: 0; } }";

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

  function renderWidget() {
    var cfg = state.config || {};
    var primary = cfg.primaryColor || "#7c3aed";
    var bg = cfg.backgroundColor || "#1e1b4b";

    var container = document.createElement("div");
    container.id = "bb-widget-container";

    // Bubble
    var bubble = document.createElement("div");
    bubble.id = "bb-bubble";
    bubble.style.background = primary;
    bubble.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h10v2H7zM7 12h7v2H7z"/></svg>';
    bubble.onclick = toggleWindow;
    container.appendChild(bubble);

    // Window
    var win = document.createElement("div");
    win.id = "bb-window";
    win.style.background = bg;
    win.style.color = cfg.textColor || "#fff";

    // Header
    var header = document.createElement("div");
    header.id = "bb-header";
    header.style.background = primary;
    header.innerHTML =
      (cfg.logoUrl ? '<img src="' + cfg.logoUrl + '" alt=""/>' : "") +
      '<div id="bb-header-text">' +
      '<div id="bb-header-name">' + (cfg.botName || "BotbaseAI Agent") + "</div>" +
      '<div id="bb-header-status">Online</div>' +
      "</div>" +
      '<button id="bb-close">&times;</button>';
    header.querySelector("#bb-close").onclick = toggleWindow;
    win.appendChild(header);

    // Messages area
    var msgs = document.createElement("div");
    msgs.id = "bb-messages";
    msgs.innerHTML =
      '<div id="bb-messages-inner">' +
      '<div id="bb-welcome">' +
      '<svg width="40" height="40" viewBox="0 0 24 24" style="opacity:0.6"><path fill="' + encodeURIComponent(cfg.textColor || "#fff") + '" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>' +
      "<p>" + (cfg.greeting || "Hi! How can I help you?") + "</p>" +
      "</div>" +
      "</div>";
    win.appendChild(msgs);

    // Input area
    var inputArea = document.createElement("div");
    inputArea.id = "bb-input-area";
    inputArea.style.borderTopColor = "rgba(255,255,255,0.1)";
    inputArea.innerHTML =
      '<input id="bb-input" placeholder="Type a message..." style="background:' + darken(bg, 20) + ";color:" + (cfg.textColor || "#fff") + '"/>' +
      '<button id="bb-send" style="background:' + primary + '">' +
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
      win.style.display = "flex";
      bubble.style.display = "none";
      setTimeout(function () {
        document.getElementById("bb-input").focus();
      }, 300);
    } else {
      win.style.display = "none";
      bubble.style.display = "flex";
    }
  }

  function addMessage(role, content) {
    var inner = document.getElementById("bb-messages-inner");
    var welcome = document.getElementById("bb-welcome");
    if (welcome) welcome.remove();

    var div = document.createElement("div");
    div.className = "bb-msg bb-msg-" + role;
    if (role === "user") {
      div.style.background = state.config ? state.config.primaryColor : "#7c3aed";
    } else {
      div.style.background = darken(state.config ? state.config.backgroundColor : "#1e1b4b", 15);
      div.style.color = state.config ? state.config.textColor || "#fff" : "#fff";
    }
    div.textContent = content;
    inner.appendChild(div);
    scrollToBottom();
  }

  function showTyping() {
    var inner = document.getElementById("bb-messages-inner");
    var typing = document.createElement("div");
    typing.className = "bb-typing";
    typing.id = "bb-typing";
    var bg = state.config ? state.config.backgroundColor : "#1e1b4b";
    typing.style.background = darken(bg, 15);
    for (var i = 0; i < 3; i++) {
      var dot = document.createElement("span");
      dot.style.background = state.config ? state.config.primaryColor : "#7c3aed";
      typing.appendChild(dot);
    }
    inner.appendChild(typing);
    scrollToBottom();
  }

  function hideTyping() {
    var typing = document.getElementById("bb-typing");
    if (typing) typing.remove();
  }

  function scrollToBottom() {
    var msgs = document.getElementById("bb-messages");
    msgs.scrollTop = msgs.scrollHeight;
  }

  function sendMessage() {
    var input = document.getElementById("bb-input");
    var text = input.value.trim();
    if (!text || state.streaming) return;

    input.value = "";
    addMessage("user", text);
    showTyping();
    state.streaming = true;

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
        return res.json();
      })
      .then(function (data) {
        hideTyping();
        state.conversationId = data.conversationId;
        addMessage("bot", data.content || "");
        state.streaming = false;
        // Disable send button
        document.getElementById("bb-send").disabled = false;
      })
      .catch(function () {
        hideTyping();
        addMessage("bot", "Sorry, I'm having trouble connecting. Please try again.");
        state.streaming = false;
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
