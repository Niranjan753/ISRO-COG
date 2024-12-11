import { useState } from 'react'
import * as GeoTIFF from 'geotiff'
import { TiffData, TiffFilters } from '../types'
import { COLOR_SCHEMES } from '../utils/colorSchemes'
import { fromArrayBuffer, writeArrayBuffer } from 'geotiff'

function HSVtoRGB(h: number, s: number, v: number) {
  let r = 0, g = 0, b = 0
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

export function useTiffProcessing(
  mapContainer: React.RefObject<HTMLDivElement>,
  mapRef: React.RefObject<mapboxgl.Map>,
  drawRef: React.RefObject<MapboxDraw>
) {
  const [tiffData, setTiffData] = useState<TiffData>()
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const processTiff = async (file: File, map: mapboxgl.Map) => {
    if (!file || !map) {
      setError('No file selected or map not initialized')
      return
    }

    setError(null)
    setFileName(file.name)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer)
      const image = await tiff.getImage()
      const width = image.getWidth()
      const height = image.getHeight()
      const rasterData = await image.readRasters()
      const data = rasterData[0] as Float32Array | Uint16Array | Uint8Array
      
      const bbox = image.getBoundingBox()
      
      let min = Infinity
      let max = -Infinity
      const values: number[] = []

      for (let i = 0; i < data.length; i++) {
        const value = data[i]
        values.push(value)
        min = Math.min(min, value)
        max = Math.max(max, value)
      }

      const newTiffData: TiffData = {
        min,
        max,
        values,
        width,
        height,
        bbox: [bbox[0], bbox[1], bbox[2], bbox[3]],
        center: [
          (bbox[0] + bbox[2]) / 2,
          (bbox[1] + bbox[3]) / 2
        ],
        originalData: data
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not create canvas context')

      const imageData = ctx.createImageData(width, height)

      for (let i = 0; i < data.length; i++) {
        const value = data[i]
        const normalizedValue = (value - min) / (max - min)
        const grayValue = Math.round(normalizedValue * 255)
        
        imageData.data[i * 4] = grayValue
        imageData.data[i * 4 + 1] = grayValue
        imageData.data[i * 4 + 2] = grayValue
        imageData.data[i * 4 + 3] = 255
      }

      ctx.putImageData(imageData, 0, 0)

      if (!map.getSource('tiff-layer')) {
        map.addSource('tiff-layer', {
          type: 'image',
          url: canvas.toDataURL(),
          coordinates: [
            [bbox[0], bbox[3]], 
            [bbox[2], bbox[3]], 
            [bbox[2], bbox[1]], 
            [bbox[0], bbox[1]]  
          ]
        })

        map.addLayer({
          id: 'tiff-layer',
          type: 'raster',
          source: 'tiff-layer',
          paint: {
            'raster-opacity': 0.85
          }
        })
      } else {
        const source = map.getSource('tiff-layer') as mapboxgl.ImageSource
        source.updateImage({
          url: canvas.toDataURL(),
          coordinates: [
            [bbox[0], bbox[3]],
            [bbox[2], bbox[3]], 
            [bbox[2], bbox[1]],
            [bbox[0], bbox[1]]
          ]
        })
      }

      try {
        const blob = new Blob([arrayBuffer], { type: 'image/tiff' })
        const link = document.createElement('a')
        const fileName = `selected_tiff_${Date.now()}.tif`
        link.href = URL.createObjectURL(blob)
        link.download = fileName
        link.click()
        URL.revokeObjectURL(link.href)
      } catch (err) {
        console.error('Error saving TIFF file:', err)
      }

      const existingContainer = mapContainer.current?.querySelector('div')
      if (existingContainer) {
        existingContainer.remove()
      }

      map.fitBounds([
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]]
      ], { padding: 50 })

      setTiffData(newTiffData)
      return newTiffData

    } catch (err) {
      const errorMessage = err instanceof Error 
        ? `TIFF Processing Error: ${err.message}`
        : 'Failed to process TIFF file'
      
      console.error('TIFF error:', err)
      setError(errorMessage)
      throw err
    }
  }

  const applyFilters = (filters: TiffFilters, map: mapboxgl.Map) => {
    if (!tiffData) return

    try {
      const canvas = document.createElement('canvas')
      canvas.width = tiffData.width
      canvas.height = tiffData.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not create canvas context')

      const imageData = ctx.createImageData(tiffData.width, tiffData.height)
      const data = tiffData.originalData!

      for (let i = 0; i < data.length; i++) {
        const value = data[i]
        const normalizedValue = Math.max(0, Math.min(1, (value - tiffData.min) / (tiffData.max - tiffData.min)))
        const adjustedValue = Math.pow(normalizedValue, 1 / filters.contrast)
        
        let r, g, b
        switch (filters.colorScheme) {
          case 'grayscale':
            const v = Math.round(adjustedValue * 255)
            r = g = b = v
            break
          case 'rainbow':
            const hue = (1 - adjustedValue) * 240
            const rgb = HSVtoRGB(hue / 360, 1, 1)
            r = rgb.r; g = rgb.g; b = rgb.b
            break
          case 'thermal':
            if (adjustedValue < 0.33) {
              r = 0; g = 0; b = Math.round(255 * (adjustedValue * 3))
            } else if (adjustedValue < 0.66) {
              r = 0; g = Math.round(255 * ((adjustedValue - 0.33) * 3)); b = 255
            } else {
              r = Math.round(255 * ((adjustedValue - 0.66) * 3)); g = 255; b = 255
            }
            break
          case 'terrain':
            if (adjustedValue < 0.2) { r = 0; g = 0; b = 255 }
            else if (adjustedValue < 0.4) { r = 0; g = 255; b = 255 }
            else if (adjustedValue < 0.6) { r = 0; g = 255; b = 0 }
            else if (adjustedValue < 0.8) { r = 255; g = 255; b = 0 }
            else { r = 255; g = 0; b = 0 }
            break
          default:
            r = g = b = Math.round(adjustedValue * 255)
        }

        imageData.data[i * 4] = r
        imageData.data[i * 4 + 1] = g
        imageData.data[i * 4 + 2] = b
        imageData.data[i * 4 + 3] = 255
      }

      ctx.putImageData(imageData, 0, 0)
      
      const source = map.getSource('tiff-layer') as mapboxgl.ImageSource
      if (source) {
        source.updateImage({
          url: canvas.toDataURL(),
          coordinates: [
            [tiffData.bbox[0], tiffData.bbox[3]],
            [tiffData.bbox[2], tiffData.bbox[3]], 
            [tiffData.bbox[2], tiffData.bbox[1]],
            [tiffData.bbox[0], tiffData.bbox[1]]
          ]
        })
      }
    } catch (err) {
      console.error('Error applying filters:', err)
      setError('Failed to apply filters')
    }
  }

  const getPolygonBounds = (coordinates: number[][]) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    coordinates.forEach(([x, y]) => {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    })
    return [minX, minY, maxX, maxY]
  }

  const isPointInPolygon = (point: [number, number], polygon: number[][]) => {
    const x = point[0], y = point[1]
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1]
      const xj = polygon[j][0], yj = polygon[j][1]
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
      if (intersect) inside = !inside
    }
    return inside
  }

  const downloadSelectedArea = async (format: 'png' | 'tiff', currentFilters: TiffFilters) => {
    if (!tiffData || !mapRef.current) return;

    const [minLng, minLat, maxLng, maxLat] = tiffData.bbox;
    const pixelWidth = tiffData.width;
    const pixelHeight = tiffData.height;
    const [bboxMinX, bboxMinY, bboxMaxX, bboxMaxY] = tiffData.bbox;

    const xScale = pixelWidth / (bboxMaxX - bboxMinX);
    const yScale = pixelHeight / (bboxMaxY - bboxMinY);

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil((maxLng - minLng) * xScale);
    canvas.height = Math.ceil((maxLat - minLat) * yScale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = tiffData.originalData!;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const lng = minLng + (x / xScale);
        const lat = maxLat - (y / yScale);

        const pixelIndex = (y * canvas.width + x) * 4;
        const valueIndex = Math.floor((lat - bboxMinY) * yScale) * pixelWidth + Math.floor((lng - bboxMinX) * xScale);

        if (valueIndex < 0 || valueIndex >= data.length) {
          console.warn(`Skipping out-of-bounds index: ${valueIndex}`);
          continue;
        }

        const value = data[valueIndex];
        const normalizedValue = Math.max(0, Math.min(1, (value - tiffData.min) / (tiffData.max - tiffData.min)));
        const adjustedValue = Math.pow(normalizedValue, 1 / currentFilters.contrast);

        let r, g, b;
        switch (currentFilters.colorScheme) {
          case 'grayscale':
            const v = Math.round(adjustedValue * 255);
            r = g = b = v;
            break;
          case 'rainbow':
            const hue = (1 - adjustedValue) * 240;
            const rgb = HSVtoRGB(hue / 360, 1, 1);
            r = rgb.r; g = rgb.g; b = rgb.b;
            break;
          case 'thermal':
            if (adjustedValue < 0.33) {
              r = 0; g = 0; b = Math.round(255 * (adjustedValue * 3));
            } else if (adjustedValue < 0.66) {
              r = 0; g = Math.round(255 * ((adjustedValue - 0.33) * 3)); b = 255;
            } else {
              r = Math.round(255 * ((adjustedValue - 0.66) * 3)); g = 255; b = 255;
            }
            break;
          case 'terrain':
            if (adjustedValue < 0.2) { r = 0; g = 0; b = 255; }
            else if (adjustedValue < 0.4) { r = 0; g = 255; b = 255; }
            else if (adjustedValue < 0.6) { r = 0; g = 255; b = 0; }
            else if (adjustedValue < 0.8) { r = 255; g = 255; b = 0; }
            else { r = 255; g = 0; b = 0; }
            break;
          default:
            r = g = b = Math.round(adjustedValue * 255);
        }

        imageData.data[pixelIndex] = r;
        imageData.data[pixelIndex + 1] = g;
        imageData.data[pixelIndex + 2] = b;
        imageData.data[pixelIndex + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const link = document.createElement('a');
    link.href = canvas.toDataURL(`image/${format}`);
    link.download = `${fileName || 'download'}.${format}`;
    link.click();
  };

  return {
    tiffData,
    error,
    fileName,
    processTiff,
    applyFilters,
    downloadSelectedArea,
    setTiffData,
    setFileName
  }
}