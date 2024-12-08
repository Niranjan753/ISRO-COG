import { useState, useEffect } from "react";

interface BoundingBoxInputProps {
    onDownload: (bbox: [number, number, number, number]) => void;
    currentBbox?: [number, number, number, number];
  }
  
  export default function BoundingBoxInput({ onDownload, currentBbox }: BoundingBoxInputProps) {
    const [bbox, setBbox] = useState<[number, number, number, number]>(
      currentBbox || [0, 0, 0, 0]
    );
  
    useEffect(() => {
      if (currentBbox) {
        setBbox(currentBbox);
      }
    }, [currentBbox]);
  
    const handleInputChange = (index: number, value: string) => {
      const newBbox = [...bbox] as [number, number, number, number];
      newBbox[index] = parseFloat(value) || 0;
      setBbox(newBbox);
    };
  
    return (
      <div className="p-4 bg-white rounded-lg shadow mt-4">
        <h3 className="font-semibold text-lg mb-4 text-gray-900">Bounding Box Selection</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">West</label>
            <input
              type="number"
              value={bbox[0]}
              onChange={(e) => handleInputChange(0, e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              step="0.0001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">South</label>
            <input
              type="number"
              value={bbox[1]}
              onChange={(e) => handleInputChange(1, e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              step="0.0001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">East</label>
            <input
              type="number"
              value={bbox[2]}
              onChange={(e) => handleInputChange(2, e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              step="0.0001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">North</label>
            <input
              type="number"
              value={bbox[3]}
              onChange={(e) => handleInputChange(3, e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              step="0.0001"
            />
          </div>
        </div>
        <button
          onClick={() => onDownload(bbox)}
          className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Download Selected Region
        </button>
      </div>
    );
  }