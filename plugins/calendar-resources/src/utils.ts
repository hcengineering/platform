import { Calendar, Event } from '@hcengineering/calendar'
import { IdMap, Timestamp, getCurrentAccount, toIdMap } from '@hcengineering/core'
import { createQuery, getClient } from '@hcengineering/presentation'
import { writable } from 'svelte/store'
import calendar from './plugin'

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

export function hidePrivateEvents (events: Event[], calendars: IdMap<Calendar>): Event[] {
  const me = getCurrentAccount()._id
  const res: Event[] = []
  for (const event of events) {
    if ((event.createdBy ?? event.modifiedBy) === me) {
      res.push(event)
    } else {
      if (event.visibility !== undefined) {
        if (event.visibility !== 'private') {
          res.push(event)
        }
      } else {
        const space = calendars.get(event.space)
        if (space != null && space.visibility !== 'private') {
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
  }
  const space = calendars.get(value.space)
  if (space == null) {
    return true
  } else {
    return space.visibility === 'public'
  }
}

export const calendarStore = writable<IdMap<Calendar>>(new Map())

function fillStores (): void {
  const client = getClient()

  if (client !== undefined) {
    const query = createQuery(true)
    query.query(calendar.class.Calendar, {}, (res) => {
      calendarStore.set(toIdMap(res))
    })
  } else {
    setTimeout(() => fillStores(), 50)
  }
}

fillStores()
