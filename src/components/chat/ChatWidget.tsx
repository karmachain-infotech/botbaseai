import { useState, useEffect, useRef } from "react";
import { Bot, X, Send } from "lucide-react";
import { useThinkingAnimation } from "@/hooks/use-thinking-animation";
import { useTypewriter } from "@/hooks/use-typewriter";

function formatMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  const lines = html.split("\n");
  const result: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" = "ul";
  let blankCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^(\s*)[*-]\s+(.+)/);
    const numberedMatch = line.match(/^(\s*)\d+[.)]\s+(.+)/);

    if (bulletMatch) {
      if (!inList) { result.push('<ul style="margin:2px 0;padding-left:20px">'); inList = true; listType = "ul"; }
      result.push(`<li style="margin:2px 0">${bulletMatch[2]}</li>`);
      blankCount = 0;
    } else if (numberedMatch) {
      if (!inList) { result.push('<ol style="margin:2px 0;padding-left:20px">'); inList = true; listType = "ol"; }
      result.push(`<li style="margin:2px 0">${numberedMatch[2]}</li>`);
      blankCount = 0;
    } else {
      if (inList) { result.push(listType === "ul" ? "</ul>" : "</ol>"); inList = false; }
      if (line.trim() === "") {
        blankCount++;
      } else {
        if (blankCount > 0 && result.length > 0) {
          result.push('<span style="display:block;height:6px"></span>');
        }
        blankCount = 0;
        result.push(`<span>${line}</span>`);
      }
    }
  }
  if (inList) result.push(listType === "ul" ? "</ul>" : "</ol>");

  return result.join("");
}

const ALLOWED_TAGS = new Set(["strong", "em", "code", "pre", "ul", "ol", "li", "span", "br"]);
function sanitizeHtml(html: string): string {
  return html.replace(/<(\/?)(\w+)[^>]*>/g, (match, slash, tag) => {
    if (ALLOWED_TAGS.has(tag.toLowerCase())) return `<${slash}${tag}>`;
    return "";
  });
}

interface ChatWidgetProps {
  botId: string;
  botName: string;
  primaryColor: string;
  greeting: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatWidget({ botId, botName, primaryColor, greeting }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [fullText, setFullText] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);
  const sessionId = useRef("w_" + (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)) + "_" + Date.now());
  const conversationId = useRef<string | undefined>(undefined);

  const { displayedText, isTyping } = useTypewriter(fullText);
  const dots = useThinkingAnimation(thinking);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, displayedText, thinking]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [isOpen]);

  async function handleSend() {
    if (!input.trim() || thinking || isTyping) return;

    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setThinking(true);

    try {
      const res = await fetch("/api/playground/" + botId + "/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: msg,
          sessionId: sessionId.current,
          conversationId: conversationId.current,
        }),
      });

      if (!res.ok) throw new Error("Chat failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }

      conversationId.current = undefined;
      setThinking(false);
      setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
      setFullText(accumulated);
    } catch (err) {
      console.error("Widget chat error:", err);
      setThinking(false);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    }
  }

  return (
    <>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "90px",
            right: "20px",
            width: "360px",
            maxWidth: "calc(100vw - 40px)",
            height: "520px",
            maxHeight: "calc(100vh - 120px)",
            background: "white",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
            overflow: "hidden",
            border: "1px solid #e5e7eb",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <div
            style={{
              background: primaryColor,
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot style={{ width: "18px", height: "18px", color: "white" }} />
              </div>
              <span style={{ color: "white", fontWeight: 600, fontSize: "14px" }}>{botName}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.7)",
                padding: "4px",
              }}
            >
              <X style={{ width: "18px", height: "18px" }} />
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: "#f9fafb",
            }}
          >
            {messages.map((m, i) => {
              const isLastAssistant = i === messages.length - 1 && m.role === "assistant";
              const showTyping = isLastAssistant && isTyping;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "10px 14px",
                      borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      fontSize: "14px",
                      lineHeight: "1.6",
                      color: m.role === "user" ? "white" : "#1f2937",
                      background: m.role === "user" ? primaryColor : "white",
                      boxShadow: m.role === "user" ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                      wordBreak: "break-word",
                    }}
                  >
                    {showTyping ? (
                      <span>{displayedText}<span style={{ animation: "blink 1s step-start infinite" }}>|</span></span>
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatMarkdown(m.content)) }} />
                    )}
                  </div>
                </div>
              );
            })}

            {thinking && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  maxWidth: "80%",
                  padding: "10px 14px",
                  borderRadius: "16px 16px 16px 4px",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  color: "#1f2937",
                  background: "white",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}>
                  Thinking{dots}
                </div>
              </div>
            )}

            <div ref={chatEnd} />
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              padding: "12px 16px",
              borderTop: "1px solid #e5e7eb",
              background: "white",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              aria-label="Type your message"
              disabled={thinking || isTyping}
              style={{
                flex: 1,
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "14px",
                color: "#1f2937",
                outline: "none",
                background: "#f9fafb",
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || thinking || isTyping}
              aria-label="Send message"
              style={{
                border: "none",
                borderRadius: "10px",
                padding: "10px 14px",
                cursor: "pointer",
                color: "white",
                background: primaryColor,
                opacity: !input.trim() || thinking || isTyping ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send style={{ width: "16px", height: "16px" }} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          zIndex: 9999,
          background: primaryColor,
          color: "white",
          transition: "transform 0.2s",
        }}
      >
        {isOpen ? (
          <X style={{ width: "24px", height: "24px" }} />
        ) : (
          <Bot style={{ width: "24px", height: "24px" }} />
        )}
      </button>
    </>
  );
}
