import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import type { ReactNode, HTMLAttributes } from "react";

interface AnimatedSectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
}

export function AnimatedSection({ children, className, ...props }: AnimatedSectionProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.section
      className={className}
      initial={prefersReduced ? {} : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      {...props}
    >
      {children}
    </motion.section>
  );
}
