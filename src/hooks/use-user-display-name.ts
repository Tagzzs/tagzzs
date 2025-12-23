import { useAuth } from '@/contexts/AuthContext'

export function useUserDisplayName(): string {
  const { user } = useAuth()
  
  if (!user) return 'User'
  
  // Try to get full name from user metadata
  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name
  }
  
  // Fall back to email username
  if (user.email) {
    return user.email.split('@')[0]
  }
  
  return 'User'
}
