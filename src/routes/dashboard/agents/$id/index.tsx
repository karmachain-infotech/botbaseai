import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Bot, Send, ArrowLeft, Sparkles, BarChart3, Settings, FileText, Code2, Activity } from "lucide-react";
import { getChatbot } from "@/lib/server-functions/chatbots";
import { Skeleton } from "@/components/ui/skeleton";
import type { Chatbot } from "@/types/database";

export const Route = createFileRoute("/dashboard/agents/$id/")({
  component: AgentPlayground,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const agentTabs = [
  { label: "Playground", to: "/dashboard/agents/$id", icon: Bot },
  { label: "Sources", to: "/dashboard/agents/$id/sources", icon: FileText },
  { label: "Analytics", to: "/dashboard/agents/$id/analytics", icon: BarChart3 },
  { label: "Activity", to: "/dashboard/agents/$id/activity", icon: Activity },
  { label: "Settings", to: "/dashboard/agents/$id/settings", icon: Settings },
  { label: "Widget", to: "/dashboard/agents/$id/embed-test", icon: Code2 },
];

function AgentPlayground() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [agent, setAgent] = useState<Pick<Chatbot, "name" | "status"> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [fullText, setFullText] = useState("");
  const [error, setError] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);

  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    if (!thinking) {
      setDotCount(1);
      return;
    }
    const interval = setInterval(() => {
      setDotCount((prev) => (prev < 3 ? prev + 1 : 1));
    }, 400);
    return () => clearInterval(interval);
  }, [thinking]);

  useEffect(() => {
    if (!isTyping) return;
    if (displayedText.length < fullText.length) {
      const timer = setTimeout(() => {
        setDisplayedText(fullText.slice(0, displayedText.length + 1));
      }, 25);
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, [isTyping, displayedText, fullText]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, displayedText, thinking]);

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
    if (!input.trim() || thinking || isTyping) return;

    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setThinking(true);
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

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }

      setThinking(false);
      setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
      setFullText(accumulated);
      setDisplayedText("");
      setIsTyping(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      console.error("Chat error:", err);
      setThinking(false);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    }
  }

  const [agentLoading, setAgentLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getChatbot({ data: { id } }).then((bot) => {
      if (bot && !cancelled) setAgent(bot as Pick<Chatbot, "name" | "status">);
    }).catch((err) => {
      console.error("Failed to load agent:", err);
      if (!cancelled) setError("Failed to load agent.");
    }).finally(() => {
      if (!cancelled) setAgentLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  if (agentLoading) {
    return (
      <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 py-6">
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-1 h-4 w-16" />
          </div>
        </div>
        <Skeleton className="mt-4 h-10 w-full rounded-xl" />
        <Skeleton className="mt-4 flex-1 rounded-2xl" />
        <div className="mt-4 flex gap-3">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 w-24 rounded-xl" />
        </div>
      </div>
    );
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

      <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {agentTabs.map((tab) => {
          const tabTo = tab.to.replace("$id", id).replace(/\/$/, "");
          const isActive = pathname.replace(/\/$/, "") === tabTo;
          return (
            <Link key={tab.label} to={tab.to} params={{ id }}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gradient-brand text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              <tab.icon className="h-4 w-4" /> {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-4">
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
          {messages.map((m, i) => {
            const isLastAssistant = i === messages.length - 1 && m.role === "assistant";
            const displayContent = isLastAssistant && isTyping ? displayedText : m.content;
            return (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user" ? "bg-gradient-brand text-primary-foreground" : "bg-secondary text-foreground"
                }`}>
                  {displayContent}
                  {isLastAssistant && isTyping && (
                    <span className="animate-blink">|</span>
                  )}
                </div>
              </div>
            );
          })}

          {thinking && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl bg-secondary px-4 py-3 text-sm text-foreground">
                Thinking{".".repeat(dotCount)}
              </div>
            </div>
          )}

          <div ref={chatEnd} />
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a test message..." disabled={thinking || isTyping}
          className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-primary" />
        <button onClick={handleSend} disabled={!input.trim() || thinking || isTyping}
          className="flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
          <Send className="h-4 w-4" />
          Send
        </button>
      </div>
    </div>
  );
}
