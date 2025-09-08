import { motion } from 'framer-motion'
import { tap, useReducedMotion } from '@/lib/motion'

export type TranslationResult = {
  id: string
  source: string
  translated: string
  page?: number
  isRTL?: boolean
}

export default function BilingualPreview({
  results,
  onDownload,
  isGenerating,
}: {
  results: TranslationResult[]
  onDownload: () => void
  isGenerating?: boolean
}) {
  const reducedMotion = useReducedMotion();
  
  if (!results?.length) return null

  return (
    <div className="rounded-2xl border border-paper-300 bg-paper-200 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-ink-900">Translation Preview</h3>
        <button 
          onClick={onDownload} 
          disabled={isGenerating} 
          className="rounded-2xl px-4 py-2 text-sm hover:bg-paper-100 focus-visible:ring-2 focus-visible:ring-terra-400 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          {...(!reducedMotion && tap)}
          aria-live="polite"
        >
          {isGenerating ? 'Generating…' : 'Download PDF'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-ink-900">Original</h4>
          {results.map((r, index) => (
            <motion.div 
              key={`src-${r.id}`} 
              initial={!reducedMotion ? { opacity: 0, y: 6 } : {}}
              animate={!reducedMotion ? { opacity: 1, y: 0 } : {}}
              transition={!reducedMotion ? { delay: index * 0.1 } : {}}
              className="rounded-2xl border border-paper-300 bg-paper-200 shadow-sm p-3"
            >
              <p className={`text-[15px] leading-7 ${r.isRTL ? 'text-right' : ''}`}>{r.source}</p>
            </motion.div>
          ))}
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-ink-900">English Translation</h4>
          {results.map((r, index) => (
            <motion.div 
              key={`dst-${r.id}`} 
              initial={!reducedMotion ? { opacity: 0, y: 6, scale: 0.95 } : {}}
              animate={!reducedMotion ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={!reducedMotion ? { delay: index * 0.1 + 0.2, type: "spring", stiffness: 300, damping: 20 } : {}}
              className="rounded-2xl border border-paper-300 bg-paper-50 shadow-sm p-3 relative"
            >
              <p className="text-[15px] leading-7">{r.translated}</p>
              {/* Subtle glow effect for newly translated items */}
              <motion.div
                initial={!reducedMotion ? { opacity: 0.5 } : {}}
                animate={!reducedMotion ? { opacity: 0 } : {}}
                transition={!reducedMotion ? { delay: 1, duration: 2 } : {}}
                className="absolute inset-0 rounded-2xl bg-terra-400 opacity-0 pointer-events-none"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}


