import { useState } from 'react'
import { TiffFilters, ColorScheme } from '../types'

interface TiffManipulatorProps {
  onFilterChange: (filters: TiffFilters) => void
  isVisible: boolean
  initialData: { min: number, max: number }
}

export default function TiffManipulator({
  onFilterChange,
  isVisible,
  initialData
}: TiffManipulatorProps) {
  const [filters, setFilters] = useState<TiffFilters>({
    colorScheme: 'grayscale',
    contrast: 1
  })

  const handleFilterChange = (key: keyof TiffFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  if (!isVisible) return null

  return (
    <div className="absolute top-20 right-5 z-10 bg-white/90 p-4 rounded-lg shadow-xl w-72">
      <h3 className="font-semibold mb-4 text-gray-900">TIFF Layer Controls</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1 text-gray-700">
            Color Scheme
          </label>
          <select
            value={filters.colorScheme}
            onChange={(e) => handleFilterChange('colorScheme', e.target.value as ColorScheme)}
            className="w-full rounded-md border-gray-300 text-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option className="text-gray-900" value="grayscale">Grayscale</option>
            <option className="text-gray-900" value="thermal">Thermal</option>
            <option className="text-gray-900" value="rainbow">Rainbow</option>
            <option className="text-gray-900" value="terrain">Terrain</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1 text-gray-700">
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
  )
}