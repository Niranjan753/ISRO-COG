import { NextResponse } from 'next/server';
import { S3Client, ListObjectsCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || '';

// GET endpoint to list objects
export async function GET() {
  try {
    const command = new ListObjectsCommand({
      Bucket: BUCKET_NAME,
      MaxKeys: 100 // Adjust as needed
    });

    const data = await s3Client.send(command);
    const objects = data.Contents?.map(item => ({
      key: item.Key,
      lastModified: item.LastModified,
      size: item.Size
    })) || [];

    return NextResponse.json({ objects });
  } catch (error) {
    console.error('Error listing objects:', error);
    return NextResponse.json({ error: 'Failed to list objects' }, { status: 500 });
  }
}

// POST endpoint to generate pre-signed URL
export async function POST(request: Request) {
  try { 
    const { objectKey } = await request.json();

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
}