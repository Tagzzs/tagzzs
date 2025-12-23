'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
  headers?: Record<string, string>
}

export function useAuthenticatedApi() {
  const { session } = useAuth()
  const { toast } = useToast()

  const callApi = async (endpoint: string, options: ApiOptions = {}) => {
    if (!session) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to continue',
        variant: 'destructive',
      })
      throw new Error('No authentication session')
    }

    const { method = 'GET', body, headers = {} } = options

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
        if (response.status === 401) {
          toast({
            title: 'Session Expired',
            description: 'Please sign in again',
            variant: 'destructive',
          })
          // Optionally trigger a sign-out here
          throw new Error('Authentication expired')
        }

        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API call failed:', error)
      
      if (!(error instanceof Error && error.message.includes('Authentication'))) {
        toast({
          title: 'Request Failed',
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
          variant: 'destructive',
        })
      }
      
      throw error
    }
  }

  // Convenience methods
  const get = (endpoint: string, headers?: Record<string, string>) =>
    callApi(endpoint, { method: 'GET', headers })

  const post = (endpoint: string, body: unknown, headers?: Record<string, string>) =>
    callApi(endpoint, { method: 'POST', body, headers })

  const put = (endpoint: string, body: unknown, headers?: Record<string, string>) =>
    callApi(endpoint, { method: 'PUT', body, headers })

  const del = (endpoint: string, headers?: Record<string, string>) =>
    callApi(endpoint, { method: 'DELETE', headers })

  const patch = (endpoint: string, body: unknown, headers?: Record<string, string>) =>
    callApi(endpoint, { method: 'PATCH', body, headers })

  return {
    callApi,
    get,
    post,
    put,
    delete: del,
    patch,
    isAuthenticated: !!session,
  }
}

export default useAuthenticatedApi
