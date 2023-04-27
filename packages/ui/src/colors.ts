export const FeijoaColor = '#A5D179'
export const DeYorkColor = '#77C07B'
export const FernColor = '#60B96E' // green
export const PuertoRicoColor = '#45AEA3'
export const MediumTurquoiseColor = '#46CBDE'
export const SummerSkyColor = '#47BDF6'
export const MalibuColor = '#5AADF6'
export const SeagullColor = '#73A6CD'
export const EastSideColor = '#B977CB' // purple
export const MoodyBlueColor = '#7C6FCD' // violet
export const ChetwodeBlueColor = '#6F7BC5' // dark blue
export const SalmonColor = '#F28469' // salmon
export const SeaBuckthornColor = '#F2994A' // orange (warning)
export const FlamingoColor = '#EB5757' // red (error)
export const LinkWaterColor = '#C9CBCD'

export const SilverSandColor = '#BEC2C8'
export const PlatinumColor = '#E2E2E2'
export const CrayolaColor = '#F2C94C'
export const SlateBlueColor = '#5E6AD2'
export const CadetGreyColor = '#95A2B3'

const blackColors = Object.freeze([
  FeijoaColor,
  DeYorkColor,
  FernColor,
  PuertoRicoColor,
  MediumTurquoiseColor,
  SummerSkyColor,
  MalibuColor,
  SeagullColor,
  EastSideColor,
  MoodyBlueColor,
  ChetwodeBlueColor,
  SalmonColor,
  SilverSandColor,
  PlatinumColor,
  CrayolaColor,
  SlateBlueColor,
  CadetGreyColor
])

/**
 * @public
 */
export function getPlatformColor (hash: number): string {
  return blackColors[Math.abs(hash) % blackColors.length]
}

/**
 * @public
 */
export function getPlatformColorForText (text: string): string {
  return getPlatformColor(hashCode(text))
}

/**
 * @public
 */
export function getPlatformColors (): readonly string[] {
  return blackColors
}

function hashCode (str: string): number {
  return str.split('').reduce((prevHash, currVal) => ((prevHash << 5) - prevHash + currVal.charCodeAt(0)) | 0, 0)
}

/**
 * @public
 */
export function getColorNumberByText (str: string): number {
  return hashCode(str)
}

/**
 * @public
 */
export function hexColorToNumber (hexColor: string): number {
  if (hexColor === undefined || hexColor === null) {
    return 0
  }
  return parseInt(hexColor.replace('#', ''), 16)
}

/**
 * @public
 */
export function hexToRgb (color: string): { r: number, g: number, b: number } {
  if (!color.startsWith('#')) {
    return { r: 128, g: 128, b: 128 }
  }
  color = color.replace('#', '')
  if (color.length === 3) {
    color = color
      .split('')
      .map((c) => c + c)
      .join('')
  }
  return {
    r: parseInt(color.slice(0, 2), 16),
    g: parseInt(color.slice(2, 4), 16),
    b: parseInt(color.slice(4, 6), 16)
  }
}

/**
 * @public
 */
export function numberToHexColor (color: number): string {
  if (color === undefined || color === null) {
    return ''
  }
  return `#${color.toString(16)}`
}

/**
 * @public
 */
export function numberToRGB (color: number, alpha?: number): string {
  if (color === undefined || color === null) {
    return ''
  }
  const hex = color.toString(16)
  const r = hex.length >= 2 ? parseInt(hex.slice(0, 2), 16) : 0
  const g = hex.length >= 4 ? parseInt(hex.slice(2, 4), 16) : 0
  const b = hex.length >= 6 ? parseInt(hex.slice(4, 6), 16) : 0

  return `rgba(${r}, ${g}, ${b}, ${alpha === undefined ? '1' : alpha})`
}

/**
 * @public
 */
export function hslToRgb (h: number, s: number, l: number): { r: number, g: number, b: number } {
  let r, g, b

  if (s === 0) {
    r = g = b = l // achromatic
  } else {
    const hue2rgb = function hue2rgb (p: number, q: number, t: number): number {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
}

/**
 * @public
 */
export function rgbToHex (color: { r: number, g: number, b: number }): string {
  function addZero (d: string): string {
    if (d.length < 2) {
      return '0' + d
    }
    return d
  }
  return (
    '#' +
    addZero((Math.round(color.r) % 255).toString(16)) +
    addZero((Math.round(color.g) % 255).toString(16)) +
    addZero((Math.round(color.b) % 255).toString(16))
  )
}

export async function svgToColor (img: SVGSVGElement): Promise<{ r: number, g: number, b: number } | undefined> {
  const outerHTML = img.outerHTML
  const blob = new Blob([outerHTML], { type: 'image/svg+xml;charset=utf-8' })
  const blobURL = URL.createObjectURL(blob)
  const image = new Image()
  return await new Promise((resolve) => {
    image.setAttribute('crossOrigin', '')
    image.src = blobURL
    image.onload = () => {
      resolve(imageToColor(image))
    }
  })
}

/**
 * @public
 */
export function imageToColor (image: HTMLImageElement): { r: number, g: number, b: number } | undefined {
  const canvas = document.createElement('canvas')

  const height = (canvas.height = image.naturalHeight ?? image.offsetHeight ?? image.height)
  const width = (canvas.width = image.naturalWidth ?? image.offsetWidth ?? image.width)
  canvas.width = width
  canvas.height = height

  const blockSize = 5

  let r: number = 0
  let g: number = 0
  let b: number = 0
  let count = 0

  const context = canvas.getContext('2d')

  if (context != null) {
    context.drawImage(image, 0, 0, width, height)
    context.beginPath()
    context.arc(0, 0, 60, 0, Math.PI * 2, true)
    context.clip()
    context.fillRect(0, 0, width, height)

    const data = context?.getImageData(0, 0, width, height).data

    const length = data.length

    let i = 0
    while (i < length) {
      if (data[i] > 5 && data[i + 1] > 5 && data[i + 2] > 5 && data[i + 3] > 50) {
        ++count
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
      }
      i += blockSize * 4
    }

    r = Math.round(r / count)
    g = Math.round(g / count)
    b = Math.round(b / count)
    return { r, g, b }
  }
}

export function rgbToHsl (r: number, g: number, b: number): { h: number, s: number, l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h: number = 0
  let s: number
  const l = (max + min) / 2

  if (max === min) {
    h = s = 0 // achromatic
  } else {
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
    h /= 6
  }

  return { h, s, l }
}
