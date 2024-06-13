import {
  type Calendar,
  type Event,
  type ReccuringEvent,
  type ReccuringInstance,
  generateEventId
} from '@hcengineering/calendar'
import {
  type Doc,
  type IdMap,
  type Timestamp,
  getCurrentAccount,
  toIdMap,
  type DocumentUpdate
} from '@hcengineering/core'
import { createQuery, getClient } from '@hcengineering/presentation'
import { showPopup, closePopup, DAY } from '@hcengineering/ui'
import { writable } from 'svelte/store'
import calendar from './plugin'
import UpdateRecInstancePopup from './components/UpdateRecInstancePopup.svelte'

export function saveUTC (date: Timestamp): Timestamp {
  const utcdate = new Date(date)
  return Date.UTC(
    utcdate.getFullYear(),
    utcdate.getMonth(),
    utcdate.getDate(),
    utcdate.getHours(),
    utcdate.getMinutes(),
    utcdate.getSeconds(),
    utcdate.getMilliseconds()
  )
}

export function hidePrivateEvents (events: Event[], calendars: IdMap<Calendar>, allowMe: boolean = true): Event[] {
  const me = getCurrentAccount()._id
  const res: Event[] = []
  for (const event of events) {
    if ((event.createdBy ?? event.modifiedBy) === me && allowMe) {
      res.push(event)
    } else {
      if (event.visibility !== undefined) {
        if (event.visibility !== 'private') {
          res.push(event)
        }
      } else {
        const calendar = calendars.get(event.calendar)
        if (calendar != null && calendar.visibility !== 'private') {
          res.push(event)
        }
      }
    }
  }
  return res
}

export function isReadOnly (value: Event): boolean {
  const me = getCurrentAccount()._id
  if (value.createdBy !== me) return true
  if (['owner', 'writer'].includes(value.access)) return false
  return true
}

export function isVisible (value: Event, calendars: IdMap<Calendar>): boolean {
  const me = getCurrentAccount()._id
  if (value.createdBy === me) return true
  if (value.visibility === 'freeBusy') {
    return false
  } else if (value.visibility === 'public') {
    return true
  }
  const calendar = calendars.get(value.calendar)
  if (calendar == null) {
    return true
  } else {
    return calendar.visibility === 'public'
  }
}

export const calendarByIdStore = writable<IdMap<Calendar>>(new Map())
export const calendarStore = writable<Calendar[]>([])
export const visibleCalendarStore = writable<Calendar[]>([])

function fillStores (): void {
  const client = getClient()

  if (client !== undefined) {
    const query = createQuery(true)
    query.query(calendar.class.Calendar, {}, (res) => {
      calendarStore.set(res)
      visibleCalendarStore.set(res.filter((p) => !p.hidden))
      calendarByIdStore.set(toIdMap(res))
    })
  } else {
    setTimeout(() => {
      fillStores()
    }, 50)
  }
}

fillStores()

export async function updatePast (ops: DocumentUpdate<Event>, object: ReccuringInstance): Promise<void> {
  const client = getClient()
  const origin = await client.findOne(calendar.class.ReccuringEvent, {
    eventId: object.recurringEventId,
    calendar: object.calendar
  })
  if (origin !== undefined) {
    await client.addCollection(
      calendar.class.ReccuringEvent,
      origin.space,
      origin.attachedTo,
      origin.attachedToClass,
      origin.collection,
      {
        ...origin,
        date: object.date,
        dueDate: object.dueDate,
        ...ops,
        eventId: generateEventId()
      }
    )
    const targetDate = ops.date ?? object.date
    await client.update(origin, {
      rules: [{ ...origin.rules[0], endDate: targetDate - DAY }],
      rdate: origin.rdate.filter((p) => p < targetDate)
    })
    const instances = await client.findAll(calendar.class.ReccuringInstance, {
      recurringEventId: origin.eventId,
      date: { $gte: targetDate }
    })
    for (const instance of instances) {
      await client.remove(instance)
    }
  }
}

export async function updateReccuringInstance (
  ops: DocumentUpdate<ReccuringEvent>,
  object: ReccuringInstance
): Promise<boolean> {
  const client = getClient()
  if (object.virtual !== true) {
    await client.update(object, ops)
    return true
  } else {
    return await new Promise((resolve) => {
      showPopup(UpdateRecInstancePopup, { currentAvailable: ops.rules === undefined }, undefined, async (res) => {
        if (res !== null) {
          try {
            if (res.mode === 'current') {
              await client.addCollection<Doc, ReccuringInstance>(
                object._class,
                object.space,
                object.attachedTo,
                object.attachedToClass,
                object.collection,
                {
                  title: object.title,
                  description: object.description,
                  date: object.date,
                  dueDate: object.dueDate,
                  allDay: object.allDay,
                  participants: object.participants,
                  externalParticipants: object.externalParticipants,
                  originalStartTime: object.originalStartTime,
                  recurringEventId: object.recurringEventId,
                  reminders: object.reminders,
                  location: object.location,
                  eventId: object.eventId,
                  calendar: object.calendar,
                  access: 'owner',
                  rules: object.rules,
                  exdate: object.exdate,
                  rdate: object.rdate,
                  timeZone: object.timeZone,
                  ...ops
                },
                object._id
              )
              resolve(true)
            } else if (res.mode === 'all') {
              const base = await client.findOne(calendar.class.ReccuringEvent, {
                calendar: object.calendar,
                eventId: object.recurringEventId
              })
              if (base !== undefined) {
                if (ops.date !== undefined) {
                  const diff = object.date - ops.date
                  ops.date = base.date - diff
                }
                if (ops.dueDate !== undefined) {
                  const diff = object.dueDate - ops.dueDate
                  ops.dueDate = base.dueDate - diff
                }
                await client.update(base, ops)
                resolve(true)
              }
              resolve(false)
            } else if (res.mode === 'next') {
              await updatePast(ops, object)
              resolve(true)
            }
            resolve(false)
          } catch {
            resolve(false)
          }
        } else {
          resolve(false)
        }
        closePopup()
      })
    })
  }
}
