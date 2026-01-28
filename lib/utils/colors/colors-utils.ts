export type ColorFormat = 'hex' | 'rgb' | 'rgba' | 'hsl' | 'hsla'
export type LuminancePreset = 'default' | 'shortList' | 'extendedList' | 'lightColorsList'

export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

export interface HSLA {
  h: number
  s: number
  l: number
  a: number
}

const PRESETS: Record<LuminancePreset, number[]> = {
  default: [950, 900, 800, 700, 600, 500, 400, 300, 200, 150],
  shortList: [950, 850, 650, 450, 250, 150],
  extendedList: [
    950, 925, 900, 850, 800, 750, 700, 650, 600, 550, 500, 450, 400, 350, 300, 250, 200, 175, 150
  ],
  lightColorsList: [950, 930, 910, 890, 870, 850, 830]
}

/* -------------------------
Core Conversion Utilities (Private)
------------------------- */
/**
 * Parses any color string into an RGBA object.
 */
export function parseToRGBA(color: string): RGBA {
  const c = color.trim().toLowerCase()

  // Hex
  if (c.startsWith('#')) {
    const hex = c.slice(1)
    const len = hex.length
    let r = 0,
      g = 0,
      b = 0,
      a = 1

    if (len === 3 || len === 4) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
      if (len === 4) a = parseInt(hex[3] + hex[3], 16) / 255
    } else if (len === 6 || len === 8) {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
      if (len === 8) a = parseInt(hex.slice(6, 8), 16) / 255
    }
    return { r, g, b, a }
  }

  // RGB/RGBA
  const rgbaMatch = c.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10),
      g: parseInt(rgbaMatch[2], 10),
      b: parseInt(rgbaMatch[3], 10),
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    }
  }

  // HSL/HSLA
  const hslaMatch = c.match(/^hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)/)
  if (hslaMatch) {
    const hsla: HSLA = {
      h: parseInt(hslaMatch[1], 10),
      s: parseInt(hslaMatch[2], 10),
      l: parseInt(hslaMatch[3], 10),
      a: hslaMatch[4] ? parseFloat(hslaMatch[4]) : 1,
    }
    return hslaToRGBA(hsla)
  }

  return { r: 0, g: 0, b: 0, a: 1 }
}

export function rgbaToHSLA({ r, g, b, a }: RGBA): HSLA {
  const rd = r / 255
  const gd = g / 255
  const bd = b / 255
  const max = Math.max(rd, gd, bd)
  const min = Math.min(rd, gd, bd)
  let h = 0,
    s = 0,
    l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rd:
        h = (gd - bd) / d + (gd < bd ? 6 : 0)
        break
      case gd:
        h = (bd - rd) / d + 2
        break
      case bd:
        h = (rd - gd) / d + 4
        break
    }
    h *= 60
  }
  return { h, s: s * 100, l: l * 100, a }
}

export function hslaToRGBA({ h, s, l, a }: HSLA): RGBA {
  const sd = s / 100
  const ld = l / 100
  const c = (1 - Math.abs(2 * ld - 1)) * sd
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ld - c / 2
  let r = 0,
    g = 0,
    b = 0

  if (h < 60) {
    r = c
    g = x
    b = 0
  } else if (h < 120) {
    r = x
    g = c
    b = 0
  } else if (h < 180) {
    r = 0
    g = c
    b = x
  } else if (h < 240) {
    r = 0
    g = x
    b = c
  } else if (h < 300) {
    r = x
    g = 0
    b = c
  } else {
    r = c
    g = 0
    b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a,
  }
}

function rgbaToHex({ r, g, b, a }: RGBA): string {
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0').toUpperCase()
  let hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`
  if (a < 1) hex += toHex(a * 255)
  return hex
}

function formatRGBA(rgba: RGBA, format: ColorFormat): string {
  switch (format) {
    case 'hex':
      return rgbaToHex(rgba)
    case 'rgb':
      return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`
    case 'rgba':
      return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`
    case 'hsl':
    case 'hsla': {
      const { h, s, l, a } = rgbaToHSLA(rgba)
      if (format === 'hsl') return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`
      return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${a})`
    }
  }
}

/* -------------------------
Universal Conversion (Public)
------------------------- */

/**
 * Universal color formatter/converter.
 * Accepts either a color string (any format) or an RGBA object.
 * 
 * @param color - The color to format (string or RGBA object)
 * @param targetFormat - Desired output format (default: 'hex')
 */
export function formatColor(color: string | RGBA, targetFormat: ColorFormat = 'hex'): string {
  const rgba = typeof color === 'string' ? parseToRGBA(color) : color
  return formatRGBA(rgba, targetFormat)
}

/* -------------------------
Equidistant color palette generation
------------------------- */

export function generateEquidistantPalette(
  baseColor: string,
  count: number = 8,
  format: ColorFormat = 'hex'
): Record<string, string> {
  const rgba = parseToRGBA(baseColor)
  const hsl = rgbaToHSLA(rgba)
  const palette: Record<string, string> = {}

  for (let i = 0; i < count; i++) {
    const hue = (hsl.h + (360 / count) * i) % 360
    const newRgba = hslaToRGBA({ ...hsl, h: hue })
    palette[`color-${i}`] = formatRGBA(newRgba, format)
  }

  return palette
}

export function equidistantColorAtIndex(
  baseColor: string,
  count: number = 8,
  idx: number,
  format: ColorFormat = 'hex'
): string {
  const rgba = parseToRGBA(baseColor)
  const hsl = rgbaToHSLA(rgba)
  const hue = (hsl.h + (360 / count) * idx) % 360
  const newRgba = hslaToRGBA({ ...hsl, h: hue })
  return formatRGBA(newRgba, format)
}

/* -------------------------
Luminance palette generation
------------------------- */

export function generateLuminancePalette(
  baseColor: string,
  preset: LuminancePreset = 'default',
  format: ColorFormat = 'hex'
): Record<string, string> {
  const rgba = parseToRGBA(baseColor)
  const hsl = rgbaToHSLA(rgba)
  const palette: Record<string, string> = {}

  const stepsObj = PRESETS[preset] || PRESETS['default']
  const steps = [...stepsObj].sort((a, b) => b - a) // light to dark in 1000-based scale means descending

  for (const step of steps) {
    const l = step / 10
    const newRgba = hslaToRGBA({ ...hsl, l })
    palette[`color-${step}`] = formatRGBA(newRgba, format)
  }

  return palette
}

/**
 * Finds the median step of a preset.
 * If even number of items, takes the first of the second half (upper median).
 */
function getMedianStep(steps: number[]): number {
  if (steps.length === 0) return 500
  const sorted = [...steps].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted[mid]
}

function buildLuminanceCycle(steps: number[]): number[] {
  if (!Array.isArray(steps) || steps.length === 0) return [500]

  const sorted = [...steps].sort((a, b) => a - b)
  const median = getMedianStep(sorted)

  const darker = sorted.filter(s => s < median).sort((a, b) => b - a)
  const lighter = sorted.filter(s => s > median).sort((a, b) => a - b)

  return [median, ...darker, ...lighter]
}

function computeLightnessForStep(step: number): number {
  return step / 10
}

/* -------------------------
Cyclic color generator
------------------------- */

export function getCyclicColor(
  baseColor: string,
  count: number = 8,
  preset: LuminancePreset = 'shortList',
  index: number,
  format: ColorFormat = 'hex'
): string {
  if (count < 1) throw new Error('count must be >= 1')
  if (!Number.isFinite(index) || index < 1) throw new Error('index must be a finite integer >= 1')

  const steps = PRESETS[preset] || PRESETS['default']
  const luminanceCycle = buildLuminanceCycle(steps)
  const Lcount = luminanceCycle.length

  const pos = index - 1
  const luminancePass = Math.floor(pos / count) % Lcount

  const rgba = parseToRGBA(baseColor)
  const baseHSL = rgbaToHSLA(rgba)
  const stepAngle = 360 / count
  const driftPerStep = stepAngle / (5 * count)
  const hue = (baseHSL.h + pos * (stepAngle + driftPerStep)) % 360

  const targetStep = luminanceCycle[luminancePass]
  const targetL = computeLightnessForStep(targetStep)

  const finalRgba = hslaToRGBA({ ...baseHSL, h: hue, l: targetL })
  return formatRGBA(finalRgba, format)
}

/* -------------------------
Manipulation Utils
------------------------- */

/**
 * @param color - Any valid color string
 * @param percent - Percentage to darken (scale factor: currentL * (1 - percent/100))
 */
export function darkenColor(color: string, percent: number, format: ColorFormat = 'hex'): string {
  const rgba = parseToRGBA(color)
  const hsla = rgbaToHSLA(rgba)
  
  const newL = Math.max(0, hsla.l * (1 - percent / 100))
  
  const newRgba = hslaToRGBA({ ...hsla, l: newL })
  return formatRGBA(newRgba, format)
}

/**
 * @param color - Any valid color string
 * @param percent - Percentage to lighten (scale factor: currentL * (1 + percent/100))
 */
export function lightenColor(color: string, percent: number, format: ColorFormat = 'hex'): string {
  const rgba = parseToRGBA(color)
  const hsla = rgbaToHSLA(rgba)
  
  const newL = Math.min(100, hsla.l * (1 + percent / 100))
  
  const newRgba = hslaToRGBA({ ...hsla, l: newL })
  return formatRGBA(newRgba, format)
}

/* -------------------------
UI / Accessibility Utils
------------------------- */

/**
 * @param color - Any valid color string
 * @returns Luminance value between 0 and 1
 */
export function getLuminance(color: string): number {
  const rgba = parseToRGBA(color)
  const hsla = rgbaToHSLA(rgba)
  return hsla.l / 100
}

/**
 * @param backgroundColor - Background color string
 * @param darkColor - Color to use for dark text
 * @param lightColor - Color to use for light text
 * @returns Appropriate text color
 */
export function getTextColorForBackground(
  backgroundColor: string,
  darkColor: string,
  lightColor: string
): string {
  if (backgroundColor === 'transparent') {
    return darkColor
  }

  const luminance = getLuminance(backgroundColor)
  return luminance > 0.8 ? darkColor : lightColor
}
