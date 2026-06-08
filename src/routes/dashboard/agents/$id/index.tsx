import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Bot, Send, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { getChatbot } from "@/lib/server-functions/chatbots";
import type { Chatbot } from "@/types/database";

export const Route = createFileRoute("/dashboard/agents/$id/")({
  component: AgentPlayground,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function AgentPlayground() {
  const { id } = Route.useParams();
  const [agent, setAgent] = useState<Pick<Chatbot, "name" | "status"> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getChatbot({ data: { id } }).then((bot) => {
      if (bot && !cancelled) setAgent(bot as Pick<Chatbot, "name" | "status">);
    }).catch((err) => {
      console.error("Failed to load agent:", err);
      if (!cancelled) setError("Failed to load agent.");
    });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sessionIdRef = useRef<string>("");
  function getSessionId() {
    if (sessionIdRef.current) return sessionIdRef.current;
    try {
      if (typeof window !== "undefined") {
        const existing = localStorage.getItem("playground_session");
        if (existing) { sessionIdRef.current = existing; return existing; }
      }
      const id = crypto.randomUUID();
      sessionIdRef.current = id;
      if (typeof window !== "undefined") localStorage.setItem("playground_session", id);
      return id;
    } catch {
      const fallback = "pg_" + Math.random().toString(36).slice(2, 9) + "_" + Date.now();
      sessionIdRef.current = fallback;
      return fallback;
    }
  }

  async function handleSend() {
    if (!input.trim() || streaming) return;

    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setStreaming(true);
    setError("");

    try {
      const response = await fetch("/api/playground/" + id + "/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: msg, sessionId: getSessionId() }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Chat failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullContent += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullContent };
          return updated;
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 py-6">
        <Link to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to agents
        </Link>
        <div className="mt-8 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 py-6">
      <Link to="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to agents
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </span>
        <div>
          <h1 className="text-xl font-bold">{agent?.name ?? "Loading..."}</h1>
          <span className="text-sm text-muted-foreground">
            {agent?.status === "live" ? "Live" : "Draft"} agent
          </span>
        </div>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Sparkles className="h-10 w-10 text-primary" />
            <p className="text-lg font-semibold">Test your agent</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Send a message below or try a sample.
            </p>
            <button onClick={() => { setInput("Hello! What can you help me with?"); }}
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80">
              Try "Hello! What can you help me with?"
            </button>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user" ? "bg-gradient-brand text-primary-foreground" : "bg-secondary text-foreground"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          <div ref={chatEnd} />
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a test message..." disabled={streaming}
          className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-primary" />
        <button onClick={handleSend} disabled={!input.trim() || streaming}
          className="flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </button>
      </div>
    </div>
  );
}
