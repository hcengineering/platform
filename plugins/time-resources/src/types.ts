import type { WorkSlot, ToDo } from '@hcengineering/time'
import type { IntlString } from '@hcengineering/platform'
import type { Person } from '@hcengineering/contact'
import type { Event } from '@hcengineering/calendar'
import type { Ref } from '@hcengineering/core'
import { ToDoPriority } from '@hcengineering/time'
import time from './plugin'

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

interface ToDoPrioritiesItem {
  label: IntlString
  shortLabel: IntlString
  name: string
}

export const defaultToDoPriorities = [
  ToDoPriority.NoPriority,
  ToDoPriority.Low,
  ToDoPriority.Medium,
  ToDoPriority.High,
  ToDoPriority.Urgent
]

export const todoPriorities: Record<number, ToDoPrioritiesItem> = {
  [ToDoPriority.NoPriority]: {
    label: time.string.NoPriority,
    shortLabel: time.string.NoPriority,
    name: 'no-priority'
  },
  [ToDoPriority.Low]: {
    label: time.string.LowPriority,
    shortLabel: time.string.Low,
    name: 'low'
  },
  [ToDoPriority.Medium]: {
    label: time.string.MediumPriority,
    shortLabel: time.string.Medium,
    name: 'medium'
  },
  [ToDoPriority.High]: {
    label: time.string.HighPriority,
    shortLabel: time.string.High,
    name: 'high'
  },
  [ToDoPriority.Urgent]: {
    label: time.string.UrgentPriority,
    shortLabel: time.string.Urgent,
    name: 'urgent'
  }
}

/**
 * @public
 */
export function getToDoPriorityColor (priority: ToDoPriority): string {
  return `var(--global-${todoPriorities[priority].name}-PriorityColor)`
}
