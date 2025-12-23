import { NextRequest, NextResponse } from 'next/server'
import { getUserFromHeaders } from '@/utils/supabase/auth'
import { extensionService } from '@/lib/extension/firestore-service'

// Validate extension authentication
function validateExtensionRequest(request: NextRequest) {
  const extensionId = request.headers.get('x-extension-id')
  const extensionVersion = request.headers.get('x-extension-version')
  const extensionSecret = request.headers.get('x-extension-secret')
  
  // Validate that request is coming from our extension
  const validExtensionIds = [
    'tagzs-chrome-extension-v1',
    'tagzs-firefox-extension-v1',
    'tagzs-safari-extension-v1',
    'tagzs-edge-extension-v1',
    'tagzs-web-interface-v1'
  ]
  
  if (!extensionId || !validExtensionIds.includes(extensionId)) {
    throw new Error('Invalid extension ID')
  }
  
  // Validate extension secret 
  const expectedSecret = process.env.EXTENSION_SECRET_KEY || 'tagzs-ext-secret-2025'
  if (!extensionSecret || extensionSecret !== expectedSecret) {
    throw new Error('Invalid extension credentials')
  }
  
  // Basic version validation
  if (!extensionVersion || !extensionVersion.match(/^\d+\.\d+\.\d+$/)) {
    throw new Error('Invalid extension version')
  }
  
  return { extensionId, extensionVersion }
}

export async function POST(request: NextRequest) {
  try {
    // Validate user authentication
    const user = await getUserFromHeaders(request)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    validateExtensionRequest(request)

    // Parse request body
    const body = await request.json()
    const { browserType, deviceFingerprint, deviceName } = body

    if (!browserType || !deviceFingerprint) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: browserType, deviceFingerprint',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    const userId = user.id

    const { connection, apiKey } = await extensionService.createConnection(userId, {
      browserType,
      deviceFingerprint,
      userAgent: request.headers.get('user-agent') || '',
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || '',
      deviceName
    })

    return NextResponse.json({
      success: true,
      data: {
        connectionId: connection.id,
        apiKey,
        apiKeyPreview: connection.apiKeyPreview,
        deviceName: connection.deviceName,
        status: connection.status,
        userEmail: user.email,
        userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        message: 'Extension connection created successfully'
      }
    }, { status: 201 })

  } catch (error: unknown) {
    console.error('[EXTENSION_CONNECTION] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Handle specific errors
    if (errorMessage.includes('Maximum') || errorMessage.includes('already connected')) {
      return NextResponse.json({
        success: false,
        error: errorMessage,
        code: 'CONNECTION_LIMIT_ERROR'
      }, { status: 400 })
    }
    
    if (errorMessage.includes('Invalid extension')) {
      return NextResponse.json({
        success: false,
        error: errorMessage,
        code: 'EXTENSION_AUTH_ERROR'
      }, { status: 403 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create extension connection',
      code: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 })
  }
}

// List user's connections (Dashboard access)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromHeaders(request)
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    // Check if this is an extension request (requires API key validation)
    const apiKey = request.headers.get('x-api-key')
    if (apiKey) {
      try {
        validateExtensionRequest(request)
        const connection = await extensionService.validateAPIKey(apiKey)
        if (!connection || connection.userId !== user.id) {
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid API key',
            code: 'INVALID_API_KEY'
          }, { status: 401 })
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Extension validation failed'
        return NextResponse.json({
          success: false,
          error: errorMessage,
          code: 'EXTENSION_AUTH_ERROR'
        }, { status: 403 })
      }
    }

    const connections = await extensionService.getConnections(user.id)
    const details = await extensionService.getExtensionDetails(user.id)

    // Remove sensitive data
    const sanitizedConnections = connections.map(conn => ({
      id: conn.id,
      deviceName: conn.deviceName,
      browserType: conn.browserType,
      status: conn.status,
      connectedAt: conn.connectedAt,
      lastActivity: conn.lastActivity,
      totalContentSaved: conn.totalContentSaved,
      totalAPICallsMade: conn.totalAPICallsMade,
      isActive: conn.isActive,
      apiKeyPreview: conn.apiKeyPreview,
      disconnectedAt: conn.disconnectedAt,
      disconnectedReason: conn.disconnectedReason
    }))

    return NextResponse.json({
      success: true,
      data: {
        connections: sanitizedConnections,
        details: {
          totalActiveConnections: details.totalActiveConnections,
          totalHistoricalConnections: details.totalHistoricalConnections,
          settings: details.settings
        }
      }
    })

  } catch (error: unknown) {
    console.error('[EXTENSION_CONNECTIONS_GET] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch connections'
    }, { status: 500 })
  }
}

// Disconnect specific connection
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromHeaders(request)
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const url = new URL(request.url)
    const connectionId = url.searchParams.get('id')

    if (!connectionId) {
      return NextResponse.json({
        success: false,
        error: 'Connection ID required',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    await extensionService.disconnectConnection(user.id, connectionId, 'Manual disconnect')

    return NextResponse.json({
      success: true,
      message: 'Extension connection disconnected successfully'
    })

  } catch (error: unknown) {
    console.error('[EXTENSION_DISCONNECT] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to disconnect extension'
    }, { status: 500 })
  }
}
