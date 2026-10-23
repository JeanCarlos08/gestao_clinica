"use client";

import { motion, useScroll, useSpring, useTransform, useReducedMotion } from "framer-motion";

export default function ParallaxBg() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const raw = useTransform(scrollY, [0, 900], [0, -38]);
  const y = useSpring(raw, { stiffness: 90, damping: 26, mass: 0.5 });

  return (
    <motion.div
      aria-hidden="true"
      className="app-bg-photo"
      style={reduce ? undefined : { y, scale: 1.05 }}
    />
  );
}
