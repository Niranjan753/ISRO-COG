'use client'

import { useState, useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import Navbar from '../components/Navbar'
import MapControls from '../components/MapControls'
import TiffManipulator from '../components/TiffManipulator'
import { useTiffProcessing } from './hooks/useTiffProcessing'
import { useSearchParams } from 'next/navigation'
import { MapState, TiffFilters, ColorScheme } from './types'
import BandSelector from '../components/BandSelector'
import BandControls from '../components/BandControls'
import BoundingBoxInput from '../components/BoundingBoxInput'
import BoundingBoxDownload from '../components/BoundingBoxDownload'

export default function Globe() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const geocoder = useRef<MapboxGeocoder | null>(null)
  const [mapState, setMapState] = useState<MapState>({
    isGlobeView: false,
    isMercator: false
  })
  const [currentCoords, setCurrentCoords] = useState<[number, number]>([0, 0])
  const [selectedFiles, setSelectedFiles] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filters, setFilters] = useState<TiffFilters>({
    colorScheme: 'rainbow',
    contrast: 1
  })
  const searchParams = useSearchParams()
  const [selectedBand, setSelectedBand] = useState<string>('');
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);
  const [isApplied, setIsApplied] = useState(false);
  const [drawnBbox, setDrawnBbox] = useState<[number, number, number, number] | null>(null);

  const {
    tiffData,
    error,
    fileName,
    processTiff,
    applyFilters,
    downloadSelectedArea,
    setTiffData,
    setFileName
  } = useTiffProcessing(mapContainer, map, drawRef)

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

  useEffect(() => {
    if (!map.current || drawRef.current) return;

    // Initialize draw control only after map is loaded
    map.current.once('load', () => {
      drawRef.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: false,
          line_string: false,
          point: false,
          trash: true,
          rectangle: true
        },
        modes: {
          ...MapboxDraw.modes,
          draw_rectangle: MapboxDraw.modes.draw_polygon
        }
      });

      map.current?.addControl(drawRef.current);

      // Add draw event listeners
      map.current?.on('draw.create', handleDrawCreate);
      map.current?.on('draw.delete', handleDrawDelete);
    });

    return () => {
      if (map.current && drawRef.current) {
        map.current.removeControl(drawRef.current);
        drawRef.current = null;
      }
    };
  }, [map.current]);

  const handleDrawCreate = (e: { features: any[] }) => {
    if (!e.features?.length) return;
    
    const coordinates = e.features[0].geometry.coordinates[0];
    const bounds = coordinates.reduce(
      (bounds: number[], coord: number[]) => {
        return [
          Math.min(bounds[0], coord[0]), // west
          Math.min(bounds[1], coord[1]), // south
          Math.max(bounds[2], coord[0]), // east
          Math.max(bounds[3], coord[1])  // north
        ];
      },
      [Infinity, Infinity, -Infinity, -Infinity]
    );
    
    setDrawnBbox(bounds as [number, number, number, number]);
  };

  const handleDrawDelete = () => {
    setDrawnBbox(null);
  };

  const handleBboxDownload = async (bbox: [number, number, number, number]) => {
    if (!selectedBand || !map.current) {
      setLoadError('No band selected');
      return;
    }

    // Find the file corresponding to the selected band
    const selectedFile = selectedFiles.find(file => 
      file.filename.includes(selectedBand) || file.band === selectedBand
    );

    if (!selectedFile) {
      setLoadError('No file found for selected band');
      return;
    }
    
    try {
      console.log('Downloading COG region for file:', selectedFile.filename, 'bbox:', bbox);
      
      const response = await fetch('/api/fetch-cog-bbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: selectedFile.filename,
          bbox: bbox,
          band: selectedBand
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch region');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `region_${selectedBand}_${bbox.join('_')}.cog.tiff`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading region:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to download region');
    }
  };

  const handleTiffUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !map.current) return
    
    await processTiff(file, map.current)
    setSelectedFiles(prev => [...prev, file.name])
  }

  const handleS3FileLoad = async (fileInfo: any) => {
    if (!map.current) return;
    setLoadError(null);
    
    try {
      const response = await fetch('/api/fetch-cog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: fileInfo.filename
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch COG file');
      }

      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Received empty file from server');
      }

      const file = new File([arrayBuffer], fileInfo.filename, { type: 'image/tiff' });
      
      // Process the new TIFF file
      if (map.current) {
        // Ensure map style is loaded
        if (!map.current.getStyle()) {
          await new Promise<void>((resolve) => {
            map.current!.once('style.load', () => resolve());
          });
        }
        
        await processTiff(file, map.current);
        
        // Update selected files after successful processing
        setSelectedFiles(prev => {
          const filtered = prev.filter(f => 
            (typeof f === 'string' ? f : f.filename) !== fileInfo.filename
          );
          return [...filtered, fileInfo];
        });
      }
    } catch (error) {
      console.error('Error loading COG file:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load COG file');
      throw error; // Propagate error to handleApplyBand
    }
  };

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
    setSelectedFiles(prev => prev.filter(f => {
      if (typeof f === 'string') return f !== fileName
      return f.filename !== fileName
    }))
  }

  const handleRemoveBand = async () => {
    if (!map.current) return;
    
    try {
      // Remove existing map instance
      if (map.current) {
        map.current.remove();
      }

      // Clear all states
      setSelectedFiles([]);
      setSelectedBand('');
      setIsApplied(false);
      setTiffData(undefined);
      setFileName(null);
      setLoadError(null);

      // Create a new map instance with current projection
      const newMap = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/satellite-v9',
        center: [0, 20],
        zoom: 2,
        projection: mapState.isMercator ? 'mercator' : 'globe',
        renderWorldCopies: true,
        preserveDrawingBuffer: true
      });

      // Wait for the new map to load
      await new Promise<void>((resolve) => {
        newMap.once('load', () => {
          handleMapLoad(newMap);
          resolve();
        });
      });

      // Add controls to new map
      newMap.addControl(new mapboxgl.NavigationControl());

      // Set fog for globe view
      newMap.setFog({
        color: 'rgb(186, 210, 235)',
        'high-color': 'rgb(36, 92, 223)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(11, 11, 25)',
        'star-intensity': 0.6
      });

      // Update the map reference
      map.current = newMap;

    } catch (error) {
      console.error('Error removing band:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to remove band');
    }
  };

  const handleApplyBand = async () => {
    if (!map.current || !selectedBand || availableFiles.length === 0) return;
    
    try {
      setLoadError(null);
      
      // Ensure map style is loaded first
      if (!map.current.getStyle()) {
        await new Promise<void>((resolve) => {
          map.current!.once('style.load', () => resolve());
        });
      }

      // Store current view state
      const currentZoom = map.current.getZoom();
      const currentCenter = map.current.getCenter();
      const currentPitch = map.current.getPitch();
      const currentBearing = map.current.getBearing();

      // Remove existing layers and sources first
      if (map.current.getLayer('tiff-layer')) {
        map.current.removeLayer('tiff-layer');
      }
      if (map.current.getSource('tiff-source')) {
        map.current.removeSource('tiff-source');
      }

      // Find the selected file
      const selectedFile = availableFiles.find((f: { band: string }) => f.band === selectedBand);
      if (selectedFile) {
        // Reset states before loading new data
        setSelectedFiles([]);
        setTiffData(undefined);
        setFileName(null);
        
        // Add a small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 200));
        
        try {
          // Load the new file
          await handleS3FileLoad(selectedFile);
          
          // Ensure map updates properly
          if (map.current) {
            // Restore the previous view state
            map.current.setZoom(currentZoom);
            map.current.setCenter(currentCenter);
            map.current.setPitch(currentPitch);
            map.current.setBearing(currentBearing);

            // Force style reload if needed
            if (!map.current.getStyle()) {
              map.current.setStyle('mapbox://styles/mapbox/satellite-v9');
              await new Promise<void>((resolve) => {
                map.current!.once('style.load', () => resolve());
              });
            }

            // Force map update
            map.current.resize();
            map.current.triggerRepaint();
            setIsApplied(true);
          }
        } catch (error) {
          console.error('Error loading file:', error);
          setLoadError('Failed to load selected band');
          setIsApplied(false);
        }
      }
    } catch (error) {
      console.error('Error applying band:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to apply band');
      setIsApplied(false);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = 'pk.eyJ1IjoibmluamE3NTMiLCJhIjoiY200YThhdTNoMDRzZTJscXZiZGtoOWYwNyJ9.sC-E678ms3Ehx6hWID7A0g';

    const newMap = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: [0, 20],
      zoom: 2,
      projection: 'mercator',
      renderWorldCopies: true,
      preserveDrawingBuffer: true
    });

    newMap.on('load', () => {
      handleMapLoad(newMap);
    });

    newMap.addControl(new mapboxgl.NavigationControl());

    // Add draw control
    const drawControl = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      }
    });
    newMap.addControl(drawControl);
    drawRef.current = drawControl;

    // Add draw event listeners
    newMap.on('draw.create', handleDrawCreate);
    newMap.on('draw.delete', () => setDrawnBbox(null));

    map.current = newMap;

    return () => {
      if (map.current && map.current.loaded()) {
        map.current.remove();
      }
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return
    
    map.current.setProjection(mapState.isMercator ? 'mercator' : 'globe')
  }, [mapState.isMercator])

  useEffect(() => {
    const filesParam = searchParams.get('files');
    if (filesParam) {
      try {
        const files = JSON.parse(decodeURIComponent(filesParam));
        setAvailableFiles(files);
        // Get unique bands
        const uniqueBands = [...new Set(files.map((f: { band: string }) => f.band))];
        if (uniqueBands.length > 0) {
          setSelectedBand(uniqueBands[0] as string);
        }
      } catch (error) {
        console.error('Error parsing files:', error);
        setLoadError('Failed to parse file information');
      }
    }
  }, [searchParams]);

  const uniqueBands = [...new Set(availableFiles.map(f => f.band))];

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 p-4 overflow-y-auto">
          <BandSelector
            bands={uniqueBands}
            selectedBand={selectedBand}
            onBandChange={(band) => {
              setSelectedBand(band);
              setIsApplied(false);
            }}
          />
          <BandControls
            selectedBand={selectedBand}
            onRemoveBand={handleRemoveBand}
            onApplyBand={handleApplyBand}
          />
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
              {loadError && (
                <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                  {loadError}
                </div>
              )}
            </div>

            {tiffData && (
              <div className="space-y-4">
                <BoundingBoxInput
                  onDownload={handleBboxDownload}
                  currentBbox={drawnBbox}
                />
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

                {/* <BoundingBoxInput
                  onDownload={handleBboxDownload}
                  currentBbox={drawnBbox}
                /> */}
                
              </div>
            )}
          </div>
        </div>

        <div className="w-2/3 t-2/3 relative overflow-hidden">
          <MapControls
            isGlobeView={mapState.isGlobeView}
            isMercator={mapState.isMercator}
            onToggleView={toggleView}
            onToggleProjection={toggleProjection}
          />
          <div ref={mapContainer} className="w-full h-full" />
          {/* <div className="absolute top-4 right-4">
            <BoundingBoxDownload onDownload={(bbox) => {
              console.log('Downloading region with bbox:', bbox)
            }} />
          </div> */}
        </div>
      </div>
    </div>
  )
}