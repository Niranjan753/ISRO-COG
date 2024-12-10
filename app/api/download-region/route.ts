import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(req: Request) {
  try {
    const { bbox } = await req.json();

    // Find the latest downloaded TIFF file in the Downloads directory
    const downloadsDir = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads');
    const files = fs.readdirSync(downloadsDir);
    const tiffFiles = files.filter(file => file.startsWith('public_selected_tiff') && file.endsWith('.tif'));
    const latestTiffFile = tiffFiles.map(file => ({
      file,
      mtime: fs.statSync(path.join(downloadsDir, file)).mtime
    })).sort((a, b) => b.mtime - a.mtime)[0]?.file;

    if (!latestTiffFile) {
      throw new Error('No TIFF file found in Downloads directory');
    }

    const tifFilePath = path.join(downloadsDir, latestTiffFile);

    // Create a process to run the Python script
    const pythonProcess = spawn('python', [
      'download_region.py',
      '--input', tifFilePath,
      '--output', 'selected_region.tif',
      '--bbox', bbox.join(',')
    ]);

    return new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}`);
          reject(new NextResponse('Failed to process region', { status: 500 }));
          return;
        }

        // Read the generated file and send it as response
        const filePath = path.join(process.cwd(), 'selected_region.tif');
        resolve(new NextResponse(filePath, {
          headers: {
            'Content-Type': 'image/tiff',
            'Content-Disposition': 'attachment; filename=selected_region.tif'
          }
        }));
      });

      pythonProcess.stdout.on('data', (data) => {
        console.log(`Python script output: ${data}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error(`Python script error: ${data}`);
      });
    });
  } catch (error) {
    console.error('Error processing download request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
