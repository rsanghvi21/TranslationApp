import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeUp, tap, useReducedMotion } from '@/lib/motion'
import { Link } from 'react-router-dom'
import { ArrowLeft, Zap, Clock, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react'
import UploadCard, { type UploadCardRef } from '@/components/UploadCard'
import ProviderSelector from '@/components/ProviderSelector'
import ProgressBar from '@/components/ProgressBar'
import BilingualPreview, { type TranslationResult } from '@/components/BilingualPreview'

type TranslationStatus = 'idle' | 'processing' | 'detecting' | 'translating' | 'complete' | 'error'

export default function Translate(){
  const reducedMotion = useReducedMotion();
  const [settings, setSettings] = useState({ provider:'openai' as 'openai'|'gemini', model:'gpt-4o-mini' })
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
                    setStatusMessage(`Detected: ${data.detectedLanguage} (${data.totalChunks} chunks)`)
                    break

                  case 'translation_start':
                    setCurrentChunk(data.text)
                    setStatusMessage(`Translating chunk ${data.chunkId}...`)
                    setProgress(25 + (data.progress * 0.7)) // 25-95% for translation
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

                  case 'translation_error':
                    console.warn('Translation error:', data.error)
                    setResults(prev => {
                      const updated = [...prev]
                      const existingIndex = updated.findIndex(r => r.id === data.fallbackResult.id)
                      if (existingIndex >= 0) {
                        updated[existingIndex] = data.fallbackResult
                      } else {
                        updated.push(data.fallbackResult)
                      }
                      return updated
                    })
                    setCompletedChunks(prev => prev + 1)
                    setProgress(25 + (data.progress * 0.7))
                    break

                  case 'complete':
                    setStatus('complete')
                    setStatusMessage(`Translation complete! ${data.stats.successfulTranslations}/${data.stats.totalChunks} chunks translated.`)
                    setProgress(100)
                    setCurrentChunk('')
                    // Sort results by original order
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
          setStatusMessage(`Translation complete! ${json.stats.successfulTranslations}/${json.stats.totalChunks} chunks translated.`)
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
      <header className="sticky top-0 z-40 bg-paper-50/85 backdrop-blur border-b border-paper-300">
        <div className="mx-auto max-w-6xl px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm hover:text-terra-600 focus-visible:ring-2 focus-visible:ring-terra-400 rounded-lg px-2 py-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <span className="font-medium tracking-tight text-ink-900">AI Translator</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 lg:px-8 py-16 space-y-12">
        <motion.h1 
          variants={!reducedMotion ? fadeUp : {}}
          initial={!reducedMotion ? "initial" : {}}
          animate={!reducedMotion ? "animate" : {}}
          className="text-4xl md:text-5xl font-semibold tracking-tight text-ink-900"
        >
          Translate documents with AI
        </motion.h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <UploadCard ref={uploadCardRef} onFile={onFile} onText={onText} disabled={status !== 'idle'} />
            <ProviderSelector value={settings} onChange={setSettings} disabled={status !== 'idle'} />
            
            {/* Translation Control Panel */}
            <div className="rounded-2xl border border-paper-300 bg-paper-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                {status === 'idle' ? (
                  <>
                    <button 
                      className="flex-1 rounded-2xl bg-terra-600 text-white px-5 py-3 text-sm shadow-claude hover:bg-terra-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-terra-400 inline-flex items-center justify-center gap-2"
                      {...(!reducedMotion && tap)}
                      disabled={status !== 'idle'}
                    >
                      <Zap className="h-4 w-4" />
                      Translate
                    </button>
                    {(results.length > 0 || detectedLanguage) && (
                      <button 
                        onClick={resetAll}
                        className="rounded-2xl px-4 py-3 text-sm hover:bg-paper-100 focus-visible:ring-2 focus-visible:ring-terra-400 inline-flex items-center justify-center gap-2 border border-paper-300 text-ink-600"
                        {...(!reducedMotion && tap)}
                        title="Clear all content"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <button 
                    onClick={cancelTranslation}
                    className="flex-1 rounded-2xl px-5 py-3 text-sm hover:bg-paper-100 focus-visible:ring-2 focus-visible:ring-terra-400 inline-flex items-center justify-center gap-2"
                    {...(!reducedMotion && tap)}
                  >
                    <AlertCircle className="h-4 w-4" />
                    Cancel
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
                      <div className="text-sm text-olive-500">
                        Detected language: <span className="text-ink-900 font-medium">{detectedLanguage}</span>
                      </div>
                    )}

                    {totalChunks > 0 && (
                      <div className="text-sm text-olive-500">
                        Progress: <span className="text-ink-900 font-medium">{completedChunks}/{totalChunks}</span> chunks
                      </div>
                    )}

                    {/* Current chunk being translated */}
                    {currentChunk && status === 'translating' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-xl bg-paper-50 border border-paper-300 p-3"
                      >
                        <div className="text-xs text-olive-500 mb-1">Currently translating:</div>
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
          </div>
          
          {/* Stats Panel */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-paper-300 bg-paper-200 shadow-sm p-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-olive-500">Blocks:</span>
                <span className="text-ink-900 font-medium">{results.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-olive-500">Characters:</span>
                <span className="text-ink-900 font-medium">
                  {results.reduce((s,r)=>s+r.source.length+r.translated.length,0).toLocaleString()}
                </span>
              </div>
              {totalChunks > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-olive-500">Completed:</span>
                  <span className="text-ink-900 font-medium">{completedChunks}/{totalChunks}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <BilingualPreview results={results} onDownload={onDownloadPDF} isGenerating={isGeneratingPDF} />
      </main>
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