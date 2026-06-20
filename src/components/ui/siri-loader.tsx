import { useState, useEffect } from "react";

const STATUS_MESSAGES = [
  "Connecting to servers...",
  "Training your agent...",
  "Analyzing your files...",
  "Creating embeddings...",
  "Almost done...",
];

export function SiriLoader() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <div className="siri-wave relative flex h-32 items-center justify-center gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="siri-bar h-8 w-1.5 rounded-full"
            style={{
              animationDelay: `${[0, 0.15, 0.3, 0.15, 0][i]}s`,
              background: "linear-gradient(to top, #7c3aed, #a78bfa)",
            }}
          />
        ))}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-purple-500/20 blur-3xl" />
      </div>
      <div className="relative">
        <p className="animate-pulse text-sm font-medium text-muted-foreground">
          {STATUS_MESSAGES[msgIndex]}
        </p>
      </div>
      <style>{`
        @keyframes siriWave {
          0%, 100% { transform: scaleY(0.3); opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        .siri-bar {
          animation: siriWave 1.4s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>
    </div>
  );
}
