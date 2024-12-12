'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const PlotlyModule = dynamic(
  () => import('plotly.js-dist').then((mod) => mod.default),
  { ssr: false }
)

interface Point {
  x: number
  y: number
}

export default function PathProfile() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingEnabled, setDrawingEnabled] = useState(false)
  const [lineData, setLineData] = useState<Point[]>([])
  const [statusMessage, setStatusMessage] = useState('')
  const [currentFile, setCurrentFile] = useState<string>('')
  const [plotly, setPlotly] = useState<any>(null)

  useEffect(() => {
    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      setCtx(context)
    }

    import('plotly.js-dist').then((mod) => {
      setPlotly(mod.default)
    })
  }, [])

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setStatusMessage('Please choose a file.')
      return
    }

    if (!file.name.toLowerCase().match(/\.(tiff|tif)$/)) {
      setStatusMessage('Please select a valid TIFF file.')
      return
    }

    setStatusMessage('Uploading...')
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/profile', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload file')
      }

      if (!data.filePath) {
        throw new Error('No file path received')
      }

      const fullPath = window.location.origin + data.filePath
      setCurrentFile(data.originalPath)
      
      const newImg = new Image()
      newImg.onload = () => {
        if (canvasRef.current && ctx) {
          canvasRef.current.width = newImg.width
          canvasRef.current.height = newImg.height
          
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          ctx.drawImage(newImg, 0, 0)
          
          setStatusMessage('File uploaded and displayed successfully')
          setDrawingEnabled(true)
          setImg(newImg)
        } else {
          setStatusMessage('Failed to initialize canvas')
        }
      }

      newImg.onerror = () => {
        setStatusMessage('Failed to load the image')
        setDrawingEnabled(false)
      }

      newImg.src = fullPath

    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Upload failed. Please try again.')
      setDrawingEnabled(false)
    }
  }

  const plotProfile = async (path: Point[]) => {
    if (path.length < 2 || !currentFile || !plotly) return

    const start = path[0]
    const end = path[path.length - 1]

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: [Math.round(start.x), Math.round(start.y)],
          end: [Math.round(end.x), Math.round(end.y)],
          imagePath: currentFile
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch profile data')
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error) 
      }

      const plotDiv = document.getElementById('plot')
      if (plotDiv) {
        plotly.newPlot(plotDiv, [{
          x: data.distances,
          y: data.elevations,
          type: 'scatter',
          mode: 'lines',
          name: 'Elevation Profile'
        }], {
          title: 'Elevation Profile',
          xaxis: { title: 'Distance' },
          yaxis: { title: 'Elevation' }
        })
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to get profile data')
    }
  }

  const drawLine = (path: Point[]) => {
    if (!ctx || path.length < 2) return
    
    ctx.beginPath()
    ctx.moveTo(path[0].x, path[0].y)
    
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y)
    }
    
    ctx.strokeStyle = 'blue'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingEnabled) return
    setIsDrawing(true)
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setLineData([{ x, y }])
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingEnabled || !ctx || !img) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
    ctx.drawImage(img, 0, 0)
    
    const newLineData = [...lineData, { x, y }]
    setLineData(newLineData)
    drawLine(newLineData)
  }

  const endDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (lineData.length >= 2) {
      plotProfile(lineData)
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <input 
          type="file" 
          accept=".tiff,.tif"
          onChange={uploadFile}
          className="mb-2"
        />
        <button
          onClick={() => setDrawingEnabled(!drawingEnabled)}
          className={`px-4 py-2 rounded ${
            drawingEnabled ? 'bg-red-500' : 'bg-blue-500'
          } text-white ml-2`}
        >
          {drawingEnabled ? 'Disable Drawing' : 'Enable Drawing'}
        </button>
      </div>
      <canvas 
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        className="border border-gray-300"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      <div id="plot" className="mt-4">
        {!plotly && <p>Loading plot...</p>}
      </div>
      {statusMessage && (
        <p className="mt-2 text-sm text-gray-600">{statusMessage}</p>
      )}
    </div>
  )
}
