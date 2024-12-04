export type TiffData = {
    min: number
    max: number
    values: number[]
    width: number
    height: number
    bbox: number[]
    center: [number, number]
    originalData?: Float32Array | Uint16Array | Uint8Array
  }
  
  export type ColorScheme = 'rainbow' | 'thermal' | 'grayscale' | 'terrain'
  
  export type MapState = {
    isGlobeView: boolean
    isMercator: boolean
  }
  
  export type TiffFilters = {
    colorScheme: ColorScheme
    contrast: number
  }