'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '../utils/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasInitialized, setHasInitialized] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Session fetch error:', error)
      } finally {
        setLoading(false)
        setHasInitialized(true)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle sign-in and sign-up events
        if (event === 'SIGNED_IN') {
          if (hasInitialized && !user && session?.user) {
            const params = new URLSearchParams(window.location.search)
            const redirectTo = params.get('redirect') || '/dashboard'
            
            // Additional check: only redirect if we're on auth pages
            const currentPath = window.location.pathname
            if (currentPath.startsWith('/auth/') || currentPath === '/') {
              router.push(redirectTo)
            }
          }
        }

        // Handle sign-out event
        if (event === 'SIGNED_OUT') {
          // Clear any cached data and redirect to sign-in
          router.push('/auth/sign-in')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth, router, hasInitialized, user])

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('Error refreshing session:', error)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
    } catch (error) {
      console.error('Refresh session error:', error)
    }
  }

  const value = {
    user,
    session,
    loading,
    signOut,
    refreshSession,
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

export default AuthProvider
