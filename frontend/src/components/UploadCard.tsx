import { useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { motion } from 'framer-motion'
import { fadeUp, tap, useReducedMotion } from '@/lib/motion'
import { FileUp, Maximize2 } from 'lucide-react'
import TextInputModal from './TextInputModal'

type Props = { onFile: (file: File) => void; onText: (text: string) => void; disabled?: boolean }

export interface UploadCardRef {
  clearAll: () => void
}

const UploadCard = forwardRef<UploadCardRef, Props>(({ onFile, onText, disabled }, ref) => {
  const reducedMotion = useReducedMotion();
  const [dragActive, setDragActive] = useState(false)
  const [text, setText] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); if (disabled) return; setDragActive(false)
    const f = e.dataTransfer.files?.[0]; if (f) onFile(f)
  }, [disabled, onFile])

  const handleModalSubmit = (modalText: string) => {
    setText(modalText)
    onText(modalText)
  }

  // Expose clearAll method to parent components
  useImperativeHandle(ref, () => ({
    clearAll: () => {
      setText('')
      setIsModalOpen(false)
      // Clear file inputs
      const fileInputs = document.querySelectorAll('input[type="file"]')
      fileInputs.forEach(input => {
        if (input instanceof HTMLInputElement) {
          input.value = ''
        }
      })
    }
  }), [])

  return (
    <motion.div
      variants={!reducedMotion ? fadeUp : {}}
      initial={!reducedMotion ? "initial" : {}}
      animate={!reducedMotion ? "animate" : {}}
      className={`rounded-2xl border border-olive-green-200 bg-olive-green-50 shadow-sm p-6 ${dragActive ? 'ring-2 ring-olive-green-400' : ''}`}
      onDragOver={(e)=>{e.preventDefault(); setDragActive(true)}}
      onDragLeave={()=>setDragActive(false)}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-3 mb-4">
        <FileUp className="h-5 w-5 text-olive-green-500" aria-hidden="true" />
        <h3 className="text-base font-semibold text-olive-green-700">Upload PDF or Paste Text</h3>
      </div>
      <div className="bg-gradient-to-r from-olive-green-300 to-transparent h-px mb-4" />
      <div className="grid md:grid-cols-2 gap-4">
        <label className="rounded-2xl border border-paper-300 bg-paper-50 shadow-sm p-4 cursor-pointer hover:bg-paper-100 focus-within:ring-2 focus-within:ring-terra-400 flex items-center justify-center min-h-[120px]">
          <input 
            type="file" 
            accept="application/pdf" 
            className="hidden" 
            onChange={(e)=>{const f=e.target.files?.[0]; if(f) onFile(f)}}
            disabled={disabled}
          />
          <span className="text-[15px] text-olive-green-600 text-center">Drag & drop PDF here or click to browse</span>
        </label>
        <div className="rounded-2xl border border-paper-300 bg-paper-50 shadow-sm p-4">
          <div className="flex gap-2 mb-3">
            <textarea
              value={text}
              onChange={(e)=>setText(e.target.value)}
              placeholder="Paste text here..."
              className="flex-1 h-24 outline-none bg-transparent resize-none focus-visible:ring-2 focus-visible:ring-terra-400 rounded"
              disabled={disabled}
            />
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={disabled}
              className="p-2 hover:bg-paper-200 focus-visible:ring-2 focus-visible:ring-terra-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Open larger text editor"
              {...(!reducedMotion && tap)}
            >
              <Maximize2 className="h-4 w-4 text-ink-600" />
            </button>
          </div>
          <div className="flex justify-end">
            <button 
              disabled={!text.trim() || disabled} 
              onClick={()=>onText(text.trim())} 
              className="rounded-2xl bg-olive-green-500 text-white px-3 py-2 text-sm shadow-claude hover:bg-olive-green-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-olive-green-400 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              {...(!reducedMotion && tap)}
            >
              Use Text
            </button>
          </div>
        </div>
      </div>
      
      <TextInputModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialText={text}
      />
    </motion.div>
  )
})

UploadCard.displayName = 'UploadCard'

export default UploadCard


