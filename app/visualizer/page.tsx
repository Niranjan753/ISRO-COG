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
  originalData?: Float32Array | Uint16Array | Uint8Array
}

type ColorScheme = 'rainbow' | 'thermal' | 'grayscale' | 'terrain'

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

const COLOR_SCHEMES = {
  rainbow: (value: number) => {
    const hue = (1 - value) * 240
    return hslToRgb(hue / 360, 1, 0.5)
  },
  thermal: (value: number) => {
    if (value < 0.33) return [0, 0, Math.round(255 * (value * 3))]
    if (value < 0.66) return [0, Math.round(255 * ((value - 0.33) * 3)), 255]
    return [Math.round(255 * ((value - 0.66) * 3)), 255, 255]
  },
  grayscale: (value: number) => {
    const v = Math.round(value * 255)
    return [v, v, v]
  },
  terrain: (value: number) => {
    if (value < 0.2) return [0, 0, 255] // Deep water
    if (value < 0.4) return [0, 255, 255] // Shallow water
    if (value < 0.6) return [0, 255, 0] // Lowland
    if (value < 0.8) return [255, 255, 0] // Highland
    return [255, 0, 0] // Mountain
  }
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
  const [colorScheme, setColorScheme] = useState<ColorScheme>('rainbow')
  const [contrast, setContrast] = useState(1)
  const [selectedBounds, setSelectedBounds] = useState<number[] | null>(null)
  const searchParams = useSearchParams()

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

  const downloadSelectedArea = async () => {
    if (!selectedBounds || !tiffData || !tiffData.originalData) {
      setError('Please select an area first and ensure TIFF data is loaded')
      return
    }

    try {
      // Calculate pixel bounds from geographic bounds
      const [minX, minY, maxX, maxY] = selectedBounds
      const [dataMinX, dataMinY, dataMaxX, dataMaxY] = tiffData.bbox
      
      // Convert geographic coordinates to pixel coordinates
      const xScale = tiffData.width / (dataMaxX - dataMinX)
      const yScale = tiffData.height / (dataMaxY - dataMinY)
      
      const pixelMinX = Math.max(0, Math.floor((minX - dataMinX) * xScale))
      const pixelMaxX = Math.min(tiffData.width, Math.ceil((maxX - dataMinX) * xScale))
      const pixelMinY = Math.max(0, Math.floor((dataMaxY - maxY) * yScale))
      const pixelMaxY = Math.min(tiffData.height, Math.ceil((dataMaxY - minY) * yScale))
      
      const width = pixelMaxX - pixelMinX
      const height = pixelMaxY - pixelMinY

      // Extract data for selected region
      const selectedData = new Float32Array(width * height)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = (pixelMinY + y) * tiffData.width + (pixelMinX + x)
          const dstIdx = y * width + x
          selectedData[dstIdx] = tiffData.originalData[srcIdx]
        }
      }

      // Create TIFF file
      const buffer = new ArrayBuffer(8 + (width * height * 4))
      const view = new DataView(buffer)
      
      view.setUint16(0, 0x4949)
      view.setUint16(2, 42)
      view.setUint32(4, 8)

      const floatArray = new Float32Array(buffer, 8)
      floatArray.set(selectedData)

      // Create and download TIFF blob
      const tiffBlob = new Blob([buffer], { type: 'image/tiff' })
      const tiffUrl = URL.createObjectURL(tiffBlob)
      const tiffLink = document.createElement('a')
      tiffLink.href = tiffUrl
      tiffLink.download = `selected_area_${Date.now()}.tif`
      document.body.appendChild(tiffLink)
      tiffLink.click()
      document.body.removeChild(tiffLink)
      URL.revokeObjectURL(tiffUrl)

      // Create PNG visualization
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not create canvas context')

      const imageData = ctx.createImageData(width, height)
      
      for (let i = 0; i < selectedData.length; i++) {
        const value = selectedData[i]
        const normalizedValue = Math.min(1, Math.max(0,
          ((value - tiffData.min) / (tiffData.max - tiffData.min)) * contrast
        ))

        const [r, g, b] = COLOR_SCHEMES[colorScheme](normalizedValue)
        
        imageData.data[i * 4] = r
        imageData.data[i * 4 + 1] = g
        imageData.data[i * 4 + 2] = b
        imageData.data[i * 4 + 3] = 255
      }

      ctx.putImageData(imageData, 0, 0)
      
      // Create and download PNG blob
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          const pngUrl = URL.createObjectURL(pngBlob)
          const pngLink = document.createElement('a')
          pngLink.href = pngUrl
          pngLink.download = `selected_area_${Date.now()}.png`
          document.body.appendChild(pngLink)
          pngLink.click()
          document.body.removeChild(pngLink)
          URL.revokeObjectURL(pngUrl)
        }
      }, 'image/png')

    } catch (err) {
      console.error('Error downloading selected area:', err)
      setError('Failed to download selected area. Please try again.')
    }
  }

  const handleTiffUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !map.current) {
      setError('No file selected or map not initialized')
      return
    }

    setError(null)

    try {
      // Clean up existing layers
      if (map.current.getLayer('tiff-layer')) {
        map.current.removeLayer('tiff-layer')
      }
      if (map.current.getSource('tiff-overlay')) {
        map.current.removeSource('tiff-overlay')
      }

      const arrayBuffer = await file.arrayBuffer()
      const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer)
      const image = await tiff.getImage()
      const bbox = image.getBoundingBox()

      if (!bbox) {
        throw new Error('Invalid bounding box in TIFF file')
      }

      const width = image.getWidth()
      const height = image.getHeight()
      const rasterData = await image.readRasters()
      const data = rasterData[0] as Float32Array | Uint16Array | Uint8Array

      let min = Infinity
      let max = -Infinity
      const values: number[] = []

      // Find min/max values
      for (let i = 0; i < data.length; i++) {
        const value = data[i]
        values.push(value)
        min = Math.min(min, value)
        max = Math.max(max, value)
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
        center: [centerLng, centerLat],
        originalData: data
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

      for (let i = 0; i < data.length; i++) {
        const value = data[i]
        const normalizedValue = Math.min(1, Math.max(0,
          ((value - min) / (max - min)) * contrast
        ))

        const [r, g, b] = COLOR_SCHEMES[colorScheme](normalizedValue)
        const alpha = 255

        imageData.data[i * 4] = r
        imageData.data[i * 4 + 1] = g
        imageData.data[i * 4 + 2] = b
        imageData.data[i * 4 + 3] = alpha
      }

      ctx.putImageData(imageData, 0, 0)
      const dataUrl = canvas.toDataURL('image/png')

      // Add to map
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
          'raster-opacity': 1,
          'raster-resampling': 'nearest',
          'raster-fade-duration': 0
        }
      })

      map.current.fitBounds([
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]]
      ] as mapboxgl.LngLatBoundsLike, {
        padding: 50
      })

      map.current.on('mousemove', (e) => {
        setCurrentCoords([e.lngLat.lng, e.lngLat.lat])
      })

    } catch (err) {
      const errorMessage = err instanceof Error 
        ? `TIFF Processing Error: ${err.message}`
        : 'Failed to process TIFF file'
      
      console.error('TIFF error:', err)
      setError(errorMessage)
    }
  }

  useEffect(() => {
    const files = searchParams.get('files')
    if (files) {
      setSelectedFiles(files.split(','))
    }
  }, [searchParams])

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
        const feature = e.features[0]
        setSelectedArea(feature)
        
        // Calculate bounds of the drawn feature
        const coordinates = feature.geometry.coordinates[0]
        const bounds = coordinates.reduce((bounds: number[], coord: number[]) => {
          return [
            Math.min(bounds[0], coord[0]), // minX
            Math.min(bounds[1], coord[1]), // minY
            Math.max(bounds[2], coord[0]), // maxX
            Math.max(bounds[3], coord[1])  // maxY
          ]
        }, [Infinity, Infinity, -Infinity, -Infinity])
        
        setSelectedBounds(bounds)
      })

      map.current.on('draw.delete', () => {
        setSelectedArea(null)
        setSelectedBounds(null)
      })

      // Error handling for map load
      map.current.on('error', (e) => {
        console.error('Map error:', e)
        setError('Map loading error')
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize map'
      setError(errorMessage)
      console.error('Map initialization error:', err)
    }

    return () => {
      map.current?.remove()
    }
  }, [])

  // Update visualization when contrast or color scheme changes
  useEffect(() => {
    if (!map.current || !tiffData) return

    const updateVisualization = async () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = tiffData.width
        canvas.height = tiffData.height
        const ctx = canvas.getContext('2d')
        
        if (!ctx) return

        const imageData = ctx.createImageData(tiffData.width, tiffData.height)
        
        // Apply color scheme and contrast
        for (let i = 0; i < tiffData.values.length; i++) {
          const value = tiffData.values[i]
          const normalizedValue = Math.min(1, Math.max(0, 
            ((value - tiffData.min) / (tiffData.max - tiffData.min)) * contrast
          ))
          
          const [r, g, b] = COLOR_SCHEMES[colorScheme](normalizedValue)
          const alpha = 255
          
          imageData.data[i * 4] = r
          imageData.data[i * 4 + 1] = g
          imageData.data[i * 4 + 2] = b
          imageData.data[i * 4 + 3] = alpha
        }

        ctx.putImageData(imageData, 0, 0)
        const dataUrl = canvas.toDataURL('image/png')

        // Update existing source instead of removing/re-adding
        if (map.current) {
          const source = map.current.getSource('tiff-overlay') as mapboxgl.ImageSource
          if (source) {
            source.updateImage({
              url: dataUrl,
              coordinates: [
                [tiffData.bbox[0], tiffData.bbox[3]],
                [tiffData.bbox[2], tiffData.bbox[3]], 
                [tiffData.bbox[2], tiffData.bbox[1]],
                [tiffData.bbox[0], tiffData.bbox[1]]
              ]
            })
          }
        }
      } catch (err) {
        console.error('Error updating visualization:', err)
      }
    }

    updateVisualization()
  }, [colorScheme, contrast, tiffData])

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
                  <h3 className="font-semibold text-black">Visualization Settings:</h3>
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700">Color Scheme</label>
                    <select
                      value={colorScheme}
                      onChange={(e) => setColorScheme(e.target.value as ColorScheme)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="rainbow">Rainbow</option>
                      <option value="thermal">Thermal</option>
                      <option value="grayscale">Grayscale</option>
                      <option value="terrain">Terrain</option>
                    </select>
                  </div>
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700">Contrast</label>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={contrast}
                      onChange={(e) => setContrast(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                {selectedBounds && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-black">Selected Area:</h3>
                    <p className="text-black">West: {selectedBounds[0].toFixed(4)}°</p>
                    <p className="text-black">South: {selectedBounds[1].toFixed(4)}°</p>
                    <p className="text-black">East: {selectedBounds[2].toFixed(4)}°</p>
                    <p className="text-black">North: {selectedBounds[3].toFixed(4)}°</p>
                    <button
                      onClick={downloadSelectedArea}
                      className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      Download Selected Area (TIFF & PNG)
                    </button>
                  </div>
                )}

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