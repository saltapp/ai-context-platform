import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
})

// Mutex-style variable to prevent concurrent token refresh requests
let refreshingPromise: Promise<any> | null = null

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config

    // If not a 401 or already retried, reject immediately
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      // No refresh token available, clear and redirect
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Prevent concurrent refresh: reuse the same promise
    if (!refreshingPromise) {
      refreshingPromise = axios
        .post(
          `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/auth/refresh`,
          { refresh_token: refreshToken },
        )
        .then((res) => {
          const { access_token, refresh_token } = res.data
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)
          return res.data
        })
        .catch(() => {
          // Refresh failed: clear tokens and redirect
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          window.location.href = '/login'
          return Promise.reject(error)
        })
        .finally(() => {
          refreshingPromise = null
        })
    }

    try {
      await refreshingPromise
      originalRequest._retry = true
      // Update the Authorization header with the new access_token
      const newToken = localStorage.getItem('access_token')
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
      }
      return client(originalRequest)
    } catch {
      return Promise.reject(error)
    }
  },
)

export default client
