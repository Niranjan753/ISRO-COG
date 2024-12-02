'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import 'mapbox-gl/dist/mapbox-gl.css'
import * as GeoTIFF from 'geotiff'
import Navbar from '../components/Navbar'
import FileList from '../components/FileList'
import { useSearchParams } from 'next/navigation'

export default function Globe() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const draw = useRef<MapboxDraw | null>(null)
  const [selectedArea, setSelectedArea] = useState<any>(null)
  const [isGlobeView, setIsGlobeView] = useState(false)
  const [isMercator, setIsMercator] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const files = searchParams.get('files')
    if (files) {
      setSelectedFiles(files.split(','))
    }
  }, [searchParams])

  const handleTiffUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !map.current) return

    setError(null)

    try {
      // Remove existing TIFF layer and source if they exist
      if (map.current.getLayer('tiff-layer')) {
        map.current.removeLayer('tiff-layer')
      }
      if (map.current.getSource('tiff-overlay')) {
        map.current.removeSource('tiff-overlay')
      }

      // Read the file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      
      // Parse the TIFF file
      const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer)
      const image = await tiff.getImage()
      
      // Get the geographic bounds of the image
      const bbox = image.getBoundingBox()

      // Create a canvas and draw the TIFF data
      const canvas = document.createElement('canvas')
      const width = image.getWidth()
      const height = image.getHeight()
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')

      const rasterData = await image.readRasters()
      const imageData = ctx.createImageData(width, height)
      
      // Assuming single band grayscale data
      for (let i = 0; i < rasterData[0].length; i++) {
        const value = rasterData[0][i]
        imageData.data[i * 4] = value     // R
        imageData.data[i * 4 + 1] = value // G
        imageData.data[i * 4 + 2] = value // B
        imageData.data[i * 4 + 3] = 255   // A
      }
      
      ctx.putImageData(imageData, 0, 0)
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
        }, 'image/png')
      })
      
      // Add the converted image as a raster source
      map.current.addSource('tiff-overlay', {
        type: 'image',
        url: URL.createObjectURL(blob),
        coordinates: [
          [bbox[0], bbox[3]], // top-left
          [bbox[2], bbox[3]], // top-right
          [bbox[2], bbox[1]], // bottom-right
          [bbox[0], bbox[1]]  // bottom-left
        ]
      })

      // Add a raster layer to display the TIFF
      map.current.addLayer({
        id: 'tiff-layer',
        type: 'raster',
        source: 'tiff-overlay',
        paint: {
          'raster-opacity': 0.7,
          'raster-resampling': 'nearest'
        }
      })

      // Fly to the TIFF location
      map.current.fitBounds([
        [bbox[0], bbox[1]], // southwestern corner
        [bbox[2], bbox[3]]  // northeastern corner
      ], {
        padding: 50
      })

    } catch (error) {
      let errorMessage = 'Failed to process TIFF file'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      setError(errorMessage)
      console.error('Error handling TIFF:', error)
    }
  }

  const toggleView = () => {
    if (!map.current) return
    setIsGlobeView(!isGlobeView)
    map.current.setStyle(isGlobeView ? 
      'mapbox://styles/mapbox/satellite-v9' : 
      'mapbox://styles/mapbox/satellite-streets-v12'
    )
  }

  const toggleProjection = () => {
    if (!map.current) return
    setIsMercator(!isMercator)
    map.current.setProjection(isMercator ? 'globe' : 'mercator')
  }

  useEffect(() => {
    if (!mapContainer.current) return
    
    mapboxgl.accessToken = 'pk.eyJ1IjoibmluamE3NTMiLCJhIjoiY200NmkybHJ0MGcwbTJsczYzbGUxOXFmNyJ9.KjIDZ-igeB6lVz0c4FqVug'

    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: [0, 20],
      zoom: 2,
      projection: 'globe',
      renderWorldCopies: true
    })

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
        point: true,
        line_string: true
      }
    })

    map.current.addControl(draw.current)
    map.current.addControl(new mapboxgl.NavigationControl())
    map.current.addControl(new mapboxgl.FullscreenControl())
    map.current.addControl(new mapboxgl.ScaleControl())

    map.current.on('draw.create', (e: { features: any[] }) => {
      setSelectedArea(e.features[0])
    })

    return () => map.current?.remove()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-white">
      <Navbar />
      <div className="flex flex-1">
        <div className="w-1/3 p-4">
          <FileList selectedFiles={selectedFiles} />
          <div className="mt-4 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Upload TIFF</h2>
            <input
              type="file"
              accept=".tif,.tiff"
              onChange={handleTiffUpload}
              className="w-full p-2 border border-gray-200 rounded"
            />
            {error && (
              <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
          </div>
        </div>
        <div className="w-2/3 relative">
          <div className="absolute top-5 left-5 z-10 bg-white/90 p-4 rounded-lg shadow-xl w-[300px] drop-shadow-lg">
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={toggleView}
                className="flex-1 py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-semibold shadow-sm"
              >
                {isGlobeView ? 'Map View' : 'Globe View'}
              </button>
              <button
                type="button"
                onClick={toggleProjection}
                className="flex-1 py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-semibold shadow-sm"
              >
                {isMercator ? 'Globe View' : 'Mercator View'}
              </button>
            </div>
          </div>
          <div 
            ref={mapContainer} 
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  )
}