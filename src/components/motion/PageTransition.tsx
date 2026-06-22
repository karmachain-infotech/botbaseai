import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const router = useRouter();
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={router.state.location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
