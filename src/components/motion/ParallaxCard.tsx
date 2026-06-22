import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface ParallaxCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

export function ParallaxCard({ children, className, intensity = 6 }: ParallaxCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  function handleMouse(e: React.MouseEvent) {
    if (prefersReduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.transform = `perspective(800px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) scale3d(1.02, 1.02, 1.02)`;
  }

  function handleLeave() {
    if (!ref.current) return;
    ref.current.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)";
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ willChange: "transform" }}
    >
      {children}
    </motion.div>
  );
}
