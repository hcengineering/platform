import { type DefSeparators } from '@hcengineering/ui'
import { type RoomLanguage } from '@hcengineering/love'

export interface ResizeInitParams {
  x: number
  y: number
  width: number
  height: number
}

export interface FloorSize {
  cols: number
  rows: number
  width: number
  height: number
  cellSize: number
  cellTop: number
  cellRound: number
}
export interface RoomSide {
  top: boolean
  bottom: boolean
  left: boolean
  right: boolean
}

export interface Slot {
  _id: string
  width: number
  height: number
  x: number
  y: number
}

export interface RGBAColor {
  r: number
  g: number
  b: number
  a: number
}
export const shadowNormal: RGBAColor = { r: 81, g: 144, b: 236, a: 1 }
export const shadowError: RGBAColor = { r: 249, g: 110, b: 80, a: 1 }

export const loveSeparators: DefSeparators = [{ minSize: 17.5, size: 25, maxSize: 30, float: 'navigator' }, null]

export const languagesDisplayData: {
  [key in RoomLanguage]: { emoji: string, label: string }
} = {
  bg: { emoji: '🇧🇬', label: 'Български' },
  ca: { emoji: '🇨🇦', label: 'Català' },
  zh: { emoji: '🇨🇳', label: '简体中文' },
  'zh-TW': { emoji: '🇹🇼', label: '繁體中文' },
  'zh-HK': { emoji: '🇭🇰', label: '繁體中文 (香港)' },
  cs: { emoji: '🇨🇿', label: 'Čeština' },
  da: { emoji: '🇩🇰', label: 'Dansk' },
  nl: { emoji: '🇳🇱', label: 'Nederlands' },
  en: { emoji: '🇺🇸', label: 'English' },
  'en-US': { emoji: '🇺🇸', label: 'English (US)' },
  'en-AU': { emoji: '🇦🇺', label: 'English (Australia)' },
  'en-GB': { emoji: '🇬🇧', label: 'English (UK)' },
  'en-NZ': { emoji: '🇳🇿', label: 'English (New Zealand)' },
  'en-IN': { emoji: '🇮🇳', label: 'English (India)' },
  et: { emoji: '🇪🇪', label: 'Eesti' },
  fi: { emoji: '🇫🇮', label: 'Suomi' },
  'nl-BE': { emoji: '🇧🇪', label: 'Vlaams' },
  fr: { emoji: '🇫🇷', label: 'Français' },
  'fr-CA': { emoji: '🇨🇦', label: 'Français (Canada)' },
  de: { emoji: '🇩🇪', label: 'Deutsch' },
  'de-CH': { emoji: '🇨🇭', label: 'Schweizerdeutsch' },
  el: { emoji: '🇬🇷', label: 'Ελληνικά' },
  hi: { emoji: '🇮🇳', label: 'हिन्दी' },
  hu: { emoji: '🇭🇺', label: 'Magyar' },
  id: { emoji: '🇮🇩', label: 'Bahasa Indonesia' },
  it: { emoji: '🇮🇹', label: 'Italiano' },
  ja: { emoji: '🇯🇵', label: '日本語' },
  ko: { emoji: '🇰🇷', label: '한국어' },
  lv: { emoji: '🇱🇻', label: 'Latviešu' },
  lt: { emoji: '🇱🇹', label: 'Lietuvių' },
  ms: { emoji: '🇲🇾', label: 'Bahasa Melayu' },
  no: { emoji: '🇳🇴', label: 'Norsk' },
  pl: { emoji: '🇵🇱', label: 'Polski' },
  pt: { emoji: '🇵🇹', label: 'Português' },
  'pt-BR': { emoji: '🇧🇷', label: 'Português (Brasil)' },
  'pt-PT': { emoji: '🇵🇹', label: 'Português (Portugal)' },
  ro: { emoji: '🇷🇴', label: 'Română' },
  ru: { emoji: '🇷🇺', label: 'Русский' },
  sk: { emoji: '🇸🇰', label: 'Slovenčina' },
  es: { emoji: '🇪🇸', label: 'Español' },
  'es-419': { emoji: '🇲🇽', label: 'Español (Latinoamérica)' },
  sv: { emoji: '🇸🇪', label: 'Svenska' },
  th: { emoji: '🇹🇭', label: 'ไทย' },
  tr: { emoji: '🇹🇷', label: 'Türkçe' },
  uk: { emoji: '🇺🇦', label: 'Українська' },
  vi: { emoji: '🇻🇳', label: 'Tiếng Việt' }
}
