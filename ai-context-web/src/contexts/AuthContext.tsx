import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { User } from '../api/auth'

interface AuthContextValue {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  login: (accessToken: string, refreshToken: string, user: User) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  accessToken: null,
  refreshToken: null,
  login: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const s = localStorage.getItem('user')
    return s ? JSON.parse(s) : null
  })
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem('access_token'),
  )
  const [refreshToken, setRefreshToken] = useState<string | null>(
    () => localStorage.getItem('refresh_token'),
  )

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('access_token', accessToken)
    } else {
      localStorage.removeItem('access_token')
    }
  }, [accessToken])

  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken)
    } else {
      localStorage.removeItem('refresh_token')
    }
  }, [refreshToken])

  const login = useCallback((access: string, refresh: string, u: User) => {
    setAccessToken(access)
    setRefreshToken(refresh)
    setUser(u)
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    localStorage.setItem('user', JSON.stringify(u))
  }, [])

  const logout = useCallback(() => {
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  }, [])

  return (
    <AuthContext.Provider value={{ user, accessToken, refreshToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
