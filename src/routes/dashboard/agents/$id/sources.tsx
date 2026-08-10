import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Globe,
  Type,
  HelpCircle,
  Trash2,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import {
  listSources,
  addSource,
  deleteSource,
  retrainSource,
} from "@/lib/server-functions/sources";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { Source, SourceType } from "@/types/database";

export const Route = createFileRoute("/dashboard/agents/$id/sources")({
  component: AgentSources,
});

const sourceTypeConfig: Record<
  SourceType,
  { label: string; icon: typeof FileText }
> = {
  file: { label: "File", icon: FileText },
  url: { label: "Website", icon: Globe },
  text: { label: "Text", icon: Type },
  qa: { label: "Q&A", icon: HelpCircle },
};

function AgentSources() {
  const { id } = Route.useParams();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState<SourceType | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const mountedRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mountedRef.current = true;
    loadSources();
    return () => {
      mountedRef.current = false;
    };
  }, [id]);

  async function loadSources() {
    try {
      const data = await listSources({ data: { chatbotId: id } });
      if (mountedRef.current) setSources(data as unknown as Source[]);
    } catch (err) {
      console.error("Failed to load sources:", err);
      if (mountedRef.current) setError("Failed to load sources.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  async function handleAddSource(type: SourceType) {
    setAdding(true);
    setError("");

    try {
      const opts: {
        chatbotId: string;
        type: SourceType;
        name: string;
        content?: string;
        fileBase64?: string;
      } = {
        chatbotId: id,
        type,
        name: "",
      };

      if (type === "url") {
        if (!urlInput.trim()) throw new Error("Please enter a URL");
        opts.name = urlInput;
        opts.content = urlInput;
      } else if (type === "text") {
        if (!textInput.trim()) throw new Error("Please enter text content");
        opts.name = "Manual text";
        opts.content = textInput;
      } else if (type === "qa") {
        opts.name = "Q&A Pairs";
        opts.content = textInput;
      } else if (type === "file") {
        if (!fileInput) throw new Error("Please select a file");
        const base64 = await fileToBase64(fileInput);
        opts.name = fileInput.name;
        opts.fileBase64 = base64.split(",")[1];
      }

      const source = await addSource({ data: opts });
      setSources((prev) => [source as unknown as Source, ...prev]);
      setShowAdd(null);
      setUrlInput("");
      setTextInput("");
      setFileInput(null);
      toast.success("Source added, training started");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add source";
      setError(message);
    } finally {
      setAdding(false);
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  async function handleDelete(sourceId: string) {
    setDeleteTarget(null);
    try {
      await deleteSource({ data: { chatbotId: id, sourceId } });
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
      toast.success("Source deleted");
    } catch (err) {
      console.error("Failed to delete source:", err);
      toast.error("Failed to delete source");
    }
  }

  async function handleRetrain(sourceId: string) {
    const retraining = toast.loading("Retraining source...");
    try {
      await retrainSource({ data: { sourceId } });
      setSources((prev) =>
        prev.map((s) =>
          s.id === sourceId ? { ...s, status: "processing" as const } : s,
        ),
      );
      toast.dismiss(retraining);
      toast.success("Source queued for retraining");
      setTimeout(loadSources, 3000);
    } catch (err) {
      toast.dismiss(retraining);
      toast.error("Retraining failed");
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "trained":
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "processing":
        return (
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        );
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to agents
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Training sources</h1>
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <button
            onClick={() => {
              setError("");
              setLoading(true);
              loadSources();
            }}
            className="ml-3 shrink-0 rounded-lg bg-destructive/20 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/30"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {(
          Object.entries(sourceTypeConfig) as [
            SourceType,
            { label: string; icon: typeof FileText },
          ][]
        ).map(([type, config]) => (
          <button
            key={type}
            onClick={() => setShowAdd(showAdd === type ? null : type)}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
              showAdd === type
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <config.icon className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">{config.label}</span>
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          {showAdd === "url" && (
            <div className="flex gap-3">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={() => handleAddSource("url")}
                disabled={!urlInput || adding}
                className="rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {adding ? "Adding..." : "Add URL"}
              </button>
            </div>
          )}
          {showAdd === "text" && (
            <div className="space-y-3">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={4}
                placeholder="Paste your content here..."
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={() => handleAddSource("text")}
                disabled={!textInput || adding}
                className="rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {adding ? "Adding..." : "Add text"}
              </button>
            </div>
          )}
          {showAdd === "qa" && (
            <div className="space-y-3">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={6}
                placeholder='[{"question": "What are your hours?", "answer": "We are open 9-5"}]'
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
              <button
                onClick={() => handleAddSource("qa")}
                disabled={!textInput || adding}
                className="rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {adding ? "Adding..." : "Add Q&A"}
              </button>
            </div>
          )}
          {showAdd === "file" && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border p-6 text-center transition-colors hover:border-primary/50"
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {fileInput ? fileInput.name : "Click to select a file"}
                </p>
                <p className="text-xs text-muted-foreground">PDF, DOCX, TXT</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => setFileInput(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={() => handleAddSource("file")}
                disabled={!fileInput || adding}
                className="rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {adding ? "Uploading..." : "Upload file"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No sources yet. Add one above.
          </p>
        ) : (
          sources.map((source) => {
            const config = sourceTypeConfig[source.type] ?? {
              label: source.type,
              icon: FileText,
            };
            return (
              <div
                key={source.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <config.icon className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {source.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{config.label}</span>
                      <span>·</span>
                      {statusIcon(source.status)}
                      <span
                        className={
                          source.status === "failed" ? "text-destructive" : ""
                        }
                      >
                        {source.status}
                      </span>
                      {source.file_size && (
                        <>
                          <span>·</span>
                          <span>{(source.file_size / 1024).toFixed(1)} KB</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(source.status === "failed" ||
                    source.status === "pending") && (
                    <button
                      onClick={() => handleRetrain(source.id)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      title="Retrain source"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                  <AlertDialog
                    open={deleteTarget === source.id}
                    onOpenChange={(open) => {
                      if (!open) setDeleteTarget(null);
                    }}
                  >
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={() => setDeleteTarget(source.id)}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this source?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete{" "}
                          <strong>{source.name}</strong>. Your agent will lose
                          the knowledge from this source. This action cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(source.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
