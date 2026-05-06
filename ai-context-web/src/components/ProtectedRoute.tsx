import { useContext } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext'

export default function ProtectedRoute() {
  const { accessToken } = useContext(AuthContext)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
