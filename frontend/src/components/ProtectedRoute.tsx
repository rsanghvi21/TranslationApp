import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useReducedMotion } from '../lib/motion'
import Login from '../routes/Login'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const reducedMotion = useReducedMotion()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper-100 flex items-center justify-center">
        <motion.div
          animate={reducedMotion ? {} : { rotate: 360 }}
          transition={reducedMotion ? {} : { duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-terra-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return <>{children}</>
}
