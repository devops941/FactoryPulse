/**
 * Custom hook for managing authentication state
 * Uses localStorage to persist token and user info
 */

export interface User {
  id: string
  name: string
  email: string
  role: string
  plant_ids: string[]
  is_active: boolean
}

export function useAuth() {
  const token = localStorage.getItem('fp_token')
  let user: User | null = null

  try {
    const userStr = localStorage.getItem('fp_user')
    user = userStr && userStr !== 'undefined' ? JSON.parse(userStr) : null
  } catch (e) {
    user = null
  }

  const logout = () => {
    localStorage.removeItem('fp_token')
    localStorage.removeItem('fp_user')
    localStorage.removeItem('fp_refresh_token')
    window.location.href = '/login'
  }

  return {
    token,
    user,
    isAuthenticated: !!token,
    logout,
  }
}
