import { ColorScheme } from '../types'

export const COLOR_SCHEMES: Record<ColorScheme, (value: number) => [number, number, number]> = {
  rainbow: (value: number) => {
    const hue = (1 - value) * 240
    return hslToRgb(hue / 360, 1, 0.5)
  },
  thermal: (value: number) => {
    if (value < 0.33) return [0, 0, Math.round(255 * (value * 3))]
    if (value < 0.66) return [0, Math.round(255 * ((value - 0.33) * 3)), 255]
    return [Math.round(255 * ((value - 0.66) * 3)), 255, 255]
  },
  grayscale: (value: number) => {
    // Enhanced grayscale implementation with gamma correction and contrast stretching
    const gamma = 1.2; // Slight gamma correction for better midtone detail
    const contrast = 1.1; // Subtle contrast enhancement
    
    // Apply gamma correction
    const gammaValue = Math.pow(value, 1/gamma);
    
    // Apply contrast stretching
    const contrastedValue = (gammaValue - 0.5) * contrast + 0.5;
    
    // Clamp values to valid range
    const clampedValue = Math.max(0, Math.min(1, contrastedValue));
    
    // Convert to 8-bit grayscale
    const v = Math.round(clampedValue * 255);
    return [v, v, v];
  },
  terrain: (value: number) => {
    if (value < 0.2) return [0, 0, 255]
    if (value < 0.4) return [0, 255, 255] 
    if (value < 0.6) return [0, 255, 0]
    if (value < 0.8) return [255, 255, 0]
    return [255, 0, 0]
  }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}