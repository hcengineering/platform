/**
 * @public
 */
export interface RGBColor {
  r: number
  g: number
  b: number
}
/**
 * @public
 */
export interface ColorDefinition {
  name: string
  color: string
  icon?: string
  title?: string
  number?: string
  background?: string
}

const define = (
  name: string,
  color: string,
  icon: string,
  title: string,
  number: string,
  background: string,
  percents: number[],
  dark: boolean = false
): ColorDefinition => {
  return {
    name,
    color: defineAlpha(dark, color),
    icon: defineAlpha(dark, icon),
    title: defineAlpha(dark, title),
    number: defineAlpha(dark, number, percents[0]),
    background:
      percents.length > 2
        ? `linear-gradient(90deg, ${defineAlpha(dark, color, percents[1])}, ${defineAlpha(dark, color, percents[2])})`
        : defineAlpha(dark, color, percents[1])
  }
}

const defineAvatarColor = (
  name: string,
  h: number,
  s: number,
  l: number,
  gradient: number[],
  dark: boolean = false
): ColorDefinition => {
  const background = rgbToHex(hslToRgb(h / 360, s / 100, l / 100))
  const icon = rgbToHex(hslToRgb(h / 360, s / 100, l / (dark ? 100 : 50)))
  return {
    name,
    color: background,
    icon,
    title: undefined,
    number: undefined,
    background:
      gradient.length === 1
        ? defineAlpha(dark, background)
        : `linear-gradient(90deg, ${gradient.map((it) => defineAlpha(dark, background, it)).join(',')})`
  }
}

/**
 * @public
 */
export enum PaletteColorIndexes {
  Firework,
  Watermelon,
  Pink,
  Fuschia,
  Lavander,
  Mauve,
  Heather,
  Orchid,
  Blueberry,
  Arctic,
  Sky,
  Cerulean,
  Waterway,
  Ocean,
  Turquoise,
  Houseplant,
  Crocodile,
  Grass,
  Sunshine,
  Orange,
  Pumpkin,
  Cloud,
  Coin,
  Porpoise
}

/**
 * @public
 */
export const whitePalette = Object.freeze<ColorDefinition[]>([
  define('Firework', 'D15045', 'D15045', 'C03B2F', 'C03B2F', 'C03B2F', [60, 20]),
  define('Watermelon', 'DB877D', 'DB877D', 'D2685B', 'D2685B', 'D2685B', [60, 20]),
  define('Pink', 'EF86AA', 'EF86AA', 'E9588A', 'E9588A', 'E9588A', [60, 20]),
  define('Fuschia', 'EB5181', 'EB5181', 'E62360', 'E62360', 'E62360', [60, 20]),
  define('Lavander', 'DC85F5', 'DC85F5', 'CE55F1', 'CE55F1', 'CE55F1', [60, 20]),
  define('Mauve', '925CB1', '925CB1', '784794', '784794', '784794', [60, 20]),
  define('Heather', '7B86C6', '7B86C6', '5866B7', '5866B7', '5866B7', [60, 20]),
  define('Orchid', '8458E3', '8458E3', '6A3ACF', '6A3ACF', '6A3ACF', [60, 20]),
  define('Blueberry', '6260C2', '6260C2', '4542AD', '4542AD', '4542AD', [60, 20]),
  define('Arctic', '8BB0F9', '8BB0F9', '5A8FF6', '5A8FF6', '5A8FF6', [60, 20]),
  define('Sky', '4CA6EE', '4CA6EE', '1F90EA', '1F90EA', '1F90EA', [60, 20]),
  define('Cerulean', '5195D7', '5195D7', '2E7CC7', '2E7CC7', '2E7CC7', [60, 20]),
  define('Waterway', '1467B3', '1467B3', '0F4C85', '0F4C85', '0F4C85', [60, 20]),
  define('Ocean', '167B82', '167B82', '0F5357', '0F5357', '0F5357', [60, 20]),
  define('Turquoise', '58B99D', '58B99D', '429E84', '429E84', '429E84', [60, 20]),
  define('Houseplant', '46A44F', '46A44F', '37813E', '37813E', '37813E', [60, 20]),
  define('Crocodile', '709A3F', '709A3F', '577731', '577731', '577731', [60, 20]),
  define('Grass', '83AF12', '83AF12', '719C40', '60810E', '60810E', [60, 20]),
  define('Sunshine', 'D29840', 'D29840', 'C1811F', 'C1811F', 'C1811F', [60, 20]),
  define('Orange', 'D27540', 'D27540', 'B65D2B', 'B65D2B', 'B65D2B', [60, 20]),
  define('Pumpkin', 'BF5C24', 'BF5C24', '96481C', '96481C', '96481C', [60, 20]),
  define('Cloud', 'A1A1A1', 'A1A1A1', '878787', '878787', '878787', [60, 20]),
  define('Coin', '939395', '939395', '79797C', '79797C', '79797C', [60, 20]),
  define('Porpoise', '758595', '758595', '5D6B79', '5D6B79', '5D6B79', [60, 20])
])

/**
 * @public
 */
export const darkPalette = Object.freeze<ColorDefinition[]>([
  define('Firework', 'D15045', 'D15045', 'FFFFFF', 'FFFFFF', 'C03B2F', [60, 15, 0], true),
  define('Watermelon', 'DB877D', 'DB877D', 'FFFFFF', 'FFFFFF', 'D2685B', [60, 15, 0], true),
  define('Pink', 'EF86AA', 'EF86AA', 'FFFFFF', 'FFFFFF', 'E9588A', [60, 15, 0], true),
  define('Fuschia', 'EB5181', 'EB5181', 'FFFFFF', 'FFFFFF', 'E62360', [60, 15, 0], true),
  define('Lavander', 'DC85F5', 'DC85F5', 'FFFFFF', 'FFFFFF', 'CE55F1', [60, 15, 0], true),
  define('Mauve', '925CB1', '925CB1', 'FFFFFF', 'FFFFFF', '784794', [60, 15, 0], true),
  define('Heather', '7B86C6', '7B86C6', 'FFFFFF', 'FFFFFF', '5866B7', [60, 15, 0], true),
  define('Orchid', '8862D9', '8862D9', 'FFFFFF', 'FFFFFF', '6A3ACF', [60, 15, 0], true),
  define('Blueberry', '6260C2', '6260C2', 'FFFFFF', 'FFFFFF', '4542AD', [60, 15, 0], true),
  define('Arctic', '8BB0F9', '8BB0F9', 'FFFFFF', 'FFFFFF', '5A8FF6', [60, 15, 0], true),
  define('Sky', '4CA6EE', '4CA6EE', 'FFFFFF', 'FFFFFF', '1F90EA', [60, 15, 0], true),
  define('Cerulean', '5195D7', '5195D7', 'FFFFFF', 'FFFFFF', '2E7CC7', [60, 15, 0], true),
  define('Waterway', '1467B3', '1467B3', 'FFFFFF', 'FFFFFF', '0F4C85', [60, 15, 0], true),
  define('Ocean', '167B82', '167B82', 'FFFFFF', 'FFFFFF', '0F5357', [60, 15, 0], true),
  define('Turquoise', '58B99D', '58B99D', 'FFFFFF', 'FFFFFF', '429E84', [60, 15, 0], true),
  define('Houseplant', '46A44F', '46A44F', 'FFFFFF', 'FFFFFF', '37813E', [60, 15, 0], true),
  define('Crocodile', '709A3F', '709A3F', 'FFFFFF', 'FFFFFF', '577731', [60, 15, 0], true),
  define('Grass', '83AF12', '83AF12', 'FFFFFF', 'FFFFFF', '83AF12', [60, 15, 0], true),
  define('Sunshine', 'D29840', 'D29840', 'FFFFFF', 'FFFFFF', 'B67E2B', [60, 15, 0], true),
  define('Orange', 'D27540', 'D27540', 'FFFFFF', 'FFFFFF', 'B65D2B', [60, 15, 0], true),
  define('Pumpkin', 'BF5C24', 'BF5C24', 'FFFFFF', 'FFFFFF', '96481C', [60, 15, 0], true),
  define('Cloud', 'A1A1A1', 'A1A1A1', 'FFFFFF', 'FFFFFF', '878787', [60, 15, 0], true),
  define('Coin', '939395', '939395', 'FFFFFF', 'FFFFFF', '79797C', [60, 15, 0], true),
  define('Porpoise', '758595', '758595', 'FFFFFF', 'FFFFFF', '5D6B79', [60, 15, 0], true)
])

export const avatarWhiteColors = Object.freeze<ColorDefinition[]>([
  defineAvatarColor('Unassigned', 0, 0, 91, [20]),
  defineAvatarColor('Magic', 235, 14, 89, [20]),
  defineAvatarColor('Waterlily', 222, 16, 87, [20]),
  defineAvatarColor('Light', 216, 16, 87, [20]),
  defineAvatarColor('Aqua', 200, 8, 85, [20]),
  defineAvatarColor('Turtle', 192, 14, 85, [20]),
  defineAvatarColor('Ocean', 186, 13, 85, [20]),
  defineAvatarColor('Heather', 153, 11, 86, [20]),
  defineAvatarColor('Juice', 108, 10, 90, [20]),
  defineAvatarColor('Lime', 70, 9, 87, [20]),
  defineAvatarColor('Warmth', 45, 13, 88, [20]),
  defineAvatarColor('Desert', 30, 14, 89, [20]),
  defineAvatarColor('Sand', 25, 14, 89, [20]),
  defineAvatarColor('Rust', 23, 12, 87, [20]),
  defineAvatarColor('Magnolia', 334, 11, 88, [20]),
  defineAvatarColor('Blossom', 300, 14, 89, [20]),
  defineAvatarColor('Unicorn', 274, 11, 88, [20]),
  defineAvatarColor('Violet', 252, 16, 87, [20]),
  defineAvatarColor('Happy', 232, 16, 87, [20]),
  defineAvatarColor('Blueish', 222, 13, 85, [20]),
  defineAvatarColor('Baby blue', 210, 12, 87, [20]),
  defineAvatarColor('Grey 3', 213, 9, 81, [20]),
  defineAvatarColor('Grey 2', 210, 10, 84, [20]),
  defineAvatarColor('Grey 1', 210, 11, 89, [20])
])

export const avatarDarkColors = Object.freeze<ColorDefinition[]>([
  defineAvatarColor('Unassigned', 0, 0, 91, [20, 0, 0], true),
  defineAvatarColor('Magic', 235, 14 + 50, 89 - 20, [20, 2, 0], true),
  defineAvatarColor('Waterlily', 222, 16 + 50, 87 - 20, [20, 2, 0], true),
  defineAvatarColor('Light', 216, 16 + 50, 87 - 20, [20, 2, 0], true),
  defineAvatarColor('Aqua', 200, 8 + 50, 85 - 20, [20, 2, 0], true),
  defineAvatarColor('Turtle', 192, 14 + 50, 85 - 20, [20, 2, 0], true),
  defineAvatarColor('Ocean', 186, 13 + 50, 85 - 20, [20, 2, 0], true),
  defineAvatarColor('Heather', 153, 11 + 50, 86 - 20, [20, 2, 0], true),
  defineAvatarColor('Juice', 108, 10 + 50, 90 - 20, [20, 2, 0], true),
  defineAvatarColor('Lime', 70, 9 + 50, 87 - 20, [20, 2, 0], true),
  defineAvatarColor('Warmth', 45, 13 + 50, 88 - 20, [20, 2, 0], true),
  defineAvatarColor('Desert', 30, 14 + 50, 89 - 20, [20, 2, 0], true),
  defineAvatarColor('Sand', 25, 14 + 50, 89 - 20, [20, 2, 0], true),
  defineAvatarColor('Rust', 23, 12 + 50, 87 - 20, [20, 2, 0], true),
  defineAvatarColor('Magnolia', 334, 11 + 50, 88 - 20, [20, 2, 0], true),
  defineAvatarColor('Blossom', 300, 14 + 50, 89 - 20, [20, 2, 0], true),
  defineAvatarColor('Unicorn', 274, 11 + 50, 88 - 20, [20, 2, 0], true),
  defineAvatarColor('Violet', 252, 16 + 50, 87 - 20, [20, 2, 0], true),
  defineAvatarColor('Happy', 232, 16 + 50, 87 - 20, [20, 2, 0], true),
  defineAvatarColor('Blueish', 222, 13 + 50, 85 - 20, [20, 2, 0], true),
  defineAvatarColor('Baby blue', 210, 12 + 50, 87 - 20, [20, 2, 0], true),
  defineAvatarColor('Grey 3', 213, 9, 81, [20, 2, 0], true),
  defineAvatarColor('Grey 2', 210, 10, 84, [20, 2, 0], true),
  defineAvatarColor('Grey 1', 210, 11, 89, [20, 2, 0], true)
])

export function defaultBackground (dark: boolean): string {
  return dark ? 'linear-gradient(90deg, #262634, #1A1A28)' : '#FFFFFF'
}

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

/**
 * @public
 */
export function getPlatformColor (hash: number, darkTheme: boolean): string {
  const palette = darkTheme ? darkPalette : whitePalette
  return (palette[Math.abs(hash) % palette.length] ?? palette[0]).color
}

/**
 * @public
 */
export function getPlatformColorDef (hash: number, darkTheme: boolean): ColorDefinition {
  const palette = darkTheme ? darkPalette : whitePalette
  return palette[Math.abs(hash) % palette.length] ?? palette[0]
}

/**
 * @public
 */
export function getPlatformAvatarColorDef (hash: number, darkTheme: boolean): ColorDefinition {
  const palette = darkTheme ? avatarDarkColors : avatarWhiteColors
  return palette[Math.abs(hash) % palette.length] ?? palette[0]
}

/**
 * @public
 */
export function getPlatformAvatarColorForTextDef (text: string, darkTheme: boolean): ColorDefinition {
  return getPlatformAvatarColorDef(hashCode(text), darkTheme)
}

/**
 * @public
 */
export function getPlatformAvatarColorByName (name: string, darkTheme: boolean): ColorDefinition {
  const palette = darkTheme ? avatarDarkColors : avatarWhiteColors
  return palette.find((col) => col.name === name) ?? palette[0]
}

/**
 * @public
 */
export function getPlatformAvatarColors (darkTheme: boolean): readonly ColorDefinition[] {
  return darkTheme ? avatarDarkColors : avatarWhiteColors
}

/**
 * @public
 */
export function getPlatformColorForText (text: string, darkTheme: boolean): string {
  return getPlatformColor(hashCode(text), darkTheme)
}
/**
 * @public
 */
export function getPlatformColorForTextDef (text: string, darkTheme: boolean): ColorDefinition {
  return getPlatformColorDef(hashCode(text), darkTheme)
}

/**
 * @public
 */
export function getPlatformColors (darkTheme: boolean): readonly ColorDefinition[] {
  return darkTheme ? darkPalette : whitePalette
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
export function hexToRgb (color: string): RGBColor {
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
  color = color.toLowerCase()
  return {
    r: parseInt(color.slice(0, 2), 16),
    g: parseInt(color.slice(2, 4), 16),
    b: parseInt(color.slice(4, 6), 16)
  }
}

/**
 * @public
 */
export function hexHSLToRgb (color: string, percent = 100): RGBColor {
  const h = parseInt(color.slice(0, 2), 16)
  const s = parseInt(color.slice(2, 4), 16)
  const l = parseInt(color.slice(4, 6), 16)
  return hslToRgb(h, s, (l / 100) * percent)
}

function addZero (d: string): string {
  if (d.length < 2) {
    return '0' + d
  }
  return d
}

/**
 * @public
 */
export function defineAlpha (dark: boolean, color: string, percent = 100): string {
  let rgb = color
  if (!rgb.startsWith('#')) {
    rgb = '#' + rgb
  }
  if (percent === 100) {
    return rgb
  }
  const { r, g, b } = hexToRgb(rgb)

  const p1 = percent / 100

  const bg = dark ? hexToRgb('#1A1A28') : hexToRgb('#F1F1F4')

  return rgbToHex({
    r: r * p1 + bg.r * (1 - p1),
    g: g * p1 + bg.g * (1 - p1),
    b: b * p1 + bg.b * (1 - p1)
  })
  // return rgb + addZero(Math.round((percent / 100) * 255).toString(16))
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
export function hslToRgb (h: number, s: number, l: number): RGBColor {
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
export function rgbToHex (color: RGBColor): string {
  return (
    '#' +
    addZero((Math.round(color.r) % 255).toString(16)) +
    addZero((Math.round(color.g) % 255).toString(16)) +
    addZero((Math.round(color.b) % 255).toString(16))
  )
}

export async function svgToColor (img: SVGSVGElement): Promise<RGBColor | undefined> {
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
export function imageToColor (image: HTMLImageElement): RGBColor | undefined {
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
