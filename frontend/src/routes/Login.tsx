import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { fadeUp, tap, useReducedMotion } from '../lib/motion'

export default function Login() {
  const { login } = useAuth()
  const reducedMotion = useReducedMotion()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setError('Please enter a password')
      return
    }

    setIsLoading(true)
    setError('')

    // Add a small delay to prevent brute force attempts
    await new Promise(resolve => setTimeout(resolve, 500))

    const success = login(password)
    if (!success) {
      setError('Incorrect password. Please try again.')
      setPassword('')
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-paper-100 flex items-center justify-center p-4">
      <motion.div
        variants={!reducedMotion ? fadeUp : {}}
        initial={!reducedMotion ? "initial" : {}}
        animate={!reducedMotion ? "animate" : {}}
        className="w-full max-w-md"
      >
        <div className="bg-paper-50 rounded-2xl shadow-2xl border border-paper-300 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-terra-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-ink-900 mb-2">Welcome Back!</h1>
            <p className="text-ink-600">Where does the undeground railroad meet?</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-paper-300 rounded-xl bg-paper-100 text-ink-900 placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-terra-400 focus:border-transparent pr-12"
                  placeholder="Enter your password"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-500 hover:text-ink-700 focus:outline-none focus:ring-2 focus:ring-terra-400 rounded"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full bg-terra-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-terra-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-terra-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              {...(!reducedMotion && tap)}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-ink-500">
              This is a private application. Access is restricted.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
