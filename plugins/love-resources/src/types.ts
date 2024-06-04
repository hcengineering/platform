import { type DefSeparators } from '@hcengineering/ui'

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
