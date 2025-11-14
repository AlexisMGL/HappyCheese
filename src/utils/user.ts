import type { User } from '@supabase/supabase-js'

const readString = (value: unknown) => {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim()
}

export const getUserDisplayName = (user: User | null | undefined) => {
  if (!user) {
    return ''
  }
  return (
    readString(user.user_metadata?.display_name) ||
    readString(user.user_metadata?.full_name) ||
    user.email ||
    'Utilisateur'
  )
}

export const getUserContact = (user: User | null | undefined) => {
  if (!user) {
    return ''
  }
  return (
    readString(user.user_metadata?.phone) ||
    readString(user.phone) ||
    user.email ||
    ''
  )
}
