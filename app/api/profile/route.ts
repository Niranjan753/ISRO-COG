import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import { mkdir, unlink, writeFile } from 'fs/promises'

export async function POST(request: Request) {
  let tempFilePath: string | null = null
  let pngPath: string | null = null
  
  try {
    const contentType = request.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const { start, end, imagePath } = await request.json()
      return handleProfileData(start, end, imagePath)
    }

    const data = await request.formData()
    const file = data.get('file') as File
    
    if (!file) {
      return new NextResponse(
        JSON.stringify({ error: 'No file provided' }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!file.name.toLowerCase().match(/\.(tiff|tif)$/)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid file type. Only TIFF files are allowed.' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Create temporary directories
    const tempDir = path.join(process.cwd(), 'public', 'temp_tiff')
    const pngDir = path.join(process.cwd(), 'public', 'temp_png')
    await mkdir(tempDir, { recursive: true })
    await mkdir(pngDir, { recursive: true })

    // Save TIFF file
    const timestamp = Date.now()
    const fileName = `${timestamp}_${file.name}`
    tempFilePath = path.join(tempDir, fileName)
    
    // Convert ArrayBuffer to Buffer and write to file
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(tempFilePath, buffer)

    // Convert TIFF to PNG using GDAL
    const pngFileName = `${timestamp}_${file.name.replace(/\.(tiff|tif)$/i, '.png')}`
    pngPath = path.join(pngDir, pngFileName)
    
    await new Promise((resolve, reject) => {
      const process = spawn('gdal_translate', ['-of', 'PNG', tempFilePath, pngPath])
      process.on('close', (code) => {
        if (code === 0) resolve(null)
        else reject(new Error('Failed to convert TIFF to PNG'))
      })
    })

    const publicPath = `/temp_png/${pngFileName}`

    return new NextResponse(
      JSON.stringify({ 
        status: 'success',
        filePath: publicPath,
        originalPath: tempFilePath
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    // Cleanup on error
    try {
      if (tempFilePath) await unlink(tempFilePath).catch(console.error)
      if (pngPath) await unlink(pngPath).catch(console.error)
    } catch (err) {
      console.warn('Failed to delete temp files:', err)
    }

    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to process file' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
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