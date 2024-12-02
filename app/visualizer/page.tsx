'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import 'mapbox-gl/dist/mapbox-gl.css'
import Navbar from '../components/Navbar'

export default function Globe() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const draw = useRef<MapboxDraw | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArea, setSelectedArea] = useState<any>(null)
  const [isGlobeView, setIsGlobeView] = useState(false)
  const [isMercator, setIsMercator] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!map.current || !searchQuery) return

    try {
      // Use Mapbox Geocoding API to search for the location
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${mapboxgl.accessToken}&types=country,region,district,place`
      )
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const feature = data.features[0]

        // Remove existing layers and sources
        if (map.current.getLayer('region-fill')) {
          map.current.removeLayer('region-fill')
        }
        if (map.current.getLayer('region-border')) {
          map.current.removeLayer('region-border')
        }
        if (map.current.getSource('region')) {
          map.current.removeSource('region')
        }

        // Add the region boundary source and layers
        map.current.addSource('region', {
          type: 'geojson',
          data: feature
        })

        // Add fill layer
        map.current.addLayer({
          id: 'region-fill',
          type: 'fill',
          source: 'region',
          paint: {
            'fill-color': '#FF0000',
            'fill-opacity': 0.2
          }
        })

        // Add border layer
        map.current.addLayer({
          id: 'region-border',
          type: 'line',
          source: 'region',
          paint: {
            'line-color': '#FF0000',
            'line-width': 2
          }
        })

        // Fit map to the region bounds
        const bounds = new mapboxgl.LngLatBounds()
        feature.bbox ? 
          bounds.extend([feature.bbox[0], feature.bbox[1]]).extend([feature.bbox[2], feature.bbox[3]]) :
          feature.geometry.coordinates[0].forEach((coord: number[]) => bounds.extend(coord))
        
        map.current.fitBounds(bounds, { padding: 50 })
      }
    } catch (error) {
      console.error('Error searching location:', error)
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
      projection: 'globe'
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

    map.current.on('draw.create', (e) => {
      setSelectedArea(e.features[0])
    })

    return () => map.current?.remove()
  }, [])

  return (
    <>
    <Navbar />
    <div style={{ 
      width: '100%', 
      height: '100vh',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1,
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        color: 'black',
        width: '300px'
      }}>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location (e.g., India)"
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              marginBottom: '8px'
            }}
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#4a90e2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Search
            </button>
            <button
              type="button"
              onClick={toggleView}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#4a90e2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isGlobeView ? 'Map View' : 'Globe View'}
            </button>
            <button
              type="button"
              onClick={toggleProjection}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#4a90e2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isMercator ? 'Globe View' : 'Mercator View'}
            </button>
          </div>
        </form>
      </div>
      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 0
        }}
      />
    </div>
    </>
  )
}