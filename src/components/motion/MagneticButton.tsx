import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  as?: "button" | "a";
  href?: string;
  onClick?: () => void;
  [key: string]: unknown;
}

export function MagneticButton({ children, className, as: Tag = "button", ...props }: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement & HTMLAnchorElement>(null);
  const prefersReduced = useReducedMotion();

  function handleMouse(e: React.MouseEvent) {
    if (prefersReduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    ref.current.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
  }

  function handleLeave() {
    if (!ref.current) return;
    ref.current.style.transform = "translate(0px, 0px)";
  }

  if (Tag === "a") {
    return (
      <m.a
        ref={ref}
        className={className}
        onMouseMove={handleMouse}
        onMouseLeave={handleLeave}
        whileHover={{ scale: 1.03 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        {...props}
      >
        {children}
      </m.a>
    );
  }

  return (
    <motion.button
      ref={ref}
      className={className}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
