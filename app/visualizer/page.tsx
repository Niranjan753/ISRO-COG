'use client'

import { useState, useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import Navbar from '../components/Navbar'
import FileList from '../components/FileList'
import MapControls from '../components/MapControls'
import TiffManipulator from '../components/TiffManipulator'
import { useTiffProcessing } from './hooks/useTiffProcessing'
import { useSearchParams } from 'next/navigation'
import { MapState, TiffFilters, ColorScheme } from './types'

export default function Globe() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const draw = useRef<MapboxDraw | null>(null)
  const geocoder = useRef<MapboxGeocoder | null>(null)
  const [mapState, setMapState] = useState<MapState>({
    isGlobeView: false,
    isMercator: false
  })
  const [currentCoords, setCurrentCoords] = useState<[number, number]>([0, 0])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [filters, setFilters] = useState<TiffFilters>({
    colorScheme: 'rainbow',
    contrast: 1
  })
  const searchParams = useSearchParams()

  const {
    tiffData,
    error,
    fileName,
    processTiff,
    applyFilters,
    downloadSelectedArea
  } = useTiffProcessing(mapContainer, map, draw)

  const handleMapLoad = (loadedMap: mapboxgl.Map) => {
    if (!loadedMap) return
    
    loadedMap.on('mousemove', (e) => {
      setCurrentCoords([e.lngLat.lng, e.lngLat.lat])
    })

    loadedMap.setFog({
      color: 'rgb(186, 210, 235)',
      'high-color': 'rgb(36, 92, 223)',
      'horizon-blend': 0.02,
      'space-color': 'rgb(11, 11, 25)',
      'star-intensity': 0.6
    })
  }

  const handleDrawCreate = (e: { features: any[] }) => {
    if (!e.features?.length) return
    const coordinates = e.features[0].geometry.coordinates
    console.log('Drawn coordinates:', coordinates)
  }

  const handleTiffUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !map.current) return
    
    await processTiff(file, map.current)
    setSelectedFiles(prev => [...prev, file.name])
  }

  const handleFilterChange = (key: keyof TiffFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    if (!map.current) return
    applyFilters(newFilters, map.current)
  }

  const toggleView = () => {
    setMapState(prev => ({
      ...prev,
      isGlobeView: !prev.isGlobeView
    }))
  }

  const toggleProjection = () => {
    setMapState(prev => ({
      ...prev,
      isMercator: !prev.isMercator
    }))
  }

  const removeFile = (fileName: string) => {
    setSelectedFiles(prev => prev.filter(f => f !== fileName))
  }

  useEffect(() => {
    if (!mapContainer.current) return

    mapboxgl.accessToken = 'pk.eyJ1IjoibmluamE3NTMiLCJhIjoiY200YThhdTNoMDRzZTJscXZiZGtoOWYwNyJ9.sC-E678ms3Ehx6hWID7A0g'

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: [0, 20],
      zoom: 2,
      projection: mapState.isMercator ? 'mercator' : 'globe',
      renderWorldCopies: true
    })

    map.current.on('load', () => handleMapLoad(map.current!))
    map.current.on('draw.create', handleDrawCreate)

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      }
    })

    geocoder.current = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      marker: false
    })

    map.current.addControl(draw.current)
    map.current.addControl(geocoder.current)
    map.current.addControl(new mapboxgl.NavigationControl())
    map.current.addControl(new mapboxgl.FullscreenControl())

    return () => {
      map.current?.remove()
    }
  }, [])

  useEffect(() => {
    if (!map.current) return
    
    if (mapState.isGlobeView) {
      map.current.setStyle('mapbox://styles/mapbox/satellite-v9')
    } else {
      map.current.setStyle('mapbox://styles/mapbox/satellite-streets-v12')
    }

    // Re-add the fog after style change
    map.current.once('style.load', () => {
      map.current?.setFog({
        color: 'rgb(186, 210, 235)',
        'high-color': 'rgb(36, 92, 223)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(11, 11, 25)',
        'star-intensity': 0.6
      })
    })
  }, [mapState.isGlobeView])

  useEffect(() => {
    if (!map.current) return
    map.current.setProjection(mapState.isMercator ? 'mercator' : 'globe')
  }, [mapState.isMercator])

  useEffect(() => {
    const filesParam = searchParams.get('files')
    if (filesParam) {
      const fileNames = filesParam.split(',')
      setSelectedFiles(fileNames)
    }
  }, [searchParams])

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 p-4 overflow-y-auto">
          <FileList selectedFiles={selectedFiles} onRemoveFile={removeFile} />
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-white rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Upload TIFF</h2>
              <input
                type="file"
                accept=".tif,.tiff"
                onChange={handleTiffUpload}
                className="w-full p-2 border border-gray-200 rounded"
              />
              {fileName && (
                <p className="mt-2 text-sm text-gray-600">
                  Current file: {fileName}
                </p>
              )}
              {error && (
                <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}
            </div>

            {tiffData && (
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-lg shadow">
                  <h3 className="font-semibold text-lg mb-4 text-gray-900">Visualization Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Color Scheme</label>
                      <select
                        value={filters.colorScheme}
                        onChange={(e) => handleFilterChange('colorScheme', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="rainbow">Rainbow</option>
                        <option value="thermal">Thermal</option>
                        <option value="grayscale">Grayscale</option>
                        <option value="terrain">Terrain</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Contrast ({filters.contrast.toFixed(1)})
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={filters.contrast}
                        onChange={(e) => handleFilterChange('contrast', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg shadow">
                  <h3 className="font-semibold text-lg mb-4 text-gray-900">Data Statistics</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">Min Value: <span className="font-mono">{tiffData.min.toFixed(2)}</span></p>
                    <p className="text-gray-700">Max Value: <span className="font-mono">{tiffData.max.toFixed(2)}</span></p>
                    <p className="text-gray-700">Mean: <span className="font-mono">
                      {(tiffData.values.reduce((a, b) => a + b, 0) / tiffData.values.length).toFixed(2)}
                    </span></p>
                    <div className="mt-2 h-4 bg-gradient-to-r from-blue-500 via-green-500 to-red-500 rounded" />
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg shadow">
                  <h3 className="font-semibold text-lg mb-4 text-gray-900">Image Details</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">Dimensions: {tiffData.width} × {tiffData.height} pixels</p>
                    <p className="text-gray-700">Center: {tiffData.center[0].toFixed(4)}°, {tiffData.center[1].toFixed(4)}°</p>
                    <p className="text-gray-700">Current Position: {currentCoords[0].toFixed(4)}°, {currentCoords[1].toFixed(4)}°</p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg shadow">
                  <h3 className="font-semibold text-lg mb-4 text-gray-900">Bounding Box</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">West: {tiffData.bbox[0].toFixed(4)}°</p>
                    <p className="text-gray-700">South: {tiffData.bbox[1].toFixed(4)}°</p>
                    <p className="text-gray-700">East: {tiffData.bbox[2].toFixed(4)}°</p>
                    <p className="text-gray-700">North: {tiffData.bbox[3].toFixed(4)}°</p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg shadow">
                  <h3 className="font-semibold text-lg mb-4 text-gray-900">Download Selected Area</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Draw a polygon on the map to select an area first</p>
                    <div className="space-x-4">
                      <button
                        onClick={() => downloadSelectedArea('png', filters)}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Download PNG
                      </button>
                      <button
                        onClick={() => downloadSelectedArea('tiff', filters)}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Download TIFF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-2/3 relative overflow-hidden">
          <MapControls
            isGlobeView={mapState.isGlobeView}
            isMercator={mapState.isMercator}
            onToggleView={toggleView}
            onToggleProjection={toggleProjection}
          />
          <div ref={mapContainer} className="w-full h-full" />
        </div>
      </div>
    </div>
  )
}