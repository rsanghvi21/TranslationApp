#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setup() {
  console.log('🚀 Claude Translator Setup\n');
  
  // Check if .env.local already exists
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    console.log('✅ .env.local already exists');
    const overwrite = await ask('Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }
  
  console.log('Please provide your API keys (press Enter to skip):');
  
  const openaiKey = await ask('OpenAI API Key: ');
  const googleKey = await ask('Google AI API Key: ');
  
  if (!openaiKey && !googleKey) {
    console.log('⚠️  Warning: You need at least one API key to use the translator.');
  }
  
  const maxFileMB = await ask('Max file size in MB (default: 25): ') || '25';
  const timeoutMs = await ask('PDF timeout in ms (default: 120000): ') || '120000';
  
  // Create .env.local content
  const envContent = `# AI Provider API Keys
OPENAI_API_KEY="${openaiKey}"
GOOGLE_API_KEY="${googleKey}"

# App Configuration
APP_MAX_FILE_MB="${maxFileMB}"
APP_PDF_TIMEOUT_MS="${timeoutMs}"
NEXT_PUBLIC_APP_NAME="Claude Translator"

# Next.js
NEXTAUTH_SECRET="${generateRandomSecret()}"
NEXTAUTH_URL="http://localhost:3000"
`;

  // Write .env.local file
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ Environment file created successfully!');
  console.log('\nNext steps:');
  console.log('1. Install Playwright browsers: npx playwright install chromium');
  console.log('2. Start development server: npm run dev');
  console.log('3. Open http://localhost:3000 in your browser');
  
  if (!openaiKey && !googleKey) {
    console.log('\n⚠️  Remember to add your API keys to .env.local before using the translator!');
  }
  
  rl.close();
}

function generateRandomSecret() {
  return require('crypto').randomBytes(32).toString('hex');
}

setup().catch(console.error);
