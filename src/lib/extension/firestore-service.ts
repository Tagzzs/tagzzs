import { adminDb } from '@/lib/firebase/admin'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Constants
const MAX_CONNECTIONS = 2
const DEFAULT_CONNECTION_TIMEOUT = 5 

import { Transaction } from 'firebase-admin/firestore'

// Types for extension data
export interface ExtensionUserDetails {
  userId: string
  totalActiveConnections: number
  totalHistoricalConnections: number
  createdAt: Timestamp
  lastActivity: Timestamp
  totalContentSaved: number
  totalAPICallsAllConnections: number
  settings: {
    notifyOnNewConnection: boolean
    connectionTimeout: number
    requireReauth: boolean
  }
}

export interface ExtensionConnection {
  id: string
  userId: string
  deviceName: string
  browserType: 'chrome' | 'firefox' | 'safari' | 'edge'
  deviceFingerprint: string
  userAgent: string
  ipAddress: string
  apiKeyHash: string
  apiKeyPreview: string
  status: 'connected' | 'inactive' | 'disconnected' | 'expired'
  connectedAt: Timestamp
  lastActivity: Timestamp
  lastHeartbeat: Timestamp
  disconnectedAt?: Timestamp
  disconnectedReason?: string
  totalContentSaved: number
  totalAPICallsMade: number
  lastContentSavedAt?: Timestamp
  isActive: boolean
}

export class ExtensionFirestoreService {
  
  // Get user's extension details
  async getExtensionDetails(userId: string): Promise<ExtensionUserDetails> {
    const docRef = adminDb.collection('extension-data').doc(userId).collection('details').doc('info')
    const doc = await docRef.get()
    
    if (!doc.exists) {
      // Create default details if doesn't exist
      return await this.createExtensionDetails(userId)
    }
    
    return doc.data() as ExtensionUserDetails
  }
  
  // Create initial extension details
  async createExtensionDetails(userId: string): Promise<ExtensionUserDetails> {
    const details: ExtensionUserDetails = {
      userId,
      totalActiveConnections: 0,
      totalHistoricalConnections: 0,
      createdAt: Timestamp.now(),
      lastActivity: Timestamp.now(),
      totalContentSaved: 0,
      totalAPICallsAllConnections: 0,
      settings: {
        notifyOnNewConnection: true,
        connectionTimeout: DEFAULT_CONNECTION_TIMEOUT,
        requireReauth: false
      }
    }
    
    await adminDb.collection('extension-data').doc(userId).collection('details').doc('info').set(details)
    return details
  }
  
  // Get all connections for user
  async getConnections(userId: string): Promise<ExtensionConnection[]> {
    const snapshot = await adminDb
      .collection('extension-data')
      .doc(userId)
      .collection('connections')
      .orderBy('connectedAt', 'desc')
      .get()
    
    return snapshot.docs.map((doc) => ({ 
      id: doc.id, 
      ...doc.data() 
    } as ExtensionConnection))
  }

  // Get active connections only
  async getActiveConnections(userId: string): Promise<ExtensionConnection[]> {
    const snapshot = await adminDb
      .collection('extension-data')
      .doc(userId)
      .collection('connections')
      .where('isActive', '==', true)
      .get()
    
    // Sort in memory after fetching 
    const connections = snapshot.docs.map((doc) => ({ 
      id: doc.id, 
      ...doc.data() 
    } as ExtensionConnection))
    
    return connections.sort((a, b) => b.connectedAt.toMillis() - a.connectedAt.toMillis())
  }

  // Generate API key
  private generateAPIKey(): string {
    return `tk_ext_${crypto.randomBytes(32).toString('hex')}`
  }
  
  // Generate device name
  private generateDeviceName(browserType: string, userAgent: string): string {
    const browser = browserType.charAt(0).toUpperCase() + browserType.slice(1)
    
    // Extract OS from user agent
    let os = 'Unknown'
    if (userAgent.includes('Windows')) os = 'Windows'
    else if (userAgent.includes('Mac')) os = 'Mac'
    else if (userAgent.includes('Linux')) os = 'Linux'
    else if (userAgent.includes('Android')) os = 'Android'
    else if (userAgent.includes('iPhone')) os = 'iPhone'
    
    return `${browser} on ${os}`
  }
  
  // Create new connection
  async createConnection(
    userId: string, 
    connectionData: {
      browserType: string
      deviceFingerprint: string
      userAgent: string
      ipAddress: string
      deviceName?: string
    }
  ): Promise<{ connection: ExtensionConnection; apiKey: string }> {
    
    // Check connection limit
    const activeConnections = await this.getActiveConnections(userId)
    
    if (activeConnections.length >= MAX_CONNECTIONS) {
      throw new Error(`Maximum ${MAX_CONNECTIONS} connections allowed`)
    }
    
    // Check for duplicate device
    const existingConnection = activeConnections.find(
      conn => conn.deviceFingerprint === connectionData.deviceFingerprint
    )
    
    if (existingConnection) {
      throw new Error('Device already connected')
    }
    
    // Generate connection data
    const connectionId = crypto.randomUUID()
    const apiKey = this.generateAPIKey()
    const apiKeyHash = await bcrypt.hash(apiKey, 12)
    const apiKeyPreview = `${apiKey.substring(0, 12)}...****`
    const deviceName = connectionData.deviceName || 
      this.generateDeviceName(connectionData.browserType, connectionData.userAgent)
    
    const connection: ExtensionConnection = {
      id: connectionId,
      userId,
      deviceName,
      browserType: connectionData.browserType as 'chrome' | 'firefox' | 'safari' | 'edge',
      deviceFingerprint: connectionData.deviceFingerprint,
      userAgent: connectionData.userAgent,
      ipAddress: connectionData.ipAddress,
      apiKeyHash,
      apiKeyPreview,
      status: 'connected',
      connectedAt: Timestamp.now(),
      lastActivity: Timestamp.now(),
      lastHeartbeat: Timestamp.now(),
      totalContentSaved: 0,
      totalAPICallsMade: 0,
      isActive: true
    }
    
    // Save to Firestore in transaction
    await adminDb.runTransaction(async (transaction: Transaction) => {
      const connectionRef = adminDb
        .collection('extension-data')
        .doc(userId)
        .collection('connections')
        .doc(connectionId)
      
      const detailsRef = adminDb
        .collection('extension-data')
        .doc(userId)
        .collection('details')
        .doc('info')
      
      // Get current details or create default
      const detailsDoc = await transaction.get(detailsRef)
      const currentDetails = detailsDoc.exists ? 
        detailsDoc.data() as ExtensionUserDetails : 
        await this.createExtensionDetails(userId)
      
      // Update details
      const updatedDetails = {
        ...currentDetails,
        totalActiveConnections: (currentDetails.totalActiveConnections || 0) + 1,
        totalHistoricalConnections: (currentDetails.totalHistoricalConnections || 0) + 1,
        lastActivity: Timestamp.now()
      }
      
      // Execute transaction
      transaction.set(connectionRef, connection)
      transaction.set(detailsRef, updatedDetails, { merge: true })
    })
    
    return { connection, apiKey }
  }
  
  // Update connection activity
  async updateConnectionActivity(userId: string, connectionId: string): Promise<void> {
    await adminDb
      .collection('extension-data')
      .doc(userId)
      .collection('connections')
      .doc(connectionId)
      .update({
        lastActivity: Timestamp.now(),
        lastHeartbeat: Timestamp.now(),
        status: 'connected'
      })
  }
  
  // Disconnect connection
  async disconnectConnection(
    userId: string, 
    connectionId: string, 
    reason: string = 'Manual disconnect'
  ): Promise<void> {
    
    await adminDb.runTransaction(async (transaction: Transaction) => {
      const connectionRef = adminDb
        .collection('extension-data')
        .doc(userId)
        .collection('connections')
        .doc(connectionId)
      
      const detailsRef = adminDb
        .collection('extension-data')
        .doc(userId)
        .collection('details')
        .doc('info')
      
      // Read details first
      const detailsDoc = await transaction.get(detailsRef)
      
      // Update connection
      transaction.update(connectionRef, {
        isActive: false,
        status: 'disconnected',
        disconnectedAt: Timestamp.now(),
        disconnectedReason: reason
      })
      
      // Update details
      if (detailsDoc.exists) {
        const currentDetails = detailsDoc.data() as ExtensionUserDetails
        transaction.update(detailsRef, {
          totalActiveConnections: Math.max(0, (currentDetails.totalActiveConnections || 1) - 1),
          lastActivity: Timestamp.now()
        })
      }
    })
  }
  
  // Validate API key
  async validateAPIKey(apiKey: string): Promise<ExtensionConnection | null> {
    try {
      // Get all connections 
      const allConnections = await adminDb.collectionGroup('connections').get()
      
      // Check each active connection's API key
      for (const doc of allConnections.docs) {
        const connection = doc.data() as ExtensionConnection
        
        // Only check active connections
        if (!connection.isActive) continue
        
        const isValid = await bcrypt.compare(apiKey, connection.apiKeyHash)
        
        if (isValid) {
          return { ...connection, id: doc.id }
        }
      }
      
      return null
    } catch (error) {
      console.error('Error validating API key:', error)
      return null
    }
  }
  
  // Update connection stats
  async updateConnectionStats(
    userId: string,
    connectionId: string,
    stats: { contentSaved?: number; apiCalls?: number }
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      lastActivity: Timestamp.now()
    }
    
    if (stats.contentSaved) {
      updates.totalContentSaved = FieldValue.increment(stats.contentSaved)
    }
    
    if (stats.apiCalls) {
      updates.totalAPICallsMade = FieldValue.increment(stats.apiCalls)
    }
    
    await adminDb
      .collection('extension-data')
      .doc(userId)
      .collection('connections')
      .doc(connectionId)
      .update(updates)
  }
}

// Export singleton instance
export const extensionService = new ExtensionFirestoreService()
