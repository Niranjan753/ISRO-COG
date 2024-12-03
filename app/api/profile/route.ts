import { NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import { mkdir } from 'fs/promises'
import { spawn } from 'child_process'

export async function POST(request: Request) {
  let tempFilePath: string | null = null;
  let pngPath: string | null = null;
  
  try {
    // Check if this is a JSON request (profile data request)
    const contentType = request.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      // Handle profile data request
      const { start, end, imagePath } = await request.json()
      return handleProfileData(start, end, imagePath)
    }

    // Handle file upload
    const data = await request.formData()
    const file = data.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.toLowerCase().match(/\.(tiff|tif)$/)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only TIFF files are allowed.' },
        { status: 400 }
      )
    }

    // Create temporary directory for TIFF files
    const tempDir = path.join(process.cwd(), 'public', 'temp_tiff')
    await mkdir(tempDir, { recursive: true })

    // Save file with timestamp and original name
    const timestamp = Date.now()
    const fileName = `${timestamp}_${file.name}`
    tempFilePath = path.join(tempDir, fileName)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(tempFilePath, buffer)

    // Get the path to the generated PNG
    const pngFileName = fileName.replace(/\.(tiff|tif)$/i, '_visual.png')
    pngPath = path.join(tempDir, pngFileName)
    const publicPath = `/temp_tiff/${pngFileName}`

    console.log('Debug paths:', {
      tempDir,
      fileName,
      tempFilePath,
      pngPath,
      publicPath
    })

    // Process TIFF file using Python script
    const scriptPath = path.join(process.cwd(), 'app', 'scripts', 'pathProfile.py')
    
    // Call Python script for initial processing
    const pythonProcess = spawn('python', [
      scriptPath,
      tempFilePath,
      JSON.stringify([0, 0]), // Dummy points for initial processing
      JSON.stringify([1, 1])
    ])

    let errorOutput = '';
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`Python error: ${data}`);
    });

    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
        }
      });
    });

    // Verify files exist
    if (!await fileExists(tempFilePath) || !await fileExists(pngPath)) {
      throw new Error('Failed to process TIFF file')
    }

    // Schedule cleanup after 5 minutes
    setTimeout(async () => {
      try {
        if (tempFilePath) await unlink(tempFilePath).catch(console.error)
        if (pngPath) await unlink(pngPath).catch(console.error)
      } catch (err) {
        console.warn('Failed to delete temp files:', err)
      }
    }, 5 * 60 * 1000)

    return NextResponse.json({ 
      status: 'success',
      filePath: publicPath,
      originalPath: tempFilePath
    })

  } catch (error) {
    // Cleanup on error
    try {
      if (tempFilePath) await unlink(tempFilePath).catch(console.error)
      if (pngPath) await unlink(pngPath).catch(console.error)
    } catch (err) {
      console.warn('Failed to delete temp files:', err)
    }

    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process file' },
      { status: 500 }
    )
  }
}

// Helper function to check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await import('fs/promises').then(fs => fs.access(filePath))
    return true
  } catch {
    return false
  }
}

// Function to handle profile data requests
async function handleProfileData(start: number[], end: number[], imagePath: string) {
  if (!await fileExists(imagePath)) {
    return NextResponse.json(
      { error: 'Original TIFF file not found' },
      { status: 400 }
    )
  }

  const scriptPath = path.join(process.cwd(), 'app', 'scripts', 'pathProfile.py')

  return new Promise((resolve) => {
    const pythonProcess = spawn('python', [
      scriptPath,
      imagePath,
      JSON.stringify(start), 
      JSON.stringify(end)
    ])

    let dataString = ''
    let errorString = ''

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString()
      console.error(`Error from Python script: ${data}`)
    })

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        resolve(NextResponse.json(
          { 
            error: 'Failed to process elevation profile',
            details: errorString
          },
          { status: 500 }
        ))
        return
      }

      try {
        const profileData = JSON.parse(dataString)
        resolve(NextResponse.json(profileData))
      } catch (error) {
        resolve(NextResponse.json(
          { 
            error: 'Invalid data format from Python script',
            details: dataString
          },
          { status: 500 }
        ))
      }
    })
  })
}