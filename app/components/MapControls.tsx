interface MapControlsProps {
    isGlobeView: boolean
    isMercator: boolean 
    onToggleView: () => void
    onToggleProjection: () => void
  }
  
  export default function MapControls({
    isGlobeView,
    isMercator,
    onToggleView,
    onToggleProjection
  }: MapControlsProps) {
    return (
      <div className="absolute top-20 left-5 z-10 bg-white/90 p-3 rounded-lg shadow-xl drop-shadow-lg">
        <div className="flex gap-2">
          <button
            onClick={onToggleView}
            className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-semibold shadow-sm"
          >
            {isGlobeView ? 'Map View' : 'Globe View'}
          </button>
          <button
            onClick={onToggleProjection}
            className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-semibold shadow-sm"
          >
            {isMercator ? 'Globe View' : 'Mercator View'}
          </button>
        </div>
      </div>
    )
  }