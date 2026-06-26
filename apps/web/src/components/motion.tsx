"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Repeat } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared motion primitives for the Swap redesign.
 *
 * Every primitive honours `prefers-reduced-motion`: when the user has asked for
 * reduced motion we render a plain, fully-visible element with no transform or
 * opacity animation. The CSS-driven `RotatingSwap` is killed by the matching
 * media query in globals.css.
 */

const EASE = [0.22, 0.61, 0.36, 1] as const;

type RevealTag = "div" | "section" | "article" | "li";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Delay before the reveal starts, in seconds. */
  delay?: number;
  /** Initial vertical offset in px (slides up to 0). */
  y?: number;
  /** Animate only the first time it enters the viewport. */
  once?: boolean;
  /** Rendered element (keeps semantic tags like <section>). */
  as?: RevealTag;
};

/** Fade + slide-up as the element scrolls into view. */
export function Reveal({ children, className, delay = 0, y = 18, once = true, as = "div" }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  const M =
    as === "section" ? motion.section : as === "article" ? motion.article : as === "li" ? motion.li : motion.div;
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </M>
  );
}

/** Orchestrates a staggered entrance for its `StaggerItem` children (on mount). */
export function Stagger({
  children,
  className,
  gap = 0.1,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

/** A single item inside a `Stagger`. Fades + slides up in sequence. */
export function StaggerItem({
  children,
  className,
  y = 16,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * The swap-arrow motif, rotating slowly and continuously. Pure CSS animation
 * (`animate-swap-spin`), so it is automatically paused under reduced-motion.
 */
export function RotatingSwap({
  className,
  strokeWidth = 2.5,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return <Repeat aria-hidden className={cn("animate-swap-spin", className)} strokeWidth={strokeWidth} />;
}
