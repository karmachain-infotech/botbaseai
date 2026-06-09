import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bot,
  FileText,
  Globe,
  Type as TypeIcon,
  HelpCircle,
  Upload,
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";
import { createChatbot } from "@/lib/server-functions/chatbots";
import { addSource } from "@/lib/server-functions/sources";

export const Route = createFileRoute("/dashboard/create")({
  head: () => ({
    meta: [
      { title: "Create New Agent — BotbaseAI" },
      {
        name: "description",
        content: "Create and train a new AI support agent on BotbaseAI.",
      },
    ],
  }),
  component: CreateAgentWizard,
});

type SourceType = "files" | "website" | "text" | "qa";

const steps = ["Details", "Data sources", "Configure", "Deploy"] as const;

const sourceOptions: {
  id: SourceType;
  label: string;
  description: string;
  icon: typeof FileText;
}[] = [
  { id: "files", label: "Files", description: "Upload PDFs, DOCX, or TXT documents.", icon: FileText },
  { id: "website", label: "Website", description: "Crawl a URL or sitemap to import pages.", icon: Globe },
  { id: "text", label: "Text", description: "Paste raw text content to train on.", icon: TypeIcon },
  { id: "qa", label: "Q&A", description: "Add question and answer pairs.", icon: HelpCircle },
];

function CreateAgentWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [language, setLanguage] = useState("en");

  // Step 2
  const [sources, setSources] = useState<SourceType[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [textContent, setTextContent] = useState("");

  // Step 3
  const [systemPrompt, setSystemPrompt] = useState("");

  // Step 4
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [greeting, setGreeting] = useState("Hi! How can I help you?");

  const [creating, setCreating] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const canContinue =
    step === 0 ? name.trim().length > 0
    : step === 1 ? sources.length > 0
    : true;

  function toggleSource(id: SourceType) {
    setSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleCreate() {
    setCreating(true);
    setError("");
    try {
      const agent = await createChatbot({
        data: {
          name,
          instructions: instructions || systemPrompt || "",
          model,
          language,
          status: "draft",
          widget_config: {
            primaryColor,
            greeting,
            botName: name,
            bubbleIcon: "message",
          },
        },
      });

      const agentId = (agent as { id: string }).id;

      if (textContent && sources.includes("text")) {
        await addSource({
          data: { chatbotId: agentId, type: "text", name: "Manual text", content: textContent },
        }).catch(console.error);
      }

      if (websiteUrl && sources.includes("website")) {
        await addSource({
          data: { chatbotId: agentId, type: "url", name: websiteUrl, content: websiteUrl },
        }).catch(console.error);
      }

      setCreatedId(agentId);
    } catch (err) {
      console.error("Failed to create agent:", err);
      setError("Failed to create agent. Please try again.");
    }
    setCreating(false);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to agents
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand">
          <Bot className="h-6 w-6 text-primary-foreground" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create new agent</h1>
          <p className="text-sm text-muted-foreground">
            Train a new AI agent on your business data in a few steps.
          </p>
        </div>
      </div>

      {/* Stepper */}
      <ol className="mt-8 flex items-center gap-2">
        {steps.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "bg-gradient-brand text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={`hidden text-sm font-medium sm:inline ${active ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < steps.length - 1 && <span className="mx-1 h-px flex-1 bg-border" />}
            </li>
          );
        })}
      </ol>

      {/* Step content */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        {/* Step 1: Details */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Agent name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Support Assistant"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Instructions / Persona{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder="You are a helpful customer support assistant for [Company]..."
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Sources */}
        {step === 1 && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Choose where your agent should learn from. You can add more later.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {sourceOptions.map((opt) => {
                const selected = sources.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleSource(opt.id)}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <opt.icon className="h-4 w-4 text-primary" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{opt.label}</span>
                      <span className="block text-xs text-muted-foreground">{opt.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {sources.includes("files") && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-6 text-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">Drag & drop files here</p>
                <p className="text-xs text-muted-foreground">PDF, DOCX, TXT up to 10MB each</p>
              </div>
            )}
            {sources.includes("website") && (
              <input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourcompany.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
            )}
            {sources.includes("text") && (
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={4}
                placeholder="Paste content for your agent to learn from..."
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
            )}
          </div>
        )}

        {/* Step 3: Configure */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                System prompt <span className="text-muted-foreground">(advanced)</span>
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={5}
                placeholder="Override default system prompt..."
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave blank to use the persona you set in step 1.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-medium">AI Actions</p>
              <p className="mt-1 text-xs text-muted-foreground">
                You'll be able to configure AI Actions from the agent settings page after creation.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-medium">Escalation rules</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Configure when to hand off to a human agent from settings after creation.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Deploy */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Widget color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-10 rounded-lg border border-border cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{primaryColor}</span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Greeting message</label>
              <input
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>

            {createdId && (
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
                <p className="text-sm font-medium">Agent created!</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Embed this script on your website:
                </p>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-background p-3 text-xs font-mono">
                  {`<script src="https://botbaseai.com/widget.js" data-bot-id="${createdId}"></script>`}
                </pre>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            {!createdId && (
              <button
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-brand px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {creating ? "Creating agent..." : "Create agent"}
              </button>
            )}

            {createdId && (
              <div className="flex gap-3">
                <Link
                  to="/dashboard"
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 text-center text-sm font-semibold transition-colors hover:bg-secondary"
                >
                  Go to dashboard
                </Link>
                <Link
                  to={"/dashboard/agents/$id"}
                  params={{ id: createdId }}
                  className="flex-1 rounded-lg bg-gradient-brand px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
                >
                  Open agent
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer nav */}
      {!createdId && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < steps.length - 1 && (
            <button
              onClick={() => canContinue && setStep((s) => s + 1)}
              disabled={!canContinue}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
