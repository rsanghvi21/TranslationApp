// Environment variable validation and helpers

export function validateEnv() {
  const errors: string[] = []
  
  // Check if at least one AI provider is configured
  if (!process.env.OPENAI_API_KEY && !process.env.GOOGLE_API_KEY) {
    errors.push('At least one AI provider API key is required (OPENAI_API_KEY or GOOGLE_API_KEY)')
  }
  
  // Validate file size limit
  const maxFileMB = parseInt(process.env.APP_MAX_FILE_MB || '25')
  if (isNaN(maxFileMB) || maxFileMB < 1 || maxFileMB > 100) {
    errors.push('APP_MAX_FILE_MB must be a number between 1 and 100')
  }
  
  // Validate timeout
  const timeoutMs = parseInt(process.env.APP_PDF_TIMEOUT_MS || '120000')
  if (isNaN(timeoutMs) || timeoutMs < 10000 || timeoutMs > 600000) {
    errors.push('APP_PDF_TIMEOUT_MS must be a number between 10000 and 600000')
  }
  
  return errors
}

export function getEnvConfig() {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY,
    googleApiKey: process.env.GOOGLE_API_KEY,
    maxFileMB: parseInt(process.env.APP_MAX_FILE_MB || '25'),
    pdfTimeoutMs: parseInt(process.env.APP_PDF_TIMEOUT_MS || '120000'),
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'पवित्रानुवादक',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  }
}

export function logEnvStatus() {
  const config = getEnvConfig()
  const errors = validateEnv()
  
  console.log('🔧 Environment Configuration:')
  console.log(`  - App Name: ${config.appName}`)
  console.log(`  - Environment: ${config.isDevelopment ? 'Development' : 'Production'}`)
  console.log(`  - OpenAI API Key: ${config.openaiApiKey ? '✅ Configured' : '❌ Missing'}`)
  console.log(`  - Google API Key: ${config.googleApiKey ? '✅ Configured' : '❌ Missing'}`)
  console.log(`  - Max File Size: ${config.maxFileMB}MB`)
  console.log(`  - PDF Timeout: ${config.pdfTimeoutMs}ms`)
  
  if (errors.length > 0) {
    console.error('\n❌ Environment Errors:')
    errors.forEach(error => console.error(`  - ${error}`))
  } else {
    console.log('\n✅ Environment configuration is valid')
  }
  
  return errors.length === 0
}
