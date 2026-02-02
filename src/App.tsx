import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import ProfileSelection from './pages/ProfileSelection'
import NotFound from './pages/NotFound'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AnimatePresence } from 'framer-motion'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ToastContainer } from '@/components/notifications/ToastContainer'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <LoadingScreen />
  }
  
  if (!user) {
    return <Navigate to="/profile-selection" replace />
  }
  
  return <>{children}</>
}

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <LoadingScreen />
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AnimatePresence mode='wait'>
          <Routes>
            {/* Auth Routes */}
            <Route 
              path="/profile-selection" 
              element={
                <AuthRoute>
                  <ProfileSelection />
                </AuthRoute>
              } 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="budgets" element={<Budgets />} />
              <Route path="goals" element={<Goals />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            
            {/* NotFound */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </HashRouter>
      
      {/* Notification Components */}
      <ToastContainer />
      <NotificationCenter />
    </AuthProvider>
  )
}

export default App
