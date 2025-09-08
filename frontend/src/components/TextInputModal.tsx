import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Type, Check } from 'lucide-react'
import { useReducedMotion } from '../lib/motion'

interface TextInputModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (text: string) => void
  initialText?: string
}

export default function TextInputModal({ isOpen, onClose, onSubmit, initialText = '' }: TextInputModalProps) {
  const reducedMotion = useReducedMotion()
  const [text, setText] = useState(initialText)

  useEffect(() => {
    setText(initialText)
  }, [initialText, isOpen])

  const handleSubmit = useCallback(() => {
    if (text.trim()) {
      onSubmit(text.trim())
      onClose()
    }
  }, [text, onSubmit, onClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, handleSubmit])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, scale: 0.95, y: 20 }}
            animate={reducedMotion ? {} : { opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? {} : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            className="bg-paper-50 rounded-2xl shadow-2xl border border-paper-300 w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-paper-300">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-terra-500 rounded-lg flex items-center justify-center">
                  <Type className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-ink-900">Add Text to Translate</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-paper-200 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-terra-400"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 text-ink-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 min-h-0">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or type your text here to translate..."
                className="w-full h-80 min-h-[20rem] p-4 border border-paper-300 rounded-xl bg-paper-100 text-ink-900 placeholder-ink-500 resize-none focus:outline-none focus:ring-2 focus:ring-terra-400 focus:border-transparent"
                autoFocus
              />
              <div className="flex justify-between items-center mt-4 text-sm text-ink-600">
                <span>{text.length.toLocaleString()} characters</span>
                <span className="text-xs">Press Ctrl+Enter (Cmd+Enter on Mac) to submit</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-paper-300">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-ink-600 hover:text-ink-900 hover:bg-paper-200 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-terra-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!text.trim()}
                className="px-4 py-2 text-sm bg-terra-600 text-white rounded-lg hover:bg-terra-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-terra-400 flex items-center gap-2 transition-colors"
              >
                <Check className="h-4 w-4" />
                Use Text
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
