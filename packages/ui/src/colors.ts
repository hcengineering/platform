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
