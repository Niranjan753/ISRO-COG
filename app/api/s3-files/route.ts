import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');
  const time = searchParams.get('time');

  if (!level || !time) {
    return NextResponse.json(
      { error: 'Missing level or time parameter' },
      { status: 400 }
    );
  }

  try {
    const jsonPath = path.join(process.cwd(), 'public', 's3_files.json');
    const fileContents = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(fileContents);

    const formattedTime = time.slice(0, 2) + ':' + time.slice(2);
    const filteredFiles = data.files.filter((file: any) => 
      file.level === level && file.time === formattedTime
    );

    return NextResponse.json({ files: filteredFiles });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files from storage' },
      { status: 500 }
    );
  }
}