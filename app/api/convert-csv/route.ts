import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'

export async function POST(request: Request) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Create tmp directory if it doesn't exist
    const tmpDir = path.join(process.cwd(), 'tmp')
    await mkdir(tmpDir, { recursive: true })

    // Setup file paths with absolute paths
    const tempInputPath = path.join(tmpDir, `${Date.now()}_input.tiff`)
    const tempOutputPath = path.join(tmpDir, `${Date.now()}_output.csv`)

    // Write uploaded file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(tempInputPath, buffer)

    // Execute Python script with proper path handling
    const scriptPath = path.join(process.cwd(), 'app', 'scripts', 'tiff_csv.py')
    
    return new Promise(async (resolve) => {
      let pythonOutput = ''
      let pythonError = ''

      const python = spawn('python', [scriptPath, tempInputPath, tempOutputPath])

      python.stdout.on('data', (data) => {
        pythonOutput += data.toString()
        console.log('Python output:', data.toString())
      })

      python.stderr.on('data', (data) => {
        pythonError += data.toString()
        console.error('Python error:', data.toString())
      })

      python.on('close', async (code) => {
        if (code !== 0) {
          console.error(`Python script failed with code ${code}:`, pythonError)
          resolve(NextResponse.json(
            { error: `Conversion failed: ${pythonError}` },
            { status: 500 }
          ))
          return
        }

        try {
          const csvContent = await readFile(tempOutputPath, 'utf-8')
          
          // Cleanup temp files
          await Promise.all([
            unlink(tempInputPath).catch(console.error),
            unlink(tempOutputPath).catch(console.error)
          ])

          resolve(new NextResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="${file.name.split('.')[0]}.csv"`,
            },
          }))
        } catch (error) {
          console.error('Error reading CSV:', error)
          resolve(NextResponse.json(
            { error: 'Failed to read converted file' },
            { status: 500 }
          ))
        }
      })
    })
  } catch (error) {
    console.error('Conversion error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to convert file' },
      { status: 500 }
    )
  }
}
