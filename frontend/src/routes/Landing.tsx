import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeUp, stagger, tap, useReducedMotion } from '@/lib/motion'
import { Languages, Zap, CheckCircle, Clock, AlertCircle, LogOut, RotateCcw } from 'lucide-react'
import UploadCard, { type UploadCardRef } from '@/components/UploadCard'
import ProviderSelector from '@/components/ProviderSelector'
import ProgressBar from '@/components/ProgressBar'
import BilingualPreview, { type TranslationResult } from '@/components/BilingualPreview'
import { useAuth } from '../contexts/AuthContext'

type TranslationStatus = 'idle' | 'processing' | 'detecting' | 'translating' | 'complete' | 'error'

export default function Landing() {
  const reducedMotion = useReducedMotion();
  const { logout } = useAuth();
  const [settings, setSettings] = useState({ 
    provider:'openai' as 'openai'|'gemini', 
    model:'gpt-4o-mini',
    tone: 'neutral' as 'formal'|'informal'|'neutral',
    fidelity: 'balanced' as 'literal'|'adaptive'|'balanced',
    keepLineBreaks: true
  })
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<TranslationResult[]>([])
  const [detectedLanguage, setDetectedLanguage] = useState('')
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [status, setStatus] = useState<TranslationStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [currentChunk, setCurrentChunk] = useState<string>('')
  const [totalChunks, setTotalChunks] = useState(0)
  const [completedChunks, setCompletedChunks] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const uploadCardRef = useRef<UploadCardRef>(null)

  async function handleTranslate(input: { type:'text'|'pdf'; text?:string; file?:File }){
    // Reset state
    setResults([])
    setProgress(0)
    setStatus('processing')
    setStatusMessage('Preparing translation...')
    setCurrentChunk('')
    setCompletedChunks(0)
    setTotalChunks(0)

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const body: any = { settings }
      if (input.type==='text' && input.text){ body.input = { type:'text', text: input.text } }
      if (input.type==='pdf' && input.file){
        setStatusMessage('Processing PDF...')
        const fileData = await fileToBase64(input.file)
        body.input = { type:'pdf', fileData }
      }
      
      console.log('Sending to API:', JSON.stringify(body, null, 2))

      // Try streaming endpoint first, fallback to regular endpoint
      let response: Response
      let useStreaming = true
      
      try {
        response = await fetch('/api/translate/stream', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(body),
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          throw new Error(`Streaming endpoint failed: ${response.status}`)
        }
      } catch (streamError) {
        console.warn('Streaming endpoint not available, falling back to regular endpoint:', streamError)
        useStreaming = false
        
        // Fallback to regular endpoint
        response = await fetch('/api/translate', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(body),
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Translation request failed')
        }
      }

      if (useStreaming) {
        // Handle streaming response
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('No response stream available')
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                switch (data.type) {
                  case 'progress':
                    setStatus(data.stage)
                    setStatusMessage(data.message)
                    if (data.stage === 'extracting') setProgress(10)
                    else if (data.stage === 'detecting') setProgress(20)
                    else if (data.stage === 'translating') setProgress(25)
                    break

                  case 'language_detected':
                    setDetectedLanguage(data.detectedLanguage)
                    setTotalChunks(data.totalChunks)
                    setStatusMessage(`Detected: ${data.detectedLanguage} (${data.totalChunks} verses)`)
                    break

                  case 'translation_start':
                    setCurrentChunk(data.text)
                    setStatusMessage(`Translating verse ${data.chunkId}...`)
                    setProgress(25 + (data.progress * 0.7))
                    break

                  case 'translation_complete':
                    setResults(prev => {
                      const updated = [...prev]
                      const existingIndex = updated.findIndex(r => r.id === data.result.id)
                      if (existingIndex >= 0) {
                        updated[existingIndex] = data.result
                      } else {
                        updated.push(data.result)
                      }
                      return updated
                    })
                    setCompletedChunks(prev => prev + 1)
                    setProgress(25 + (data.progress * 0.7))
                    break

                  case 'complete':
                    setStatus('complete')
                    setStatusMessage(`Translation complete! ${data.stats.successfulTranslations}/${data.stats.totalChunks} verses translated.`)
                    setProgress(100)
                    setCurrentChunk('')
                    if (data.results) {
                      setResults(data.results)
                    }
                    break

                  case 'error':
                    setStatus('error')
                    setStatusMessage(data.message)
                    setCurrentChunk('')
                    break
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', line)
              }
            }
          }
        }
      } else {
        // Handle regular JSON response (fallback)
        setStatus('translating')
        setStatusMessage('Translating...')
        setProgress(50)
        
        const json = await response.json()
        
        if (json.success) {
          setDetectedLanguage(json.detectedLanguage)
          setResults(json.results)
          setTotalChunks(json.results.length)
          setCompletedChunks(json.results.length)
          setStatus('complete')
          setStatusMessage(`Translation complete! ${json.stats.successfulTranslations}/${json.stats.totalChunks} verses translated.`)
          setProgress(100)
          setCurrentChunk('')
        } else {
          throw new Error(json.error || 'Translation failed')
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setStatus('idle')
        setStatusMessage('')
        setProgress(0)
        return
      }
      
      console.error('Translation error:', error)
      setStatus('error')
      setStatusMessage(error.message || 'Translation failed')
      setCurrentChunk('')
    }
  }

  function onFile(file: File){ handleTranslate({ type:'pdf', file }).catch(console.error) }
  function onText(text: string){ handleTranslate({ type:'text', text }).catch(console.error) }

  function cancelTranslation() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setStatus('idle')
    setStatusMessage('')
    setProgress(0)
    setCurrentChunk('')
  }

  function resetAll() {
    // Cancel any ongoing translation
    cancelTranslation()
    
    // Reset all state
    setResults([])
    setDetectedLanguage('')
    setProgress(0)
    setTotalChunks(0)
    setCompletedChunks(0)
    setCurrentChunk('')
    setStatusMessage('')
    setStatus('idle')
    setIsGeneratingPDF(false)
    
    // Clear the upload card (text areas and file inputs)
    uploadCardRef.current?.clearAll()
  }

  async function onDownloadPDF(){
    setIsGeneratingPDF(true)
    try {
      // Create a meaningful filename
      const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS
      const languagePart = detectedLanguage ? `${detectedLanguage.toLowerCase().replace(/\s+/g, '-')}-to-english` : 'translation'
      const filename = `${languagePart}_${date}_${time}.pdf`
      
      const resp = await fetch('/api/pdf', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          results, 
          options: { 
            title: `Translation: ${detectedLanguage} to English`, 
            filename 
          } 
        }) 
      })
      
      if (!resp.ok) { 
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.error || `Failed to generate PDF (${resp.status})`)
      }
      
      // Check if response is actually a PDF
      const contentType = resp.headers.get('content-type')
      if (!contentType?.includes('application/pdf')) {
        throw new Error('Server did not return a PDF file')
      }
      
      const blob = await resp.blob()
      
      // Verify blob size
      if (blob.size === 0) {
        throw new Error('PDF file is empty')
      }
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.style.display = 'none'
      
      // Trigger download
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
      
      console.log(`PDF downloaded successfully: ${filename}`)
      
    } catch (error) {
      console.error('PDF download failed:', error)
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to download PDF: ${message}`)
    } finally { 
      setIsGeneratingPDF(false) 
    }
  }
  
  return (
    <div className="min-h-dvh bg-paper-100 text-ink-700">
      <header className="sticky top-0 z-40 bg-paper-50/85 backdrop-blur border-b border-olive-green-200">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-olive-green-500 rounded-lg flex items-center justify-center">
              <Languages className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <span className="font-medium tracking-tight text-ink-900">पवित्रानुवादक</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-ink-600 hover:text-ink-900 hover:bg-paper-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-terra-400"
            {...(!reducedMotion && tap)}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 lg:px-8 py-16 md:py-24 space-y-12">
        <motion.section 
          variants={!reducedMotion ? stagger() : {}} 
          initial={!reducedMotion ? "initial" : {}} 
          animate={!reducedMotion ? "animate" : {}} 
          className="text-center space-y-8"
        >
          <motion.div 
            variants={!reducedMotion ? fadeUp : {}} 
            className="mx-auto max-w-3xl space-y-6"
          >
            <motion.h1 
              variants={!reducedMotion ? fadeUp : {}} 
              className="text-4xl md:text-5xl font-semibold tracking-tight text-ink-900"
            >
              <span className="underline decoration-paper-300 underline-offset-[6px] hover:text-terra-600">पवित्रानुवादक</span>
            </motion.h1>
            <motion.p 
              variants={!reducedMotion ? fadeUp : {}} 
              className="text-[15px] leading-7 text-olive-600"
            >
              AI-powered translation of Sanskrit, Hindi, Marathi, and other Indian languages into English
            </motion.p>
            <motion.div 
              variants={!reducedMotion ? fadeUp : {}} 
              className="flex items-center justify-center gap-3"
            >
              <button 
                onClick={() => document.getElementById('translator')?.scrollIntoView({ behavior: 'smooth' })}
                className="rounded-2xl bg-olive-green-500 text-white px-6 py-3 text-sm shadow-claude hover:bg-olive-green-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-olive-green-400 inline-flex items-center gap-2"
                {...(!reducedMotion && tap)}
              >
                <Languages className="h-4 w-4" />
                Start Translating
              </button>
            </motion.div>
          </motion.div>
        </motion.section>


        {/* Inline Translation Section */}
        <section id="translator" className="rounded-2xl border border-olive-green-300 bg-gradient-to-br from-olive-green-50 to-paper-100 shadow-sm p-8">
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-xl md:text-2xl font-semibold text-ink-900">Translate Your Sacred Texts</h2>
              <p className="text-[15px] leading-7 max-w-2xl mx-auto text-olive-green-600">Paste Sanskrit verses, Hindi shlokas, or upload PDFs of ancient scriptures. Watch real-time translation unfold.</p>
            </div>
            
            {/* Inline Translation Component */}
            <div className="max-w-5xl mx-auto space-y-6">
                <UploadCard ref={uploadCardRef} onFile={onFile} onText={onText} disabled={status !== 'idle'} />
                <ProviderSelector 
                  value={settings} 
                  onChange={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))} 
                  disabled={status !== 'idle'} 
                />
                
                {/* Translation Control Panel */}
                <div className="rounded-2xl border border-paper-300 bg-paper-50 shadow-sm p-6 space-y-4">
                  <div className="flex gap-3">
                    {status === 'idle' ? (
                      <>
                        <button 
                          onClick={() => {
                            const text = document.querySelector<HTMLTextAreaElement>('textarea')?.value;
                            if (text) {
                              handleTranslate({ type: 'text', text });
                            } else {
                              // Test with sample text
                              handleTranslate({ type: 'text', text: 'ॐ गं गणपतये नमः' });
                            }
                          }}
                          className="flex-1 rounded-2xl bg-olive-green-500 text-white px-5 py-4 text-base font-medium shadow-claude hover:bg-olive-green-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-olive-green-400 flex items-center justify-center gap-2"
                          {...(!reducedMotion && tap)}
                          disabled={status !== 'idle'}
                        >
                          <Zap className="h-5 w-5" />
                          Translate Ancient Wisdom
                        </button>
                        {(results.length > 0 || detectedLanguage) && (
                          <button 
                            onClick={resetAll}
                            className="rounded-2xl px-4 py-4 text-base font-medium hover:bg-paper-100 focus-visible:ring-2 focus-visible:ring-terra-400 flex items-center justify-center gap-2 border border-paper-300 text-ink-600"
                            {...(!reducedMotion && tap)}
                            title="Clear all content"
                          >
                            <RotateCcw className="h-5 w-5" />
                          </button>
                        )}
                      </>
                    ) : (
                      <button 
                        onClick={cancelTranslation}
                        className="flex-1 rounded-2xl px-5 py-4 text-base font-medium hover:bg-paper-100 focus-visible:ring-2 focus-visible:ring-terra-400 flex items-center justify-center gap-2 border border-paper-300"
                        {...(!reducedMotion && tap)}
                      >
                        <AlertCircle className="h-5 w-5" />
                        Cancel Translation
                      </button>
                    )}
                  </div>

                  {/* Status Display */}
                  <AnimatePresence mode="wait">
                    {status !== 'idle' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          {status === 'processing' && <Clock className="h-4 w-4 text-olive-500 animate-pulse" />}
                          {status === 'detecting' && <Zap className="h-4 w-4 text-terra-600 animate-pulse" />}
                          {status === 'translating' && <Zap className="h-4 w-4 text-terra-600 animate-pulse" />}
                          {status === 'complete' && <CheckCircle className="h-4 w-4 text-green-600" />}
                          {status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                          <span className="text-ink-700">{statusMessage}</span>
                        </div>
                        
                        {detectedLanguage && (
                          <div className="text-sm text-olive-green-500">
                            Detected language: <span className="text-ink-900 font-medium">{detectedLanguage}</span>
                          </div>
                        )}

                        {totalChunks > 0 && (
                          <div className="text-sm text-olive-green-500">
                            Progress: <span className="text-ink-900 font-medium">{completedChunks}/{totalChunks}</span> verses
                          </div>
                        )}

                        {/* Current chunk being translated */}
                        {currentChunk && status === 'translating' && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="rounded-xl bg-olive-green-50 border border-olive-green-200 p-3"
                          >
                            <div className="text-xs text-olive-green-500 mb-1">Currently translating:</div>
                            <div className="text-sm text-ink-700 italic">"{currentChunk}"</div>
                          </motion.div>
                        )}
                        
                        <ProgressBar value={progress} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div aria-live="polite" className="sr-only">
                    {statusMessage}
                    {progress > 0 && progress < 100 && `Translation progress: ${Math.round(progress)}%`}
                    {progress === 100 && 'Translation completed'}
                  </div>
                </div>

              <BilingualPreview results={results} onDownload={onDownloadPDF} isGenerating={isGeneratingPDF} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-olive-green-200 py-8 bg-olive-green-50">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-olive-green-500 rounded-lg flex items-center justify-center">
                <Languages className="h-4 w-4 text-white" />
              </div>
              <span className="font-medium tracking-tight text-ink-900">पवित्रानुवादक</span>
            </div>
            <p className="text-[15px] text-olive-green-600 text-center">AI Powered Translations</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}