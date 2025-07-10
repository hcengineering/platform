import { getCurrentAccount, type Client, type Ref } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import type { ToDo, WorkSlot } from '@hcengineering/time'
import time from '@hcengineering/time'
import type { DefSeparators } from '@hcengineering/ui'

import calendarPlugin, { AccessLevel, getPrimaryCalendar, type Calendar } from '@hcengineering/calendar'

export * from './types'

export function getNearest (events: WorkSlot[]): WorkSlot | undefined {
  const now = Date.now()
  events.sort((a, b) => a.date - b.date)
  return (
    events.find((event) => event.date <= now && event.dueDate >= now) ??
    events.find((event) => event.date >= now) ??
    events[events.length - 1]
  )
}

/**
 * @public
 */
export const timeSeparators: DefSeparators = [
  { minSize: 18, size: 18, maxSize: 22.5, float: 'navigator' },
  null,
  { minSize: 25, size: 41.25, maxSize: 90 }
]

/**
 * @public
 */
export const teamSeparators: DefSeparators = [{ minSize: 12.5, size: 17.5, maxSize: 22.5, float: 'navigator' }, null]

export async function ToDoTitleProvider (client: Client, ref: Ref<ToDo>, doc?: ToDo): Promise<string> {
  const object = doc ?? (await client.findOne(time.class.ToDo, { _id: ref }))

  if (object === undefined) return ''

  return object.title
}

export function calculateEventsDuration (events: WorkSlot[]): number {
  const points = events.flatMap((event) => [
    { time: event.date, type: 'start' },
    { time: event.dueDate, type: 'end' }
  ])

  points.sort((a, b) => a.time - b.time)

  let activeEvents = 0
  let duration = 0
  let lastTime = 0

  points.forEach((point) => {
    if (activeEvents > 0) {
      duration += point.time - lastTime
    }
    activeEvents += point.type === 'start' ? 1 : -1
    lastTime = point.time
  })

  return duration
}

export async function findPrimaryCalendar (): Promise<Ref<Calendar>> {
  const acc = getCurrentAccount()
  const primary = acc.primarySocialId
  const client = getClient()
  const calendars = await client.findAll(calendarPlugin.class.Calendar, {
    user: primary,
    hidden: false,
    access: { $in: [AccessLevel.Owner, AccessLevel.Writer] }
  })
  const preference = await client.findOne(calendarPlugin.class.PrimaryCalendar, {})
  return getPrimaryCalendar(calendars, preference, acc.uuid)
}
