"use client";

import { type HTMLMotionProps, motion, AnimatePresence } from "framer-motion";
import { forwardRef, type ReactNode } from "react";

export { AnimatePresence };

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
} satisfies HTMLMotionProps<"div">;

export const slideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
  transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
} satisfies HTMLMotionProps<"div">;

export const slideRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
} satisfies HTMLMotionProps<"div">;

export const slideLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
} satisfies HTMLMotionProps<"div">;

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
} satisfies HTMLMotionProps<"div">;

export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.04 },
  },
} satisfies HTMLMotionProps<"div">;

export const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
} satisfies HTMLMotionProps<"div">;

export const hoverLift = {
  whileHover: { y: -2, boxShadow: "0 12px 24px -6px rgba(0,0,0,0.12)" },
  transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
} satisfies HTMLMotionProps<"div">;

export const MotionDiv = motion.div;
export const MotionLi = motion.li;
export const MotionSpan = motion.span;
export const MotionSection = motion.section;
export const MotionButton = motion.button;

export const MotionFade = forwardRef<HTMLDivElement, HTMLMotionProps<"div"> & { children: ReactNode }>(
  function MotionFade(props, ref) {
    return <motion.div ref={ref} {...fadeIn} {...props} />;
  },
);

export const MotionSlideUp = forwardRef<HTMLDivElement, HTMLMotionProps<"div"> & { children: ReactNode }>(
  function MotionSlideUp(props, ref) {
    return <motion.div ref={ref} {...slideUp} {...props} />;
  },
);

export const MotionList = forwardRef<HTMLUListElement, HTMLMotionProps<"ul"> & { children: ReactNode }>(
  function MotionList(props, ref) {
    return <motion.ul ref={ref} initial="initial" animate="animate" {...props} />;
  },
);

export const MotionListItem = forwardRef<HTMLLIElement, HTMLMotionProps<"li"> & { children: ReactNode }>(
  function MotionListItem(props, ref) {
    return <motion.li ref={ref} {...staggerItem} {...props} />;
  },
);
