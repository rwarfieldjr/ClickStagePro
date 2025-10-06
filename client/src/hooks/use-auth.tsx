import { createContext, useContext, ReactNode } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiRequest, queryClient, getQueryFn } from '@/lib/queryClient'
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
  login: () => void
  logout: () => Promise<void>
  logoutMutation: {
    isPending: boolean
    error: Error | null
  }
  refreshUser: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { toast } = useToast()

  // Query to check authentication status using standardized query function
  const { data: userSession, isLoading, refetch } = useQuery<UserSessionResponse>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const isAuthenticated = userSession?.success && userSession?.user
  const user = userSession?.user || null

  // Logout mutation with exposed state
  const logoutMutationResult = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/logout')
      return response.json()
    },
    onSuccess: () => {
      // Invalidate the user session query to refresh auth state
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] })
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account."
      })
    },
    onError: (error) => {
      console.error('Logout error:', error)
      toast({
        title: "Logout failed",
        description: "There was an error logging you out. Please try again.",
        variant: "destructive"
      })
    }
  })

  const login = () => {
    // Redirect to Replit Auth login
    window.location.href = '/api/login'
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
    logout,
    logoutMutation: {
      isPending: logoutMutationResult.isPending,
      error: logoutMutationResult.error
    },
    refreshUser
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