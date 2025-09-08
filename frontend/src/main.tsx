import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Landing from './routes/Landing'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import './styles/index.css'

const router = createBrowserRouter([
  { 
    path: '/', 
    element: (
      <ProtectedRoute>
        <Landing />
      </ProtectedRoute>
    ) 
  },
  { 
    path: '/translate', 
    element: (
      <ProtectedRoute>
        <Landing />
      </ProtectedRoute>
    ) 
  },
])

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AnimatePresence mode="wait">
        <RouterProvider router={router} />
      </AnimatePresence>
    </AuthProvider>
  </React.StrictMode>,
)
