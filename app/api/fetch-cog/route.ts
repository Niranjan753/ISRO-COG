import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export async function POST(request: Request) {
  try {
    const { filename } = await request.json();
    
    // Log the request details
    console.log('Fetching file:', filename);
    
    const command = new GetObjectCommand({
      Bucket: 'cog-s3-data', // Changed bucket name to match your structure
      Key: filename
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      throw new Error('No data received from S3');
    }

    const chunks = [];
    for await (const chunk of response.Body as any) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Log successful fetch
    console.log('Successfully fetched file of size:', buffer.length);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/tiff',
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    // Log the detailed error
    console.error('Detailed S3 error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch COG file' },
      { status: 500 }
    );
  }
}