'use client'

import React, { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { LoadingScreen } from '@/components/ui/loading-screen'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}

function AuthGuard({ 
  children, 
  fallback, 
  redirectTo = '/auth/sign-in' 
}: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      // Save the current path for redirect after login
      const currentPath = window.location.pathname + window.location.search
      const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`
      router.push(redirectUrl)
    }
  }, [user, loading, router, redirectTo])

  // Show loading state
  if (loading) {
    return <LoadingScreen />
  }

  // Show fallback if user is not authenticated
  if (!user) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    // Return null while redirecting
    return null
  }

  // User is authenticated, render children
  return <>{children}</>
}

interface PublicRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

function PublicRoute({ 
  children, 
  redirectTo = '/dashboard' 
}: PublicRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push(redirectTo)
    }
  }, [user, loading, router, redirectTo])

  // Show loading state
  if (loading) {
    return <LoadingScreen />
  }

  // User is authenticated, redirect them
  if (user) {
    return null
  }

  // User is not authenticated, show the public content
  return <>{children}</>
}

// Export both as named and default
export { AuthGuard, PublicRoute }
export default AuthGuard
