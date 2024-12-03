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
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

type TiffData = {
  min: number
  max: number
  values: number[]
  width: number
  height: number
  bbox: number[]
  center: [number, number]
}

export default function Globe() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const draw = useRef<MapboxDraw | null>(null)
  const geocoder = useRef<MapboxGeocoder | null>(null)
  const [selectedArea, setSelectedArea] = useState<any>(null)
  const [isGlobeView, setIsGlobeView] = useState(false)
  const [isMercator, setIsMercator] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [tiffData, setTiffData] = useState<TiffData>()
  const [currentCoords, setCurrentCoords] = useState<[number, number]>([0, 0])
  const searchParams = useSearchParams()

  useEffect(() => {
    const files = searchParams.get('files')
    if (files) {
      setSelectedFiles(files.split(','))
    }
  }, [searchParams])

  const handleTiffUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !map.current) {
      setError('No file selected or map not initialized')
      return
    }

    setError(null)

    try {
      // Clean up existing layers with a safe method
      const cleanup = () => {
        try {
          if (map.current?.getLayer('tiff-layer')) {
            map.current.removeLayer('tiff-layer')
          }
          if (map.current?.getSource('tiff-overlay')) {
            map.current.removeSource('tiff-overlay')
          }
        } catch (cleanupErr) {
          console.warn('Error during cleanup:', cleanupErr)
        }
      }
      cleanup()

      // Read file in chunks to prevent memory issues
      const chunkSize = 10 * 1024 * 1024 // 10MB chunks
      const fileReader = new FileReader()
      const chunks: ArrayBuffer[] = []
      
      let offset = 0
      
      const readNextChunk = () => {
        const slice = file.slice(offset, offset + chunkSize)
        fileReader.readAsArrayBuffer(slice)
      }

      await new Promise<void>((resolve, reject) => {
        fileReader.onload = async (e) => {
          if (e.target?.result instanceof ArrayBuffer) {
            chunks.push(e.target.result)
            offset += chunkSize
            
            if (offset < file.size) {
              readNextChunk()
            } else {
              try {
                // Combine chunks
                const fullBuffer = new Uint8Array(file.size)
                let position = 0
                chunks.forEach(chunk => {
                  fullBuffer.set(new Uint8Array(chunk), position)
                  position += chunk.byteLength
                })

                const tiff = await GeoTIFF.fromArrayBuffer(fullBuffer.buffer)
                const image = await tiff.getImage()
                const bbox = image.getBoundingBox()
                
                if (!bbox) {
                  throw new Error('Invalid bounding box in TIFF file')
                }

                const width = image.getWidth()
                const height = image.getHeight()
                
                // Read data in smaller chunks
                const tileWidth = 256
                const tileHeight = 256
                
                const numTilesX = Math.ceil(width / tileWidth)
                const numTilesY = Math.ceil(height / tileHeight)
                
                let min = Infinity
                let max = -Infinity
                const values: number[] = []

                // Process tiles
                for (let ty = 0; ty < numTilesY; ty++) {
                  for (let tx = 0; tx < numTilesX; tx++) {
                    const x = tx * tileWidth
                    const y = ty * tileHeight
                    const w = Math.min(tileWidth, width - x)
                    const h = Math.min(tileHeight, height - y)

                    const tileData = await image.readRasters({
                      window: [x, y, x + w, y + h],
                      width: w,
                      height: h
                    })

                    const data = tileData[0] as Float32Array | Uint16Array | Uint8Array
                    
                    // Sample data from tile
                    const stride = Math.max(1, Math.floor(data.length / 100))
                    for (let i = 0; i < data.length; i += stride) {
                      const value = data[i]
                      values.push(value)
                      min = Math.min(min, value)
                      max = Math.max(max, value)
                    }
                  }
                }

                // Calculate center coordinates
                const centerLng = (bbox[0] + bbox[2]) / 2
                const centerLat = (bbox[1] + bbox[3]) / 2

                setTiffData({ 
                  min, 
                  max, 
                  values,
                  width,
                  height,
                  bbox,
                  center: [centerLng, centerLat]
                })

                // Create visualization
                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                
                if (!ctx) {
                  throw new Error('Could not create canvas context')
                }

                const imageData = ctx.createImageData(width, height)
                
                // Enhanced color mapping with transparency for globe visualization
                const rasterData = await image.readRasters()
                const data = rasterData[0] as Float32Array | Uint16Array | Uint8Array

                for (let i = 0; i < data.length; i++) {
                  const value = data[i]
                  const normalizedValue = (value - min) / (max - min)
                  const hue = (1 - normalizedValue) * 240 // Blue to Red
                  const [r, g, b] = hslToRgb(hue / 360, 1, 0.5)
                  
                  // Add alpha based on value intensity
                  const alpha = Math.round(normalizedValue * 255)
                  
                  imageData.data[i * 4] = r
                  imageData.data[i * 4 + 1] = g
                  imageData.data[i * 4 + 2] = b
                  imageData.data[i * 4 + 3] = alpha
                }

                ctx.putImageData(imageData, 0, 0)
                const dataUrl = canvas.toDataURL('image/png')

                // Ensure map is loaded
                if (!map.current?.loaded()) {
                  await new Promise<void>((loadResolve) => {
                    map.current?.on('load', () => loadResolve())
                  })
                }

                // Add to map with enhanced 3D visualization
                if (map.current) {
                  map.current.addSource('tiff-overlay', {
                    type: 'image',
                    url: dataUrl,
                    coordinates: [
                      [bbox[0], bbox[3]],
                      [bbox[2], bbox[3]],
                      [bbox[2], bbox[1]],
                      [bbox[0], bbox[1]]
                    ]
                  })

                  map.current.addLayer({
                    id: 'tiff-layer',
                    type: 'raster',
                    source: 'tiff-overlay',
                    paint: {
                      'raster-opacity': 0.8,
                      'raster-resampling': 'linear',
                      'raster-fade-duration': 0
                    }
                  })

                  // Set appropriate view
                  map.current.setProjection('globe')
                  map.current.fitBounds([
                    [bbox[0], bbox[1]],
                    [bbox[2], bbox[3]]
                  ] as mapboxgl.LngLatBoundsLike, {
                    padding: 50,
                    maxZoom: 16
                  })

                  // Track mouse movement for coordinates
                  map.current.on('mousemove', (e) => {
                    setCurrentCoords([e.lngLat.lng, e.lngLat.lat])
                  })
                }

                resolve()
              } catch (err) {
                reject(err)
              }
            }
          }
        }

        fileReader.onerror = () => reject(fileReader.error)
        readNextChunk()
      })

    } catch (err) {
      const errorMessage = err instanceof Error 
        ? `TIFF Processing Error: ${err.message}`
        : 'Failed to process TIFF file'
      
      console.error('TIFF error:', errorMessage)
      setError(errorMessage)
    }
  }

  // Helper function to convert HSL to RGB
  function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      }

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
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
    
    try {
      mapboxgl.accessToken = 'pk.eyJ1IjoibmluamE3NTMiLCJhIjoiY200ODF5M2xlMGR6bzJqc2QyaWZsNWJzcCJ9.x3C_qjPWpW1GUyL5R16Q1A'

      if (map.current) return

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-v9',
        center: [0, 20],
        zoom: 2,
        projection: 'globe',
        renderWorldCopies: true
      })

      // Initialize geocoder
      geocoder.current = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        marker: false,
        placeholder: 'Search for a location...',
        proximity: {
          longitude: 0,
          latitude: 20
        }
      })

      // Add geocoder to map
      map.current.addControl(geocoder.current)

      // Initialize draw controls
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

      // Error handling for map load
      map.current.on('error', (e) => {
        console.error('Map error:', e)
        setError('Map loading error')
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize map'
      setError(errorMessage)
      console.error('Map initialization error:', err instanceof Error ? err.message : err)
    }

    return () => {
      map.current?.remove()
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 p-4 overflow-y-auto">
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
            {tiffData && (
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="font-semibold text-black">Data Statistics:</h3>
                  <p className="text-black">Min Value: {tiffData.min.toFixed(2)}</p>
                  <p className="text-black">Max Value: {tiffData.max.toFixed(2)}</p>
                  <div className="mt-2 h-4 bg-gradient-to-r from-blue-500 via-green-500 to-red-500 rounded" />
                  <div className="flex justify-between text-sm text-black">
                    <span>{tiffData.min.toFixed(2)}</span>
                    <span>{((tiffData.max + tiffData.min) / 2).toFixed(2)}</span>
                    <span>{tiffData.max.toFixed(2)}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-black">Image Details:</h3>
                  <p className="text-black">Dimensions: {tiffData.width} x {tiffData.height} pixels</p>
                  <p className="text-black">Center: {tiffData.center[0].toFixed(4)}°, {tiffData.center[1].toFixed(4)}°</p>
                  <p className="text-black">Current Mouse Position: {currentCoords[0].toFixed(4)}°, {currentCoords[1].toFixed(4)}°</p>
                </div>

                <div>
                  <h3 className="font-semibold text-black">Bounding Box:</h3>
                  <p className="text-black">West: {tiffData.bbox[0].toFixed(4)}°</p>
                  <p className="text-black">South: {tiffData.bbox[1].toFixed(4)}°</p>
                  <p className="text-black">East: {tiffData.bbox[2].toFixed(4)}°</p>
                  <p className="text-black">North: {tiffData.bbox[3].toFixed(4)}°</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="w-2/3 relative overflow-hidden">
          <div className="absolute top-5 left-5 z-10 bg-white/90 p-3 rounded-lg shadow-xl drop-shadow-lg">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleView}
                className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-semibold shadow-sm"
              >
                {isGlobeView ? 'Map View' : 'Globe View'}
              </button>
              <button
                type="button"
                onClick={toggleProjection}
                className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-semibold shadow-sm"
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