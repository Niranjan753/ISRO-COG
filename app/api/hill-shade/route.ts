import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const colormap = formData.get('colormap') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create a buffer from the file
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempFilePath = path.join(process.cwd(), 'temp', `${Date.now()}.tif`);
    
    // Ensure temp directory exists
    const fs = require('fs');
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write the buffer to a temporary file
    fs.writeFileSync(tempFilePath, buffer);

    return new Promise((resolve) => {
      const pythonProcess = spawn('python', [
        path.join(process.cwd(), 'app/scripts/false-shade.py'),
        tempFilePath,
        colormap || 'terrain'
      ]);

      let result = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        // Clean up the temporary file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (err) {
          console.error('Error cleaning up temp file:', err);
        }

        if (code !== 0) {
          resolve(NextResponse.json({ error: error || 'Processing failed' }, { status: 500 }));
          return;
        }

        try {
          const processedData = JSON.parse(result);
          resolve(NextResponse.json(processedData));
        } catch (err) {
          resolve(NextResponse.json({ error: 'Invalid output format' }, { status: 500 }));
        }
      });
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
