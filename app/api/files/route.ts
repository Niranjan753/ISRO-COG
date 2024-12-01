import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET() {
  console.log('API route called');
  try {
    console.log('AWS Config:', {
      region: process.env.AWS_REGION,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
    });

    // Array of folders to check
    const folders = ['L1B', 'L1C', 'L2B', 'L2C'];
    let allFiles = [];

    for (const folder of folders) {
      console.log(`Fetching files from folder: ${folder}`);
      const command = new ListObjectsV2Command({
        Bucket: 'raw-insat-data',
        Prefix: `${folder}/`,
        MaxKeys: 1000,
      });

      const response = await s3Client.send(command);
      console.log(`Files found in ${folder}:`, response.Contents?.length || 0);
      
      const folderFiles = (response.Contents || [])
        .filter(item => item.Key !== `${folder}/`)
        .map(item => ({
          filename: item.Key,
          uploadDate: item.LastModified?.toISOString().split('T')[0],
          fileType: folder,
          url: `https://raw-insat-data.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`,
          size: item.Size
        }));

      allFiles.push(...folderFiles);
    }

    console.log('Total files found:', allFiles.length);
    return Response.json({ files: allFiles });

  } catch (error) {
    console.error('Error in API route:', error);
    return Response.json(
      { error: 'Failed to fetch files from S3' },
      { status: 500 }
    );
  }
}