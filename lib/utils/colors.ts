// colors.ts

/* -------------------------
Types and Presets
------------------------- */
export type LuminancePreset = 'default' | 'shortlist' | 'extendedlist'

const PRESETS: Record<LuminancePreset, number[]> = {
  default: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
  shortlist: [50, 200, 400, 600, 800, 950],
  extendedlist: [
    50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900,
    925, 950,
  ],
}

const MIN_L = 5 // darkest possible lightness
const MAX_L = 95 // lightest possible lightness
const BASE_STEP = 400 // step corresponding to the base color

/* -------------------------
Conversion helpers HEX <-> HSL
------------------------- */
function convertHexToHSL(H: string) {
  // Convert hebaseH to RGB first
  let r = 0,
    g = 0,
    b = 0
  if (H.length === 7) {
    r = parseInt(H.slice(1, 3), 16) / 255
    g = parseInt(H.slice(3, 5), 16) / 255
    b = parseInt(H.slice(5, 7), 16) / 255
  }

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h = 0,
    s = 0,
    l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h *= 60
  }
  return { h, s: s * 100, l: l * 100 }
}

function convertHSLToHex({ h, s, l }: { h: number; s: number; l: number }) {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
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

  r = Math.round((r + m) * 255)
  g = Math.round((g + m) * 255)
  b = Math.round((b + m) * 255)

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`.toUpperCase()
}

/* -------------------------
Equidistant color palette generation
------------------------- */
export function generateEquidistantPalette(
  baseHex: string,
  count: number = 8
): Record<string, string> {
  const hsl = convertHexToHSL(baseHex)
  const palette: Record<string, string> = {}

  for (let i = 0; i < count; i++) {
    const hue = (hsl.h + (360 / count) * i) % 360
    palette[`color-${i}`] = convertHSLToHex({ h: hue, s: hsl.s, l: hsl.l })
  }

  return palette
}

export function equidistantColorAtIndex(baseHex: string, count: number = 8, idx: number): string {
  const baseHSL = convertHexToHSL(baseHex)
  const hue = (baseHSL.h + (360 / count) * idx) % 360
  // keep same saturation & lightness as base (so base color corresponds to same L)
  return convertHSLToHex({ h: hue, s: baseHSL.s, l: baseHSL.l })
}

/* -------------------------
Luminance palette generation
------------------------- */
export function generateLuminancePalette(
  baseColor: string,
  preset: LuminancePreset = 'default'
): Record<string, string> {
  const hsl = convertHexToHSL(baseColor)
  const palette: Record<string, string> = {}

  const steps = [...PRESETS[preset]].sort((a, b) => a - b)
  const first = steps[0]
  const last = steps[steps.length - 1]

  const baseL = hsl.l

  const clamp = (v: number) => Math.max(0, Math.min(100, v))

  for (const step of steps) {
    let l: number

    if (step === BASE_STEP) {
      l = baseL
    } else if (step < BASE_STEP) {
      const denom = BASE_STEP - first || 1
      const t = (BASE_STEP - step) / denom
      l = baseL + t * (MAX_L - baseL)
    } else {
      const denom = last - BASE_STEP || 1
      const t = (step - BASE_STEP) / denom
      l = baseL - t * (baseL - MIN_L)
    }

    palette[`color-${step}`] = convertHSLToHex({
      h: hsl.h,
      s: hsl.s,
      l: clamp(l),
    })
  }

  return palette
}

/* -------------------------
Luminance cycle builder and lightness computer
------------------------- */
function buildLuminanceCycle(steps: number[]): number[] {
  const sorted = [...steps].sort((a, b) => a - b)
  // ensure 400 exists in steps; if not, we still treat 400 as base position (but prefer if present)
  const lighter = sorted.filter(s => s < BASE_STEP)
  const darker = sorted.filter(s => s > BASE_STEP && s !== 950) // exclude 950 as requested
  // final cycle: base first, then darker ascending, then lighter ascending
  return [BASE_STEP, ...darker, ...lighter]
}

function computeLightnessForStep(baseL: number, step: number, stepsPreset: number[]): number {
  if (step === BASE_STEP) return baseL

  const sorted = [...stepsPreset].sort((a, b) => a - b)

  // darkSteps: those > BASE_STEP excluding 950 (but compute with sorted)
  const darkSteps = sorted.filter(s => s > BASE_STEP && s !== 950)
  const lightSteps = sorted.filter(s => s < BASE_STEP)

  if (step > BASE_STEP) {
    // map [BASE_STEP .. lastDarkStep] -> [baseL .. MIN_L]
    const lastDark = darkSteps.length ? darkSteps[darkSteps.length - 1] : BASE_STEP
    // if there are no darkSteps (edge case), return baseL
    if (lastDark === BASE_STEP) return baseL
    const t = (step - BASE_STEP) / (lastDark - BASE_STEP) // 0..1
    return baseL - t * (baseL - MIN_L)
  } else {
    // step < BASE_STEP -> map [minStep .. BASE_STEP] -> [MAX_L .. baseL]
    const firstLight = lightSteps.length ? lightSteps[0] : BASE_STEP
    if (firstLight === BASE_STEP) return baseL
    const t = (BASE_STEP - step) / (BASE_STEP - firstLight) // 0..1
    return baseL + t * (MAX_L - baseL)
  }
}

/* -------------------------
Cyclic color generator
------------------------- */
export function getCyclicColor(
  baseColor: string,
  count: number = 8,
  preset: LuminancePreset = 'shortlist',
  index: number
): string {
  if (count < 1) throw new Error('count must be >= 1')
  if (!Number.isFinite(index) || index < 1) throw new Error('index must be a finite integer >= 1')

  const steps = PRESETS[preset]
  const luminanceCycle = buildLuminanceCycle(steps) // e.g. [400,600,800,50,200] for shortlist
  const Lcount = luminanceCycle.length

  // zero-based position in the infinite sequence
  const pos = index - 1

  // which luminance pass (0..Lcount-1)
  const luminancePass = Math.floor(pos / count) % Lcount
  const hueIdx = pos % count // which equidistant color in this pass

  // equidistant color (same saturation & lightness as base color)
  const eqHex = equidistantColorAtIndex(baseColor, count, hueIdx)
  const eqHSL = convertHexToHSL(eqHex) // we will use eqHSL.h & eqHSL.s, and eqHSL.l is the baseL for step 400

  const targetStep = luminanceCycle[luminancePass]

  // compute target lightness for this equidistant color
  const targetL = computeLightnessForStep(eqHSL.l, targetStep, steps)

  // return final hex computed from eq color hue & saturation but with new lightness
  return convertHSLToHex({ h: eqHSL.h, s: eqHSL.s, l: targetL })
}
