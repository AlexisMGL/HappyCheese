import type { User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabaseClient.ts'

interface AdminContextValue {
  isAdmin: boolean
  user: User | null
  isAuthLoading: boolean
  authError: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined)

const isUserAdmin = (candidate: User | null) => {
  if (!candidate) {
    return false
  }
  const appRole = candidate.app_metadata?.role
  const metadataFlag =
    candidate.user_metadata?.is_admin ?? candidate.app_metadata?.is_admin
  return appRole === 'admin' || metadataFlag === true
}

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (error) {
        console.error('Supabase auth session error', error)
        setAuthError(error.message)
      }

      setUser(data.session?.user ?? null)
      setIsAuthLoading(false)
    }

    void loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return
      }

      setUser(session?.user ?? null)
      setAuthError(null)
      setIsAuthLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsAuthLoading(true)
    setAuthError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Supabase login error', error)
      setAuthError(error.message)
      setIsAuthLoading(false)
      throw error
    }

    setIsAuthLoading(false)
  }, [])

  const signup = useCallback(async (email: string, password: string) => {
    setIsAuthLoading(true)
    setAuthError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          is_admin: false,
        },
      },
    })

    if (error) {
      console.error('Supabase signup error', error)
      setAuthError(error.message)
      setIsAuthLoading(false)
      throw error
    }

    setIsAuthLoading(false)
  }, [])

  const logout = useCallback(async () => {
    setIsAuthLoading(true)
    setAuthError(null)

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Supabase logout error', error)
      setAuthError(error.message)
    }

    setIsAuthLoading(false)
  }, [])

  const value = useMemo(
    () => ({
      isAdmin: isUserAdmin(user),
      user,
      isAuthLoading,
      authError,
      login,
      signup,
      logout,
    }),
    [user, isAuthLoading, authError, login, signup, logout],
  )

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export const useAdmin = () => {
  const ctx = useContext(AdminContext)
  if (!ctx) {
    throw new Error('useAdmin doit etre utilise dans AdminProvider')
  }
  return ctx
}
