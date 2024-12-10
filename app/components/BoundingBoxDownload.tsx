'use client'

import { useState } from 'react'

interface BoundingBoxDownloadProps {
  onDownload: (bbox: [number, number, number, number]) => void;
}

export default function BoundingBoxDownload({ onDownload }: BoundingBoxDownloadProps) {
  const [bbox, setBbox] = useState<[number, number, number, number]>([0, 0, 0, 0])

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/download-region', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bbox,
          tifFile: 'public/selected_tiff/latest.tif', // This will be the latest downloaded TIFF
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to download region')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'selected_region.tif'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading region:', error)
    }
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow mt-4">
      <h3 className="font-semibold text-lg mb-4 text-gray-900">Download Selected Region</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Min Longitude</label>
          <input
            type="number"
            value={bbox[0]}
            onChange={(e) => setBbox([parseFloat(e.target.value), bbox[1], bbox[2], bbox[3]])}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            step="0.0001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Min Latitude</label>
          <input
            type="number"
            value={bbox[1]}
            onChange={(e) => setBbox([bbox[0], parseFloat(e.target.value), bbox[2], bbox[3]])}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            step="0.0001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Max Longitude</label>
          <input
            type="number"
            value={bbox[2]}
            onChange={(e) => setBbox([bbox[0], bbox[1], parseFloat(e.target.value), bbox[3]])}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            step="0.0001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Max Latitude</label>
          <input
            type="number"
            value={bbox[3]}
            onChange={(e) => setBbox([bbox[0], bbox[1], bbox[2], parseFloat(e.target.value)])}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            step="0.0001"
          />
        </div>
      </div>
      <button
        onClick={handleDownload}
        className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Download Selected Region
      </button>
    </div>
  )
}
