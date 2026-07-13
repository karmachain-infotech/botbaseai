import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
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
import { addSource, getTrainingStatus } from "@/lib/server-functions/sources";
import { SiriLoader } from "@/components/ui/siri-loader";

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
  const [qaContent, setQaContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3
  const [systemPrompt, setSystemPrompt] = useState("");

  // Step 4
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [greeting, setGreeting] = useState("Hi! How can I help you?");

  const [creating, setCreating] = useState(false);
  const [training, setTraining] = useState(false);
  const [trainingError, setTrainingError] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!training || !agentId) return;
    const interval = setInterval(async () => {
      try {
        const status = await getTrainingStatus({ data: { chatbotId: agentId } });
        if (status.allTrained || status.hasFailed) {
          setTraining(false);
          if (status.allTrained) {
            setCreatedId(agentId);
          }
          if (status.hasFailed) setTrainingError(true);
        }
      } catch {
        // keep polling
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [training, agentId]);

  const canContinue =
    step === 0 ? name.trim().length > 0
    : step === 1 ? sources.length > 0
    : true;

  function toggleSource(id: SourceType) {
    setSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleCreate() {
    setCreating(true);
    setError("");

    if (sources.includes("website") && websiteUrl) {
      try {
        new URL(websiteUrl);
      } catch {
        setError("Invalid website URL. Please enter a valid URL starting with https://");
        setCreating(false);
        return;
      }
    }

    if (sources.includes("files")) {
      for (const file of selectedFiles) {
        if (file.size > 10 * 1024 * 1024) {
          setError(`File "${file.name}" exceeds the 10MB size limit.`);
          setCreating(false);
          return;
        }
      }
    }

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
            backgroundColor: "#ffffff",
            textColor: "#1f2937",
            greeting,
            botName: name,
            bubbleIcon: "message",
          },
        },
      });

      const agentId = (agent as { id: string }).id;

      const expectedCount =
        (textContent && sources.includes("text") ? 1 : 0) +
        (websiteUrl && sources.includes("website") ? 1 : 0) +
        (qaContent && sources.includes("qa") ? 1 : 0) +
        (sources.includes("files") ? selectedFiles.length : 0);

      let addedCount = 0;

      if (textContent && sources.includes("text")) {
        try {
          await addSource({
            data: { chatbotId: agentId, type: "text", name: "Manual text", content: textContent },
          });
          addedCount++;
        } catch (err) {
          console.error("Failed to add text source:", err);
        }
      }

      if (websiteUrl && sources.includes("website")) {
        try {
          await addSource({
            data: { chatbotId: agentId, type: "url", name: websiteUrl, content: websiteUrl },
          });
          addedCount++;
        } catch (err) {
          console.error("Failed to add website source:", err);
        }
      }

      if (qaContent && sources.includes("qa")) {
        try {
          await addSource({
            data: { chatbotId: agentId, type: "qa", name: "Q&A Pairs", content: qaContent },
          });
          addedCount++;
        } catch (err) {
          console.error("Failed to add Q&A source:", err);
        }
      }

      if (selectedFiles.length > 0 && sources.includes("files")) {
        for (const file of selectedFiles) {
          try {
            const base64 = await fileToBase64(file);
            await addSource({
              data: {
                chatbotId: agentId,
                type: "file",
                name: file.name,
                fileBase64: base64.split(",")[1],
              },
            });
            addedCount++;
          } catch (err) {
            console.error("Failed to upload file:", file.name, err);
          }
        }
      }

      if (addedCount > 0) {
        setAgentId(agentId);
        setTraining(true);
        if (addedCount < expectedCount) {
          setTrainingError(true);
        }
      } else {
        setCreatedId(agentId);
        if (sources.length > 0) {
          setError("Agent created but no data sources could be added. You can add sources later from the agent settings.");
        }
      }
    } catch (err) {
      console.error("Failed to create agent:", err);
      setError("Failed to create agent. Please try again.");
      setCreating(false);
      return;
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
              <div className="space-y-3">
                <div onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-6 text-center transition-colors hover:border-primary/50">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium">{selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : "Click to select files"}</p>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, TXT up to 10MB each</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" multiple className="hidden"
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))} />
                {selectedFiles.length > 0 && (
                  <div className="space-y-1">
                    {selectedFiles.map((f, i) => (
                      <p key={i} className="text-xs text-muted-foreground">{f.name} ({(f.size / 1024).toFixed(1)} KB)</p>
                    ))}
                  </div>
                )}
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
            {sources.includes("qa") && (
              <textarea
                value={qaContent}
                onChange={(e) => setQaContent(e.target.value)}
                rows={6}
                placeholder='[{"question": "What are your hours?", "answer": "We are open 9-5"}]'
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-primary"
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

            {training && (
              <div className="rounded-xl border border-border bg-background p-6">
                <SiriLoader />
              </div>
            )}

            {trainingError && !training && !createdId && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                Failed to train data sources. Please check your website URL and create the agent again.
              </div>
            )}

            {createdId && (
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
                <p className="text-sm font-medium">
                  {trainingError ? "Agent created (with warnings)" : "Agent created!"}
                </p>
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

            {!createdId && !training && (
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
      {!createdId && !training && (
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
