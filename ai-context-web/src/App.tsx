import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import SystemsPage from './pages/SystemsPage'
import SystemDetailPage from './pages/SystemDetailPage'
import AppDetailPage from './pages/AppDetailPage'
import IndexProgressPage from './pages/IndexProgressPage'
import RoutesPage from './pages/RoutesPage'
import ImpactPage from './pages/ImpactPage'
import SearchPage from './pages/SearchPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<SystemsPage />} />
              <Route path="/systems/:id" element={<SystemDetailPage />} />
              <Route path="/apps/:id" element={<AppDetailPage />} />
              <Route path="/apps/:id/index/:jobId" element={<IndexProgressPage />} />
              <Route path="/apps/:id/routes" element={<RoutesPage />} />
              <Route path="/apps/:id/impact" element={<ImpactPage />} />
              <Route path="/apps/:id/search" element={<SearchPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
