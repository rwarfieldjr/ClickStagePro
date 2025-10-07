import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'

type User = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  profileImageUrl: string | null
  createdAt: string
}

type UserSessionResponse = {
  success: boolean
  user: User
} | null

type AuthContextType = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password?: string) => Promise<void>
  signup: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>
  logout: () => Promise<void>
  logoutMutation: {
    isPending: boolean
    error: Error | null
  }
  refreshUser: () => void
  token: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { toast } = useToast()
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('supabase_token')
  })

  // Query to check authentication status
  const { data: userSession, isLoading, refetch } = useQuery<UserSessionResponse>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      if (!token) return null
      
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid, clear it
          localStorage.removeItem('supabase_token')
          setToken(null)
          return null
        }
        throw new Error('Failed to fetch user')
      }

      return response.json()
    },
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const isAuthenticated = userSession?.success && userSession?.user
  const user = userSession?.user || null

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password?: string }) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Login failed')
      }

      return response.json()
    },
    onSuccess: (data) => {
      if (data.session?.access_token) {
        // Email/password login - got a token
        localStorage.setItem('supabase_token', data.session.access_token)
        setToken(data.session.access_token)
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] })
        toast({
          title: "Logged in successfully",
          description: "Welcome back!"
        })
      } else if (data.message) {
        // Magic link sent
        toast({
          title: "Check your email",
          description: data.message
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async ({ email, password, firstName, lastName }: { 
      email: string; 
      password: string; 
      firstName?: string; 
      lastName?: string 
    }) => {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, firstName, lastName }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Signup failed')
      }

      return response.json()
    },
    onSuccess: (data) => {
      if (data.session?.access_token) {
        localStorage.setItem('supabase_token', data.session.access_token)
        setToken(data.session.access_token)
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] })
        toast({
          title: "Account created successfully",
          description: "Welcome to the platform!"
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  // Logout mutation
  const logoutMutationResult = useMutation({
    mutationFn: async () => {
      if (!token) return

      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Logout failed')
      }

      return response.json()
    },
    onSuccess: () => {
      localStorage.removeItem('supabase_token')
      setToken(null)
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] })
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account."
      })
    },
    onError: (error) => {
      console.error('Logout error:', error)
      // Even if logout fails, clear local token
      localStorage.removeItem('supabase_token')
      setToken(null)
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] })
      toast({
        title: "Logout failed",
        description: "There was an error logging you out, but you've been signed out locally.",
        variant: "destructive"
      })
    }
  })

  const login = async (email: string, password?: string) => {
    await loginMutation.mutateAsync({ email, password })
  }

  const signup = async (email: string, password: string, firstName?: string, lastName?: string) => {
    await signupMutation.mutateAsync({ email, password, firstName, lastName })
  }

  const logout = async () => {
    await logoutMutationResult.mutateAsync()
  }

  const refreshUser = () => {
    refetch()
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!isAuthenticated,
    login,
    signup,
    logout,
    logoutMutation: {
      isPending: logoutMutationResult.isPending,
      error: logoutMutationResult.error
    },
    refreshUser,
    token
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
