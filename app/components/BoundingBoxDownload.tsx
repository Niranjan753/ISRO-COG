'use client'

import { useState } from 'react'

interface BoundingBoxDownloadProps {
  onDownload: (bbox: [number, number, number, number]) => void;
  bbox: [number, number, number, number] | null;
  fileName: string;
}

export default function BoundingBoxDownload({ onDownload, bbox, fileName }: BoundingBoxDownloadProps) {
  const [localBbox, setLocalBbox] = useState<[number, number, number, number]>(bbox || [0, 0, 0, 0])

  const handleDownload = () => {
    if (!bbox) {
      console.error('Bounding box is not set');
      return;
    }

    // Navigate to partial-download page with bbox coordinates and file name
    const searchParams = new URLSearchParams({
      north: bbox[3].toString(),
      south: bbox[1].toString(),
      east: bbox[2].toString(),
      west: bbox[0].toString(),
      fileName,
      filePath: `/path/to/your/tiff/files/${fileName}` // Adjust this path as needed
    });
    window.location.href = `/partial-download?${searchParams.toString()}`;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow mt-4">
      <h3 className="font-semibold text-lg mb-4 text-gray-900">Download Selected Region</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Min Longitude</label>
          <input
            type="number"
            value={localBbox[0]}
            onChange={(e) => setLocalBbox([parseFloat(e.target.value), localBbox[1], localBbox[2], localBbox[3]])}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            step="0.0001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Min Latitude</label>
          <input
            type="number"
            value={localBbox[1]}
            onChange={(e) => setLocalBbox([localBbox[0], parseFloat(e.target.value), localBbox[2], localBbox[3]])}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            step="0.0001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Max Longitude</label>
          <input
            type="number"
            value={localBbox[2]}
            onChange={(e) => setLocalBbox([localBbox[0], localBbox[1], parseFloat(e.target.value), localBbox[3]])}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            step="0.0001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Max Latitude</label>
          <input
            type="number"
            value={localBbox[3]}
            onChange={(e) => setLocalBbox([localBbox[0], localBbox[1], localBbox[2], parseFloat(e.target.value)])}
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
