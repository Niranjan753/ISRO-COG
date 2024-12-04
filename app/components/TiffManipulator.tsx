import { useState, useEffect } from 'react'

interface TiffManipulatorProps {
  onFilterChange: (filters: TiffFilters) => void
  isVisible: boolean
  initialData?: {
    min: number
    max: number
  }
}

export interface TiffFilters {
  contrast: number
  brightness: number
  saturation: number
  opacity: number
  colorScale: 'temperature' | 'rainbow' | 'grayscale' | 'custom'
  gamma: number
  customColors: {
    start: string
    middle: string
    end: string
  }
}

export default function TiffManipulator({ onFilterChange, isVisible, initialData }: TiffManipulatorProps) {
  const [filters, setFilters] = useState<TiffFilters>({
    contrast: 1,
    brightness: 0,
    saturation: 1,
    opacity: 0.8,
    colorScale: 'temperature',
    gamma: 1,
    customColors: {
      start: '#0000ff',
      middle: '#00ff00',
      end: '#ff0000'
    }
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
            Contrast ({filters.contrast.toFixed(1)})
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={filters.contrast}
            onChange={(e) => handleFilterChange('contrast', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-700">
            Brightness ({filters.brightness.toFixed(1)})
          </label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.1"
            value={filters.brightness}
            onChange={(e) => handleFilterChange('brightness', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-700">
            Saturation ({filters.saturation.toFixed(1)})
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={filters.saturation}
            onChange={(e) => handleFilterChange('saturation', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-700">
            Gamma ({filters.gamma.toFixed(1)})
          </label>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={filters.gamma}
            onChange={(e) => handleFilterChange('gamma', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-700">
            Opacity ({(filters.opacity * 100).toFixed(0)}%)
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={filters.opacity}
            onChange={(e) => handleFilterChange('opacity', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-700">Color Scale</label>
          <select
            value={filters.colorScale}
            onChange={(e) => handleFilterChange('colorScale', e.target.value)}
            className="w-full p-2 border rounded text-gray-900"
          >
            <option value="temperature">Temperature</option>
            <option value="rainbow">Rainbow</option>
            <option value="grayscale">Grayscale</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {filters.colorScale === 'custom' && (
          <div className="space-y-2">
            <div>
              <label className="block text-sm text-gray-700">Start Color</label>
              <input
                type="color"
                value={filters.customColors.start}
                onChange={(e) => handleFilterChange('customColors', {
                  ...filters.customColors,
                  start: e.target.value
                })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Middle Color</label>
              <input
                type="color"
                value={filters.customColors.middle}
                onChange={(e) => handleFilterChange('customColors', {
                  ...filters.customColors,
                  middle: e.target.value
                })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">End Color</label>
              <input
                type="color"
                value={filters.customColors.end}
                onChange={(e) => handleFilterChange('customColors', {
                  ...filters.customColors,
                  end: e.target.value
                })}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}