import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { NotesListPage } from '@/pages/NotesListPage'
import { BloggerNotesPage } from '@/pages/BloggerNotesPage'
import { BloggersListPage } from '@/pages/BloggersListPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { PluginDownloadPage } from '@/pages/PluginDownloadPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { LoginPage } from '@/pages/LoginPage'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
import { Navigation } from '@/components/Navigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { TooltipProvider } from '@/components/ui/tooltip'

function App() {
  return (
    <Router>
      <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* 公开路由 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* 受保护的路由 */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Navigation />
                <Routes>
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="notes" element={<NotesListPage />} />
                  <Route path="blogger-notes" element={<BloggerNotesPage />} />
                  <Route path="bloggers" element={<BloggersListPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="plugin/download" element={<PluginDownloadPage />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
      </TooltipProvider>
    </Router>
  )
}

export default App
