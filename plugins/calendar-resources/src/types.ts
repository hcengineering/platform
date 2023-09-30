import { Timestamp } from '@hcengineering/core'

export interface CalendarElement {
  id: string
  date: Timestamp
  dueDate: Timestamp
  cols: number
}

export interface CalendarElementRect {
  top: number
  bottom: number
  left: number
  right: number
  width: number
  height: number
  fit: boolean
  visibility: number
}

export interface CalendarColumn {
  elements: CalendarElement[]
}

export interface CalendarGrid {
  columns: CalendarColumn[]
}

export interface CalendarADGrid {
  alldays: Array<string | null>
}

export interface CalendarADRows {
  id: string
  row: number
  startCol: number
  endCol: number
}

export interface CalendarCell {
  day: Date
  hourOfDay: number
  minutes: number
}
