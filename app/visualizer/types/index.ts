export interface TiffData {
    min: number
    max: number
    values: number[]
    width: number
    height: number
    bbox: number[]
    center: [number, number]
    originalData?: Float32Array | Uint16Array | Uint8Array
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
  
  export interface MapState {
    isGlobeView: boolean
    isMercator: boolean
  }