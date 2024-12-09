import { NextResponse } from 'next/server'
import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    let folder = ''
    
    // Determine the specific folder based on file name
    if (file.name.includes('L1B')) {
      folder = 'L1B'
    } else if (file.name.includes('L1C')) {
      folder = 'L1C'
    } else if (file.name.includes('L2B')) {
      folder = 'L2B'
    } else if (file.name.includes('L2C')) {
      folder = 'L2C'
    }

    const filename = `${folder}/${file.name}`

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.AWS_BUCKET_NAME || 'insat-data-bucket',
        Key: filename,
        Body: buffer,
        ContentType: 'application/x-hdf5',
      },
    })

    try {
      await upload.done()
      
      return NextResponse.json({ 
        success: true, 
        filename,
        url: `https://${process.env.AWS_BUCKET_NAME || 'insat-data-bucket'}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`
      })
    } catch (error) {
      console.error('Upload error:', error)
      
      if (error instanceof Error && error.message.includes('ENOTFOUND')) {
        return NextResponse.json(
          { error: 'S3 bucket not found. Please check if the bucket exists and is accessible.' },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Upload failed. Please try again.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}