import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Bot, Code2, Loader2 } from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { getChatbot } from "@/lib/server-functions/chatbots";
import { getAppUrl } from "@/lib/server-functions/config";
import type { Chatbot } from "@/types/database";

export const Route = createFileRoute("/dashboard/livedemo")({
  component: LiveDemo,
});

function LiveDemo() {
  const [embedCode, setEmbedCode] = useState("");
  const [botId, setBotId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState("");
  const [agent, setAgent] = useState<Chatbot | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [defaultBase, setDefaultBase] = useState("https://botbaseai.com");

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    getAppUrl()
      .then((url) => {
        if (mountedRef.current) setDefaultBase(url);
      })
      .catch(() => {});
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function fetchAgent(id: string) {
    setAgent(null);
    setAgentLoading(true);
    getChatbot({ data: { id } })
      .then((bot) => {
        if (bot && mountedRef.current) setAgent(bot as unknown as Chatbot);
      })
      .catch(() => {
        if (mountedRef.current)
          setError("Failed to load agent config. Using defaults.");
      })
      .finally(() => {
        if (mountedRef.current) setAgentLoading(false);
      });
  }

  function handleCodeChange(code: string) {
    setEmbedCode(code);
    setError("");
    setBotId("");
    setBaseUrl("");
    setAgent(null);

    const botIdMatch = code.match(/data-bot-id=["']([^"']+)["']/);
    if (!botIdMatch) {
      if (code.trim())
        setError("Could not find data-bot-id in the embed code.");
      return;
    }

    const id = botIdMatch[1];
    const srcMatch = code.match(/src=["']([^"']+)\/widget\.js["']/);
    const baseMatch = code.match(/data-base-url=["']([^"']+)["']/);
    const url = baseMatch?.[1] || (srcMatch?.[1] ?? "");

    setBotId(id);
    setBaseUrl(url);
    fetchAgent(id);
  }

  const botName = agent?.name ?? "AI Assistant";
  const primaryColor = agent?.widget_config?.primaryColor ?? "#6366f1";
  const greeting =
    agent?.widget_config?.greeting ?? "Hi! How can I help you today?";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand">
          <Code2 className="h-5 w-5 text-primary-foreground" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Demo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste any embed script below to preview the chatbot live.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <label className="text-sm font-medium">Embed Script</label>
        <textarea
          value={embedCode}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder={`<script src="${defaultBase}/widget.js" data-bot-id="..." data-base-url="..."></script>`}
          rows={3}
          className="mt-2 w-full resize-y rounded-lg border border-border bg-background p-3 text-xs font-mono outline-none focus:border-primary"
        />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <p className="mt-2 text-xs text-muted-foreground">
          Paste the full embed script tag above. The widget will render below.
        </p>
      </div>

      {botId ? (
        <div className="mt-8">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Bot className="h-4 w-4" />
              <span className="font-medium text-foreground">{botName}</span>
            </span>
            <span className="text-muted-foreground/50">ID:</span>
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
              {botId}
            </code>
            <span className="text-muted-foreground/50">Color:</span>
            <span className="flex items-center gap-1">
              <span
                className="h-3 w-3 rounded"
                style={{ background: primaryColor }}
              />
              <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
                {primaryColor}
              </code>
            </span>
            {agentLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>
          <div
            className="relative overflow-hidden rounded-2xl border border-border bg-card"
            style={{ minHeight: "600px" }}
          >
            <div className="flex min-h-[600px] flex-col items-center justify-center p-8">
              <div className="max-w-md rounded-xl border border-border bg-white p-8 text-center shadow-sm">
                <h2 className="text-xl font-bold text-gray-900">
                  Your Website
                </h2>
                <p className="mt-3 text-gray-600">
                  This is a live preview. The chatbot widget appears in the
                  bottom-right corner.
                </p>
                <div className="mt-6 grid gap-3 text-left">
                  {["Product A", "Product B", "Pricing"].map((item) => (
                    <div
                      key={item}
                      className="cursor-pointer rounded-lg border border-border bg-gray-50 p-3 text-sm transition-colors hover:bg-gray-100"
                    >
                      <p className="font-medium text-gray-900">{item}</p>
                      <p className="text-gray-500">
                        Learn more about {item.toLowerCase()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <ChatWidget
              botId={botId}
              botName={botName}
              primaryColor={primaryColor}
              greeting={greeting}
            />
          </div>
        </div>
      ) : (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <Bot className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg font-semibold text-muted-foreground">
            Paste an embed script above to preview
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Copy the embed code from your agent's Widget page and paste it here
            to see the live chatbot.
          </p>
        </div>
      )}
    </div>
  );
}
