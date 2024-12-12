import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { mkdir } from 'fs/promises';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    // Get all parameters
    const r_min = formData.get('r_min') as string;
    const r_max = formData.get('r_max') as string;
    const g_min = formData.get('g_min') as string;
    const g_max = formData.get('g_max') as string;
    const b_min = formData.get('b_min') as string;
    const b_max = formData.get('b_max') as string;
    const brightness = formData.get('brightness') as string;
    const contrast = formData.get('contrast') as string;
    const saturation = formData.get('saturation') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    await mkdir(tempDir, { recursive: true });

    // Create a unique filename
    const timestamp = Date.now();
    const tempFilePath = path.join(tempDir, `${timestamp}_${file.name}`);

    // Convert File to Buffer and write to temp file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempFilePath, buffer);

    return new Promise((resolve) => {
      const pythonProcess = spawn('python', [
        path.join(process.cwd(), 'app/scripts/process_rgb.py'),
        tempFilePath,
        r_min, r_max,
        g_min, g_max,
        b_min, b_max,
        brightness || '0',
        contrast || '0',
        saturation || '0'
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
        // Clean up temp file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (err) {
          console.error('Error cleaning up temp file:', err);
        }

        if (code !== 0) {
          resolve(NextResponse.json({ 
            error: error || 'Python process failed' 
          }, { status: 500 }));
          return;
        }

        try {
          const pythonResponse = JSON.parse(result);
          if (pythonResponse.error) {
            resolve(NextResponse.json({ 
              error: pythonResponse.error 
            }, { status: 400 }));
            return;
          }
          resolve(NextResponse.json(pythonResponse));
        } catch (err) {
          resolve(NextResponse.json({ 
            error: 'Invalid response from Python script' 
          }, { status: 500 }));
        }
      });

      pythonProcess.on('error', (err) => {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (error) {
          console.error('Error cleaning up temp file:', error);
        }
        resolve(NextResponse.json({ 
          error: err.message 
        }, { status: 500 }));
      });
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
