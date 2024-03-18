export interface NewToDo {
  title: string
  description?: string
  duedate?: string
  priority?: string
  visible?: string
  createLabel?: boolean
  labels?: string
  slots?: Slot[]
}

export interface Slot {
  dateStart: string
  timeStart: string
  dateEnd: Date
  timeEnd: string
}

export interface Date {
  day: string
  month: string
  year: string
}
