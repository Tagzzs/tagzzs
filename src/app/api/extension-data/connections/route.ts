import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getUserFromHeaders, createAuthError } from '@/utils/supabase/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/extension-data/connections
 * Fetches all extension connections for the authenticated user
 */

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user from request headers
    const user = getUserFromHeaders(req);
    
    if (!user) {
      return createAuthError('Authentication required');
    }

    const userId = user.id;
    // Fetch extension details/info
    const detailsRef = adminDb
      .collection('extension-data')
      .doc(userId)
      .collection('details')
      .doc('info');

    const detailsSnapshot = await detailsRef.get();
    const detailsData = detailsSnapshot.exists ? detailsSnapshot.data() : null;

    // Fetch all connections
    const connectionsRef = adminDb
      .collection('extension-data')
      .doc(userId)
      .collection('connections');

    const connectionsSnapshot = await connectionsRef.get();
    interface Connection {
      id: string;
      status?: string;
      lastActivity?: { toMillis?: () => number };
      [key: string]: unknown;
    }
    const connections: Connection[] = [];

    connectionsSnapshot.forEach((doc) => {
      connections.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    // Sort connections: active first, then by lastActivity
    connections.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      
      const aTime = a.lastActivity?.toMillis?.() || 0;
      const bTime = b.lastActivity?.toMillis?.() || 0;
      return bTime - aTime;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          details: detailsData,
          connections: connections,
          activeCount: connections.filter(c => c.status === 'active').length,
          totalCount: connections.length,
        }
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch extension connections',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/extension-data/connections?id=<connectionId>
 * Disconnects a specific extension connection
 */

export async function DELETE(req: NextRequest) {
  try {
    // Get authenticated user
    const user = getUserFromHeaders(req);
    
    if (!user) {
      return createAuthError('Authentication required');
    }

    const userId = user.id;
    
    // Get connection ID from query params
    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get('id');

    if (!connectionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection ID is required',
        },
        { status: 400 }
      );
    }
    // Update connection status to disconnected
    const connectionRef = adminDb
      .collection('extension-data')
      .doc(userId)
      .collection('connections')
      .doc(connectionId);

    await connectionRef.update({
      status: 'disconnected',
      isActive: false,
      lastActivity: new Date(),
      updatedAt: new Date(),
    });
    return NextResponse.json(
      {
        success: true,
        message: 'Connection disconnected successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to disconnect extension',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
