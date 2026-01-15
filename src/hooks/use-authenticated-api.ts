import { useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
  headers?: Record<string, string>
}

export function useAuthenticatedApi() {
  const { user, refreshSession } = useAuth()
  const { toast } = useToast()

  const callApi = useCallback(async (endpoint: string, options: ApiOptions = {}, retryCount = 0) => {
    // If not authenticated, we can optionally skip this check if we trust the caller knows what they are doing,
    // but usually we want to ensure user is logged in.
    // However, if we are in the middle of a refresh retry, user might be null momentarily?
    // Let's keep the check but maybe not strict if we are retrying?
    if (!user && retryCount === 0) {
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
          ...headers,
        },
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        if (response.status === 401 && retryCount < 1) {
          // Attempt to refresh session
          try {
            console.log('Access token expired, attempting refesh...');
            await refreshSession();
            // Cookies should be updated now, retry request
            return await callApi(endpoint, options, retryCount + 1);
          } catch (refreshError) {
            console.error('Session refresh failed:', refreshError);
            // Fall through to error handling
          }
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
        if (response.status === 401) {
          toast({
            title: 'Session Expired',
            description: 'Please sign in again',
            variant: 'destructive',
          })
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
  }, [user, refreshSession, toast])

  // Convenience methods
  const get = useCallback((endpoint: string, headers?: Record<string, string>) =>
    callApi(endpoint, { method: 'GET', headers }), [callApi])

  const post = useCallback((endpoint: string, body: unknown, headers?: Record<string, string>) =>
    callApi(endpoint, { method: 'POST', body, headers }), [callApi])

  const put = useCallback((endpoint: string, body: unknown, headers?: Record<string, string>) =>
    callApi(endpoint, { method: 'PUT', body, headers }), [callApi])

  const del = useCallback((endpoint: string, headers?: Record<string, string>) =>
    callApi(endpoint, { method: 'DELETE', headers }), [callApi])

  const patch = useCallback((endpoint: string, body: unknown, headers?: Record<string, string>) =>
    callApi(endpoint, { method: 'PATCH', body, headers }), [callApi])

  return useMemo(() => ({
    callApi,
    get,
    post,
    put,
    delete: del,
    patch,
    isAuthenticated: !!user,
  }), [callApi, get, post, put, del, patch, user])
}

export default useAuthenticatedApi
