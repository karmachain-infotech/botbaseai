import { motion, useReducedMotion } from "framer-motion";
import { useScrollSpeed } from "@/hooks/use-scroll-speed";
import type { ReactNode } from "react";

interface MarqueeBandProps {
  children: ReactNode;
  className?: string;
  baseSpeed?: number;
}

export function MarqueeBand({
  children,
  className,
  baseSpeed = 20,
}: MarqueeBandProps) {
  const prefersReduced = useReducedMotion();
  const scrollSpeed = useScrollSpeed();
  const speed = Math.min(baseSpeed + scrollSpeed * 50, 60);

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <motion.div
        className="flex gap-10"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: 60 / speed,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        {children}
        <div className="flex shrink-0 gap-10">{children}</div>
      </motion.div>
    </div>
  );
}
