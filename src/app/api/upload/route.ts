import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey
      })
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      )
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('fileType') as string || 'content'
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size based on type
    let maxSize = 10 * 1024 * 1024 
    let bucketName = 'user_uploads'

    if (fileType === 'thumbnail') {
      maxSize = 2 * 1024 * 1024 
      bucketName = 'user_thumbnails'
      
      // Validate thumbnail is an image
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Thumbnail must be an image file' },
          { status: 400 }
        )
      }
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit` },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to appropriate Supabase storage bucket
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(uniqueFileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return NextResponse.json(
        { error: 'Failed to upload file', details: error.message },
        { status: 500 }
      )
    }

    // Get public URL from the appropriate bucket
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uniqueFileName)

    return NextResponse.json({
      success: true,
      fileName: uniqueFileName,
      fileUrl: urlData.publicUrl,
      fileSize: file.size,
      fileType: file.type,
      originalName: file.name,
      bucket: bucketName,
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}