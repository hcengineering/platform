import { type Event } from '@hcengineering/calendar'
import { type Person } from '@hcengineering/contact'
import { type Ref } from '@hcengineering/core'
import { type ToDo, type WorkSlot } from '@hcengineering/time'

/**
 * @public
 */
export interface WorkSlotMapping {
  slots: Array<WorkSlot & { overlap?: number }>
  todo?: ToDo
  user: Ref<Person>
  total: number
}

/**
 * @public
 */
export interface EventPersonMapping {
  user: Ref<Person>
  mappings: WorkSlotMapping[]
  busy: WorkSlotMapping
  busyTotal: number
  busyEvents: Event[]
  events: Array<Event & { overlap?: number }>
  total: number
}
