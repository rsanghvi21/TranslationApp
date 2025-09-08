import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/motion'

export default function ProgressBar({ value = 0 }: { value: number }) {
  const reducedMotion = useReducedMotion();
  
  return (
    <div className="w-full h-3 rounded-full bg-olive-green-200 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={!reducedMotion ? { type: 'spring', stiffness: 120, damping: 20 } : { duration: 0 }}
        className="h-full bg-olive-green-500"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.15) 0 8px, transparent 8px 16px)'
        }}
      />
    </div>
  )
}


