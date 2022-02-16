
const blackColors = Object.freeze([
  '#A5D179',
  '#77C07B',
  '#60B96E',
  '#45AEA3',
  '#46CBDE',
  '#47BDF6',
  '#5AADF6',
  '#73A6CD',
  '#B977CB',
  '#7C6FCD',
  '#6F7BC5',
  '#F28469'
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
  return str.split('').reduce((prevHash, currVal) =>
    (((prevHash << 5) - prevHash) + currVal.charCodeAt(0)) | 0, 0)
}

/**
 * @public
 */
export function getColorNumberByText (str: string): number {
  return hashCode(str)
}
