import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '@/api'

interface User {
  id: string
  authCenterUserId: string
  role: string
  profile: Record<string, any>
  createdAt: string
  updatedAt: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')

    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await apiClient.get('/user/me')
      // 兼容两种响应格式：response.data 直接是用户对象，或者 response.data.data 是用户对象
      const userData = response.data?.data || response.data
      if (userData) {
        setUser(userData)
      }
    } catch (error) {
      // Token 无效，清除本地存储
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
    }
  }

  const login = async (token: string) => {
    localStorage.setItem('token', token)
    await checkAuth()
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    navigate('/login')
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
  }
}
