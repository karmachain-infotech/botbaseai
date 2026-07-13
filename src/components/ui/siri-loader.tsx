import { useState, useEffect, useRef } from "react";

const STATUS_MESSAGES = [
  "Connecting to servers...",
  "Training your agent...",
  "Analyzing your files...",
  "Creating embeddings...",
  "Almost done...",
];

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  angle: number;
}

const COLORS = ["#3b82f6", "#7c3aed", "#06b6d4", "#8b5cf6", "#22d3ee"];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 0,
    y: 0,
    size: 2 + Math.random() * 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 4,
    duration: 3 + Math.random() * 3,
    angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5,
  }));
}

export function SiriLoader() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [particles] = useState(() => generateParticles(24));
  const sphereRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center gap-6 overflow-hidden py-12">
      {/* Ambient background glow */}
      <div className="absolute inset-0">
        <div
          className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-ambient-shift rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.1), rgba(124, 58, 237, 0.1), transparent)",
          }}
        />
      </div>

      {/* Sphere container */}
      <div className="relative flex h-40 w-40 items-center justify-center">
        {/* Outer glow rings */}
        <div className="absolute inset-0 animate-pulse-ring-1 rounded-full border border-blue-400/20" />
        <div className="absolute inset-2 animate-pulse-ring-2 rounded-full border border-purple-400/20" />
        <div className="absolute inset-4 animate-pulse-ring-3 rounded-full border border-cyan-400/20" />

        {/* Orbital ring 1 */}
        <div className="absolute inset-0 animate-orbit-1">
          <div className="absolute left-1/2 top-0 h-px w-full origin-left -translate-y-1/2 rotate-0">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
          </div>
        </div>

        {/* Orbital ring 2 */}
        <div className="absolute inset-0 animate-orbit-2">
          <div className="absolute left-1/2 top-0 h-px w-full origin-left -translate-y-1/2 rotate-0">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
          </div>
        </div>

        {/* Orbital ring 3 */}
        <div className="absolute inset-0 animate-orbit-3">
          <div className="absolute left-1/2 top-0 h-px w-full origin-left -translate-y-1/2 rotate-0">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
          </div>
        </div>

        {/* Main energy sphere */}
        <div
          ref={sphereRef}
          className="relative z-10 h-24 w-24 animate-pulse-glow rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, #22d3ee 0%, #3b82f6 30%, #7c3aed 65%, #4c1d95 100%)",
            boxShadow:
              "0 0 40px rgba(59, 130, 246, 0.4), 0 0 80px rgba(124, 58, 237, 0.2), inset 0 -10px 30px rgba(0,0,0,0.3)",
          }}
        >
          {/* Inner core highlight */}
          <div
            className="absolute left-[18%] top-[15%] h-[35%] w-[35%] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%)",
            }}
          />
          {/* Energy pulses on surface */}
          <div className="absolute inset-2 animate-surface-pulse rounded-full bg-gradient-to-br from-blue-300/20 via-transparent to-purple-500/20" />
          <div className="absolute inset-4 animate-surface-pulse-delayed rounded-full bg-gradient-to-tr from-cyan-300/20 via-transparent to-blue-500/20" />
        </div>

        {/* Particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute left-1/2 top-1/2 animate-particle"
            style={{
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              transform: `translate(-50%, -50%) rotate(${p.angle}rad)`,
            }}
          >
            <div
              className="h-full w-full rounded-full"
              style={{
                backgroundColor: p.color,
                boxShadow: `0 0 4px ${p.color}`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Status text */}
      <div className="relative">
        <p className="animate-text-pulse text-center text-sm font-medium tracking-wide text-muted-foreground">
          {STATUS_MESSAGES[msgIndex]}
        </p>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 40px rgba(59, 130, 246, 0.4), 0 0 80px rgba(124, 58, 237, 0.2), inset 0 -10px 30px rgba(0,0,0,0.3);
          }
          50% {
            transform: scale(1.06);
            box-shadow: 0 0 60px rgba(59, 130, 246, 0.6), 0 0 120px rgba(124, 58, 237, 0.3), inset 0 -10px 30px rgba(0,0,0,0.3);
          }
        }

        @keyframes pulse-ring-1 {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.08); opacity: 0.6; }
        }

        @keyframes pulse-ring-2 {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.12); opacity: 0.5; }
        }

        @keyframes pulse-ring-3 {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.16); opacity: 0.4; }
        }

        @keyframes orbit-1 {
          0% { transform: rotate(0deg) scaleX(1); }
          50% { transform: rotate(180deg) scaleX(0.6); }
          100% { transform: rotate(360deg) scaleX(1); }
        }

        @keyframes orbit-2 {
          0% { transform: rotate(60deg) scaleX(0.7); }
          50% { transform: rotate(240deg) scaleX(1); }
          100% { transform: rotate(420deg) scaleX(0.7); }
        }

        @keyframes orbit-3 {
          0% { transform: rotate(-30deg) scaleX(0.8); }
          50% { transform: rotate(150deg) scaleX(0.5); }
          100% { transform: rotate(330deg) scaleX(0.8); }
        }

        @keyframes surface-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.6; transform: scale(1.1) rotate(180deg); }
        }

        @keyframes surface-pulse-delayed {
          0%, 100% { opacity: 0.2; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.5; transform: scale(1.15) rotate(-180deg); }
        }

        @keyframes particle {
          0% { opacity: 0; transform: translate(-50%, -50%) translate(0, 0); }
          20% { opacity: 1; }
          80% { opacity: 0.6; }
          100% { opacity: 0; transform: translate(-50%, -50%) translate(100px, -80px); }
        }

        @keyframes ambient-shift {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.2); }
        }

        @keyframes text-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-pulse-ring-1 { animation: pulse-ring-1 3s ease-in-out infinite; }
        .animate-pulse-ring-2 { animation: pulse-ring-2 3s ease-in-out infinite; }
        .animate-pulse-ring-3 { animation: pulse-ring-3 3s ease-in-out infinite; }
        .animate-orbit-1 { animation: orbit-1 6s linear infinite; }
        .animate-orbit-2 { animation: orbit-2 8s linear infinite; }
        .animate-orbit-3 { animation: orbit-3 10s linear infinite; }
        .animate-surface-pulse { animation: surface-pulse 4s ease-in-out infinite; }
        .animate-surface-pulse-delayed { animation: surface-pulse-delayed 5s ease-in-out infinite; }
        .animate-particle { animation: particle 4s ease-out infinite; }
        .animate-ambient-shift { animation: ambient-shift 6s ease-in-out infinite; }
        .animate-text-pulse { animation: text-pulse 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
