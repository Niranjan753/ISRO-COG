import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as GeoTIFF from 'geotiff';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export async function POST(request: Request) {
  try {
    const { filename, bbox, band } = await request.json();
    
    if (!filename || !bbox || bbox.length !== 4) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Get the file from S3
    const command = new GetObjectCommand({
      Bucket: 'cog-s3-data',
      Key: filename
    });

    const response = await s3Client.send(command);
    
    // Properly convert the response body to ArrayBuffer
    const chunks = [];
    const stream = response.Body as any;
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );

    // Process the TIFF
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const [minLng, minLat, maxLng, maxLat] = bbox;
    
    const window = image.getBoundingBox();
    const imageWidth = image.getWidth();
    const imageHeight = image.getHeight();

    const xScale = imageWidth / (window[2] - window[0]);
    const yScale = imageHeight / (window[3] - window[1]);

    const x0 = Math.max(0, Math.floor((minLng - window[0]) * xScale));
    const y0 = Math.max(0, Math.floor((window[3] - maxLat) * yScale));
    const x1 = Math.min(imageWidth, Math.ceil((maxLng - window[0]) * xScale));
    const y1 = Math.min(imageHeight, Math.ceil((window[3] - minLat) * yScale));

    const rasters = await image.readRasters({
      window: [x0, y0, x1, y1],
      samples: [0]
    });

    const newWidth = x1 - x0;
    const newHeight = y1 - y0;

    // Simplified metadata structure
    const metadata = {
      width: newWidth,
      height: newHeight,
      BitsPerSample: [32],
      SampleFormat: [3],
      Compression: 1,
      PhotometricInterpretation: 1,
      PlanarConfiguration: 1,
      SamplesPerPixel: 1,
      StripOffsets: [0],
      RowsPerStrip: newHeight,
      StripByteCounts: [newWidth * newHeight * 4],
      ModelPixelScale: [
        (maxLng - minLng) / newWidth,
        (maxLat - minLat) / newHeight,
        0
      ],
      ModelTiepoint: [0, 0, 0, minLng, maxLat, 0],
      GeoAsciiParams: 'WGS 84',
      GeographicTypeGeoKey: 4326,
      GDAL_NODATA: '-9999'
    };

    // Create a new typed array for the data
    const typedArray = new Float32Array(rasters[0]);

    const outputArrayBuffer = await GeoTIFF.writeArrayBuffer(
      typedArray,
      metadata
    );

    return new NextResponse(outputArrayBuffer, {
      headers: {
        'Content-Type': 'image/tiff',
        'Content-Disposition': `attachment; filename="region_${band}_${bbox.join('_')}.tiff"`,
        'X-Original-Bbox': JSON.stringify(bbox)
      }
    });

  } catch (error) {
    console.error('Error processing COG bbox:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process region' },
      { status: 500 }
    );
  }
}