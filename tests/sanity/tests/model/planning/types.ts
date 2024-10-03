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
  dateStart: string | TDate
  timeStart: string
  dateEnd: TDate
  timeEnd: string
}

export interface TDate {
  day: string
  month: string
  year: string
}
