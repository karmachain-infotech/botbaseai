import { motion, useReducedMotion } from "framer-motion";
import { useMousePosition } from "@/hooks/use-mouse-position";

export function MouseGlow() {
  const { x, y } = useMousePosition();
  const prefersReduced = useReducedMotion();

  if (prefersReduced) return null;

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[9999]"
      aria-hidden="true"
    >
      <div
        className="absolute h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: x,
          top: y,
          background:
            "radial-gradient(circle, oklch(0.62 0.2 285 / 0.12) 0%, transparent 70%)",
          willChange: "transform",
        }}
      />
    </motion.div>
  );
}
