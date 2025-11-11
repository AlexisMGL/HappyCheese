import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface AdminContextValue {
  isAdmin: boolean
  setAdmin: (value: boolean) => void
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined)

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false)

  const value = useMemo(
    () => ({
      isAdmin,
      setAdmin: setIsAdmin,
    }),
    [isAdmin],
  )

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export const useAdmin = () => {
  const ctx = useContext(AdminContext)
  if (!ctx) {
    throw new Error('useAdmin doit être utilisé dans AdminProvider')
  }
  return ctx
}

