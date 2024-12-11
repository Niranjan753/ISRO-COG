import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const north = formData.get('north');
    const south = formData.get('south');
    const east = formData.get('east');
    const west = formData.get('west');

    if (!file || !north || !south || !east || !west) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create a temporary directory for processing
    const tempDir = path.join(process.cwd(), 'temp');
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    const uploadPath = path.join(tempDir, file.name);

    // Save the uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(uploadPath, buffer);

    // Construct the Python script command
    const scriptPath = path.join(process.cwd(), 'scripts', 'selectivity.py');
    const command = `python "${scriptPath}" --file "${uploadPath}" --north ${north} --south ${south} --east ${east} --west ${west}`;

    // Execute the Python script
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.error('Python script error:', stderr);
      return NextResponse.json(
        { error: 'Error processing file' },
        { status: 500 }
      );
    }

    // Clean up the temporary file using fs.unlink instead of rm command
    try {
      await unlink(uploadPath);
    } catch (err) {
      console.warn('Failed to delete temporary file:', err);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'File processed successfully',
      output: stdout 
    });

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};