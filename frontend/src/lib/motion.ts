import { type Variants } from 'framer-motion'

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.12 } }
};

export const stagger = (gap = 0.05): Variants => ({
  animate: { transition: { staggerChildren: gap } }
});

export const tap = { 
  whileTap: { scale: 0.98 } 
};

// Hook to respect reduced motion preferences
export const useReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};