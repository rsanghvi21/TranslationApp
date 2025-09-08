// Logo components for AI providers

interface LogoProps {
  className?: string
}

export function OpenAILogo({ className = "w-4 h-4" }: LogoProps) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor"
    >
      {/* Simplified OpenAI-inspired logo */}
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
      <path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9 9 9 0 0 0 9-9 9 9 0 0 0-9-9zm0 16a7 7 0 0 1-7-7 7 7 0 0 1 7-7 7 7 0 0 1 7 7 7 7 0 0 1-7 7z" opacity="0.3"/>
      <path d="M12 8a4 4 0 0 0-4 4 4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 0-4-4zm0 6a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2z"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  )
}

export function GeminiLogo({ className = "w-4 h-4" }: LogoProps) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor"
    >
      {/* Google Gemini-inspired star/sparkle design */}
      <path d="M12 2L9.5 9.5L2 12L9.5 14.5L12 22L14.5 14.5L22 12L14.5 9.5L12 2Z" opacity="0.8"/>
      <path d="M12 6L10.5 10.5L6 12L10.5 13.5L12 18L13.5 13.5L18 12L13.5 10.5L12 6Z" fill="currentColor"/>
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.6"/>
    </svg>
  )
}

// Alternative Gemini logo with more geometric design
export function GeminiLogoAlt({ className = "w-4 h-4" }: LogoProps) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor"
    >
      <defs>
        <linearGradient id="geminiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1"/>
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.6"/>
        </linearGradient>
      </defs>
      <path fill="url(#geminiGradient)" d="M12 2L6.5 7.5L12 13L17.5 7.5L12 2ZM12 11L6.5 16.5L12 22L17.5 16.5L12 11Z"/>
      <path fill="currentColor" opacity="0.8" d="M2 12L7.5 6.5L13 12L7.5 17.5L2 12ZM11 12L16.5 6.5L22 12L16.5 17.5L11 12Z"/>
    </svg>
  )
}
