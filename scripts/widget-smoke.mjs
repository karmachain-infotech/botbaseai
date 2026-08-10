import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeEl(tag) {
  return {
    tagName: tag.toUpperCase(),
    _id: null,
    className: "",
    textContent: "",
    value: "",
    disabled: false,
    _focused: false,
    children: [],
    parentNode: null,
    listeners: {},
    _innerHTML: "",
    _attrs: {},
    classList: {
      _s: new Set(),
      add(c) {
        this._s.add(c);
      },
      remove(c) {
        this._s.delete(c);
      },
      contains(c) {
        return this._s.has(c);
      },
    },
    style: {
      _p: {},
      setProperty(p, v) {
        this._p[p] = v;
      },
    },
    setAttribute(name, val) {
      this._attrs[name] = String(val);
    },
    getAttribute(name) {
      return this._attrs[name];
    },
    removeAttribute(name) {
      delete this._attrs[name];
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
    },
    removeChild(child) {
      const i = this.children.indexOf(child);
      if (i > -1) this.children.splice(i, 1);
    },
    addEventListener(type, fn) {
      (this.listeners[type] = this.listeners[type] || []).push(fn);
    },
    focus() {
      this._focused = true;
    },
    scrollTop: 0,
    scrollHeight: 0,
  };
}

const byId = {};

function parseHtml(html, parent) {
  const re = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>|<(\w+)([^>]*)\/>/g;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[1] || m[4];
    const attrs = m[2] || m[5] || "";
    const inner = m[3] || "";
    const e = wireEl(makeEl(tag));
    const idMatch = attrs.match(/id="([^"]+)"/);
    if (idMatch) {
      e._id = idMatch[1];
      byId[idMatch[1]] = e;
    }
    const clsMatch = attrs.match(/class="([^"]+)"/);
    if (clsMatch) e.className = clsMatch[1];
    parseHtml(inner, e);
    parent.appendChild(e);
  }
}

function wireEl(e) {
  Object.defineProperty(e, "className", {
    get() {
      return [...this.classList._s].join(" ");
    },
    set(v) {
      this.classList._s = new Set(v.split(/\s+/).filter(Boolean));
    },
  });
  Object.defineProperty(e, "id", {
    get() {
      return this._id;
    },
    set(v) {
      this._id = v;
      if (v) byId[v] = e;
    },
  });
  Object.defineProperty(e, "innerHTML", {
    get() {
      return this._innerHTML;
    },
    set(v) {
      this._innerHTML = v;
      this._text = undefined;
      this.children.length = 0;
      parseHtml(v, this);
    },
  });
  Object.defineProperty(e, "textContent", {
    get() {
      if (this._text !== undefined) return this._text;
      return this._innerHTML.replace(/<[^>]*>/g, "");
    },
    set(v) {
      this._text = v;
    },
  });
  Object.defineProperty(e, "firstChild", {
    get() {
      return this.children[0] || null;
    },
  });
  function matchSel(node, sel) {
    if (sel.startsWith("#")) return node._id === sel.slice(1);
    if (sel.startsWith(".")) return node.classList.contains(sel.slice(1));
    return node.tagName.toLowerCase() === sel;
  }
  function findSel(node, sel) {
    for (const c of node.children) {
      if (matchSel(c, sel)) return c;
      const found = findSel(c, sel);
      if (found) return found;
    }
    return null;
  }
  e.querySelector = function (sel) {
    return findSel(e, sel);
  };
  return e;
}

const documentStub = {
  currentScript: {
    getAttribute(name) {
      return name === "data-bot-id" ? "test-bot-123" : null;
    },
    src: "http://testhost/widget.js",
  },
  head: makeEl("head"),
  body: makeEl("body"),
  createElement(tag) {
    return wireEl(makeEl(tag));
  },
  getElementById(id) {
    return byId[id] || null;
  },
};

const context = {
  console,
  document: documentStub,
  localStorage: {
    _s: {},
    getItem(k) {
      return this._s[k];
    },
    setItem(k, v) {
      this._s[k] = v;
    },
  },
  fetch: (url) => {
    if (url.includes("/chat")) {
      const lines = [
        { type: "meta", conversationId: "conv-1" },
        { type: "chunk", content: "Hello from the " },
        { type: "chunk", content: "bot! **bold**" },
        { type: "done" },
      ]
        .map((l) => JSON.stringify(l) + "\n")
        .join("");
      const bytes = new TextEncoder().encode(lines);
      let offset = 0;
      return Promise.resolve({
        ok: true,
        body: {
          getReader() {
            return {
              read() {
                if (offset >= bytes.length) {
                  return Promise.resolve({ done: true, value: undefined });
                }
                const end = Math.min(bytes.length, offset + 4);
                const value = bytes.slice(offset, end);
                offset = end;
                return Promise.resolve({ done: false, value });
              },
              cancel() {},
            };
          },
        },
      });
    }
    return Promise.resolve({
      json: () =>
        Promise.resolve({
          primaryColor: "#7c3aed",
          botName: "Test Bot",
          greeting: "Hello! How can I help?",
        }),
    });
  },
  TextDecoder,
  TextEncoder,
  Math,
  Date,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
};
vm.createContext(context);

const src = readFileSync(join(__dirname, "../public/widget.js"), "utf8");
new vm.Script(src, { filename: "widget.js" }).runInContext(context);

function check(cond, name, extra) {
  if (!cond) {
    console.error("FAIL: " + name + (extra ? ": " + extra : ""));
    process.exit(1);
  }
  console.log("OK: " + name);
}

setTimeout(() => {
  const container = byId["bb-widget-container"];
  check(container, "widget rendered");

  const bubble = byId["bb-bubble"];
  check(bubble, "bubble exists");
  check(
    bubble._innerHTML.includes("M12 8V4H8"),
    "bubble shows robot icon when closed",
  );

  bubble.onclick();
  setTimeout(() => {
    const win = byId["bb-window"];
    check(win.classList.contains("bb-window-open"), "window opens");

    const inner = byId["bb-messages-inner"];
    const row = inner.children[0];
    check(
      row && row.className === "bb-row bb-row-bot",
      "greeting row rendered",
    );
    check(
      row.children[0].textContent === "Hello! How can I help?",
      "greeting text",
      row.children[0].textContent,
    );
    check(
      byId["bb-header-name"].textContent === "Test Bot",
      "header shows bot name",
    );
    check(
      bubble._innerHTML.includes("M18 6 6 18"),
      "bubble switches to X icon when open",
    );

    bubble.onclick();
    setTimeout(() => {
      check(
        bubble._innerHTML.includes("M12 8V4H8"),
        "bubble returns to robot icon when closed",
      );

      // ---- send message flow ----
      bubble.onclick();
      setTimeout(() => {
        const input = byId["bb-input"];
        const send = byId["bb-send"];
        input.value = "hi";
        input.listeners.input[0]();
        check(!send.disabled, "send enabled when input has text");

        send.listeners.click[0]();

        setTimeout(() => {
          const inner = byId["bb-messages-inner"];
          const rows = inner.children;
          const userRow = rows[rows.length - 2];
          const botRow = rows[rows.length - 1];
          check(
            userRow.className === "bb-row bb-row-user",
            "user message row rendered",
          );
          check(
            userRow.children[0].textContent === "hi",
            "user message text",
            userRow.children[0].textContent,
          );
          check(
            botRow.className === "bb-row bb-row-bot",
            "bot message row rendered",
          );
          check(
            botRow.children[0].textContent === "Hello from the bot! bold",
            "bot message text",
            botRow.children[0].textContent,
          );
          const botHtml = botRow.children[0]._innerHTML;
          check(
            botHtml.includes("Hello from the bot!") &&
              botHtml.includes("<strong>bold</strong>"),
            "bot markdown rendered",
            botHtml,
          );
          check(send.disabled, "send stays disabled after send clears input");
          input.value = "next";
          input.listeners.input[0]();
          check(!send.disabled, "send re-enabled when user types again");

          console.log("ALL SMOKE TESTS PASSED");
          process.exit(0);
        }, 1200);
      }, 250);
    }, 250);
  }, 300);
}, 50);
