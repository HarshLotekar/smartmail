import { useState, useEffect, createContext, useContext } from 'react'
import { authAPI, apiHelpers } from '../services/api'

/**
 * Authentication Context
 */
const AuthContext = createContext(null)

/**
 * Authentication Provider Component
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize authentication state
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if we have stored user data
      const storedUser = localStorage.getItem('smartmail_user')
      const token = apiHelpers.getAuthToken()

      if (storedUser && token) {
        // Parse stored user data
        const userData = JSON.parse(storedUser)
        setUser(userData)
        
        // Verify token with backend
        try {
          const response = await authAPI.getStatus()
          if (response.data.success && response.data.user) {
            setUser(response.data.user)
            localStorage.setItem('smartmail_user', JSON.stringify(response.data.user))
          }
        } catch (apiError) {
          // Token invalid, clear stored data
          console.warn('Token verification failed:', apiError.message)
          logout()
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      setError('Authentication initialization failed')
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = (userData, token) => {
    try {
      setUser(userData)
      localStorage.setItem('smartmail_user', JSON.stringify(userData))
      if (token) {
        apiHelpers.setAuthToken(token)
      }
      setError(null)
    } catch (error) {
      console.error('Login error:', error)
      setError('Login failed')
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      await authAPI.logout()
    } catch (error) {
      console.warn('Logout API error:', error)
    } finally {
      setUser(null)
      localStorage.removeItem('smartmail_user')
      localStorage.removeItem('smartmail_token')
      setError(null)
      setLoading(false)
    }
  }

  const updateUser = (userData) => {
    setUser(userData)
    localStorage.setItem('smartmail_user', JSON.stringify(userData))
  }

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Custom hook to use authentication
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}