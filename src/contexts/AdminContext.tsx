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

interface SignupPayload {
  email: string
  password: string
  displayName: string
  phone: string
  company?: string
  deliveryLocation: string
}

interface UpdateProfilePayload {
  displayName: string
  phone: string
  company?: string
  deliveryLocation: string
}

interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

interface AdminContextValue {
  isAdmin: boolean
  user: User | null
  isAuthLoading: boolean
  authError: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (payload: SignupPayload) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>
  changePassword: (payload: ChangePasswordPayload) => Promise<void>
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

  const signup = useCallback(async (payload: SignupPayload) => {
    const {
      email,
      password,
      displayName,
      phone,
      company,
      deliveryLocation,
    } = payload
    const trimmedDisplayName = displayName.trim()
    const trimmedPhone = phone.trim()
    const trimmedCompany = company?.trim() ?? ''
    const trimmedDeliveryLocation = deliveryLocation.trim()
    setIsAuthLoading(true)
    setAuthError(null)

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: trimmedDisplayName,
          phone: trimmedPhone,
          company: trimmedCompany || null,
          delivery_location: trimmedDeliveryLocation,
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

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const trimmedDisplayName = payload.displayName.trim()
    const trimmedPhone = payload.phone.trim()
    const trimmedCompany = payload.company?.trim() ?? ''
    const trimmedDeliveryLocation = payload.deliveryLocation.trim()

    if (!trimmedDisplayName) {
      throw new Error("Le nom d'usage est obligatoire.")
    }
    if (!trimmedPhone) {
      throw new Error('Le contact est obligatoire.')
    }
    if (!trimmedDeliveryLocation) {
      throw new Error('Le lieu de livraison est obligatoire.')
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: trimmedDisplayName,
        phone: trimmedPhone,
        company: trimmedCompany || null,
        delivery_location: trimmedDeliveryLocation,
      },
    })

    if (error) {
      throw error
    }

    if (data?.user) {
      setUser(data.user)
    }
  }, [])

  const changePassword = useCallback(
    async (payload: ChangePasswordPayload) => {
      if (!user?.email) {
        throw new Error('Ce compte ne comporte pas de courriel.')
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: payload.currentPassword,
      })

      if (authError) {
        throw new Error('Mot de passe actuel incorrect.')
      }

      const { data, error } = await supabase.auth.updateUser({
        password: payload.newPassword,
      })

      if (error) {
        throw error
      }

      if (data?.user) {
        setUser(data.user)
      }
    },
    [user],
  )

  const value = useMemo(
    () => ({
      isAdmin: isUserAdmin(user),
      user,
      isAuthLoading,
      authError,
      login,
      signup,
      logout,
      updateProfile,
      changePassword,
    }),
    [
      user,
      isAuthLoading,
      authError,
      login,
      signup,
      logout,
      updateProfile,
      changePassword,
    ],
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
