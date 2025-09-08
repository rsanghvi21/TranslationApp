import { useState } from 'react'
import { motion } from 'framer-motion'
import { fadeUp, tap, useReducedMotion } from '@/lib/motion'
import { OpenAILogo, GeminiLogo } from './ui/logos'

type Settings = {
  provider: 'openai' | 'gemini'
  model: string
  tone?: 'formal' | 'informal' | 'neutral'
  fidelity?: 'literal' | 'adaptive' | 'balanced'
  keepLineBreaks?: boolean
}

export default function ProviderSelector({ value, onChange, disabled = false }: { value: Settings; onChange: (v: Settings)=>void; disabled?: boolean }){
  const reducedMotion = useReducedMotion();
  const [activeProvider, setActiveProvider] = useState<'openai' | 'gemini'>(value.provider)
  
  const models = activeProvider === 'openai'
    ? [
        { value:'gpt-4o-mini', label:'GPT-4o Mini (Budget)', recommended: true },
        { value:'gpt-4o', label:'GPT-4o (Highest Quality)' },
      ]
    : [
        { value:'gemini-1.5-flash', label:'Gemini 1.5 Flash (Fast)', recommended: true },
        { value:'gemini-1.5-pro', label:'Gemini 1.5 Pro (Highest Quality)' },
      ]

  const handleProviderChange = (provider: 'openai' | 'gemini') => {
    setActiveProvider(provider)
    const defaultModel = provider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash'
    onChange({ ...value, provider, model: defaultModel })
  }

  return (
    <motion.div 
      variants={!reducedMotion ? fadeUp : {}}
      initial={!reducedMotion ? "initial" : {}}
      animate={!reducedMotion ? "animate" : {}}
      className="rounded-2xl border border-paper-300 bg-paper-200 shadow-sm p-6"
    >
      <h3 className="text-base font-semibold text-ink-900 mb-4">AI Provider</h3>
      
      {/* Provider Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button 
          onClick={() => handleProviderChange('openai')}
          disabled={disabled}
          className={`px-4 py-2 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-terra-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            activeProvider === 'openai'
              ? 'bg-terra-600 text-white shadow-claude hover:bg-terra-700' 
              : 'border border-paper-300 bg-paper-50 hover:bg-paper-100 text-ink-700'
          }`}
          {...(!reducedMotion && tap)}
        >
          <div className="flex items-center gap-2">
            <OpenAILogo className="w-4 h-4" />
            OpenAI
          </div>
        </button>
        <button 
          onClick={() => handleProviderChange('gemini')}
          disabled={disabled}
          className={`px-4 py-2 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-terra-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            activeProvider === 'gemini'
              ? 'bg-terra-600 text-white shadow-claude hover:bg-terra-700' 
              : 'border border-paper-300 bg-paper-50 hover:bg-paper-100 text-ink-700'
          }`}
          {...(!reducedMotion && tap)}
        >
          <div className="flex items-center gap-2">
            <GeminiLogo className="w-4 h-4" />
            Gemini
          </div>
        </button>
      </div>

      {/* Model Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {models.map(m => (
          <button
            key={m.value}
            onClick={() => onChange({ ...value, model: m.value })}
            disabled={disabled}
            className={`px-4 py-3 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-terra-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              value.model === m.value
                ? 'bg-terra-600 text-white shadow-claude hover:bg-terra-700'
                : 'border border-paper-300 bg-paper-50 hover:bg-paper-100 text-ink-700'
            }`}
            {...(!reducedMotion && tap)}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{m.label}</span>
              {m.recommended && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  value.model === m.value 
                    ? 'bg-terra-500 text-white' 
                    : 'bg-terra-100 text-terra-700'
                }`}>
                  Recommended
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  )
}


