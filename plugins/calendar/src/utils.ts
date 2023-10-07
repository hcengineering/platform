import { Timestamp, generateId } from '@hcengineering/core'
import calendar, { Event, ReccuringEvent, ReccuringInstance, RecurringRule } from '.'

function getInstance (event: ReccuringEvent, date: Timestamp): ReccuringInstance {
  const diff = event.dueDate - event.date
  return {
    ...event,
    recurringEventId: event.eventId,
    date,
    dueDate: date + diff,
    originalStartTime: date,
    _class: calendar.class.ReccuringInstance,
    eventId: generateEventId(),
    _id: generateId(),
    virtual: true
  }
}

function generateRecurringValues (
  rule: RecurringRule,
  startDate: Timestamp,
  from: Timestamp,
  to: Timestamp
): Timestamp[] {
  const values: Timestamp[] = []
  const currentDate = new Date(startDate)
  switch (rule.freq) {
    case 'DAILY':
      generateDailyValues(rule, currentDate, values, from, to)
      break
    case 'WEEKLY':
      generateWeeklyValues(rule, currentDate, values, from, to)
      break
    case 'MONTHLY':
      generateMonthlyValues(rule, currentDate, values, from, to)
      break
    case 'YEARLY':
      generateYearlyValues(rule, currentDate, values, from, to)
      break
    default:
      throw new Error('Invalid recurring rule frequency')
  }
  return values
}

function generateDailyValues (
  rule: RecurringRule,
  currentDate: Date,
  values: Timestamp[],
  from: Timestamp,
  to: Timestamp
): void {
  const { count, endDate, interval } = rule
  const { bySetPos } = rule
  let i = 0

  while (true) {
    if (bySetPos == null || bySetPos.includes(getSetPos(currentDate))) {
      const res = currentDate.getTime()
      if (res > from) {
        values.push(res)
      }
      i++
    }

    currentDate.setDate(currentDate.getDate() + (interval ?? 1))
    if (count !== undefined && i === count) break
    if (endDate != null && currentDate.getTime() > endDate) break
    if (currentDate.getTime() > to) break
  }
}

function generateWeeklyValues (
  rule: RecurringRule,
  currentDate: Date,
  values: Timestamp[],
  from: Timestamp,
  to: Timestamp
): void {
  const { count, endDate, interval } = rule
  let { byDay, bySetPos } = rule
  let i = 0

  if (byDay === undefined) {
    byDay = [getWeekday(currentDate)]
  }

  while (true) {
    const next = new Date(currentDate).setDate(currentDate.getDate() + (interval ?? 1) * 7)
    const end = new Date(new Date(currentDate).setDate(currentDate.getDate() + 7))
    let date = currentDate
    while (date < end) {
      if ((byDay == null || matchesByDay(date, byDay)) && (bySetPos == null || bySetPos.includes(getSetPos(date)))) {
        const res = date.getTime()
        if (res > from) {
          values.push(res)
        }
        i++
      }
      date = new Date(date.setDate(date.getDate() + 1))
      if (count !== undefined && i === count) return
      if (endDate != null && date.getTime() > endDate) return
      if (date.getTime() > to) return
    }

    currentDate = new Date(next)
  }
}

function matchesByDay (date: Date, byDay: string[]): boolean {
  const weekday = getWeekday(date)
  const dayOfMonth = Math.floor((date.getDate() - 1) / 7) + 1

  for (const byDayItem of byDay) {
    if (byDayItem === weekday) {
      return true
    }

    const pos = parseInt(byDayItem)
    if (isNaN(pos)) continue

    if (pos > 0 && dayOfMonth === pos) {
      return true
    }

    if (pos < 0 && dayOfMonth === getNegativePosition(date, weekday, pos)) {
      return true
    }
  }

  return false
}

function getNegativePosition (date: Date, weekday: string, pos: number): number | undefined {
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const occurrences = []
  for (let day = lastDayOfMonth; day >= 1; day--) {
    const tempDate = new Date(date.getFullYear(), date.getMonth(), day)
    if (getWeekday(tempDate) === weekday) {
      occurrences.push(day)
    }
    if (occurrences.length === Math.abs(pos)) {
      return occurrences.pop()
    }
  }
  throw new Error(`Unable to calculate negative position ${pos}`)
}

function generateMonthlyValues (
  rule: RecurringRule,
  currentDate: Date,
  values: Timestamp[],
  from: Timestamp,
  to: Timestamp
): void {
  const { count, endDate, interval } = rule
  let { byDay, byMonthDay, bySetPos } = rule
  let i = 0

  if (byDay == null && byMonthDay == null) {
    byMonthDay = [currentDate.getDate()]
  }

  while (true) {
    const next = new Date(currentDate).setMonth(currentDate.getMonth() + (interval ?? 1))
    const end = new Date(new Date(currentDate).setMonth(currentDate.getMonth() + 1))
    let date = currentDate
    while (date < end) {
      if (
        (byDay == null || matchesByDay(date, byDay)) &&
        (byMonthDay == null || byMonthDay.includes(new Date(currentDate).getDate())) &&
        (bySetPos == null || bySetPos.includes(getSetPos(currentDate)))
      ) {
        const res = currentDate.getTime()
        if (res > from) {
          values.push(res)
        }
        i++
      }
      date = new Date(date.setDate(date.getDate() + 1))

      if (count !== undefined && i === count) return
      if (endDate != null && date.getTime() > endDate) return
      if (date.getTime() > to) return
    }
    currentDate = new Date(next)
  }
}

function generateYearlyValues (
  rule: RecurringRule,
  currentDate: Date,
  values: Timestamp[],
  from: Timestamp,
  to: Timestamp
): void {
  const { count, endDate, interval } = rule
  const { byDay, byMonthDay, byYearDay, byWeekNo, byMonth, bySetPos } = rule
  let i = 0

  while (true) {
    const next = new Date(currentDate).setFullYear(currentDate.getFullYear() + (interval ?? 1))
    const end = new Date(new Date(currentDate).setFullYear(currentDate.getFullYear() + 1))
    let date = currentDate
    while (date < end) {
      if (
        (byDay == null || matchesByDay(date, byDay)) &&
        (byMonthDay == null || byMonthDay.includes(currentDate.getDate())) &&
        (byYearDay == null || byYearDay.includes(getYearDay(currentDate))) &&
        (byWeekNo == null || byWeekNo.includes(getWeekNumber(currentDate))) &&
        (byMonth == null || byMonth.includes(currentDate.getMonth())) &&
        (bySetPos == null || bySetPos.includes(getSetPos(currentDate)))
      ) {
        const res = currentDate.getTime()
        if (res > from) {
          values.push(res)
        }
        i++
      }
      date = new Date(date.setDate(date.getDate() + 1))
      if (count !== undefined && i === count) return
      if (endDate != null && date.getTime() > endDate) return
      if (date.getTime() > to) return
    }
    currentDate = new Date(next)
  }
}

function getSetPos (date: Date): number {
  const month = date.getMonth()
  const year = date.getFullYear()
  const firstOfMonth = new Date(year, month, 1)
  const daysOffset = firstOfMonth.getDay()
  const day = date.getDate()

  return Math.ceil((day + daysOffset) / 7)
}

/**
 * @public
 */
export function getWeekday (date: Date): string {
  const weekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
  const weekday = weekdays[date.getDay()]

  return weekday
}

function getWeekNumber (date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const daysOffset = firstDayOfYear.getDay()
  const diff = (date.getTime() - firstDayOfYear.getTime()) / 86400000

  return Math.floor((diff + daysOffset + 1) / 7)
}

function getYearDay (date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - startOfYear.getTime()

  return Math.floor(diff / 86400000)
}

function getReccuringEventInstances (
  event: ReccuringEvent,
  instances: ReccuringInstance[],
  from: Timestamp,
  to: Timestamp
): ReccuringInstance[] {
  let res: ReccuringInstance[] = []
  for (const rule of event.rules ?? []) {
    const values = generateRecurringValues(rule, event.date, from, to)
    for (const val of values) {
      const instance = getInstance(event, val)
      res.push(instance)
    }
  }
  for (const date of event.rdate ?? []) {
    if (date < from || date > to) continue
    const instance = getInstance(event, date)
    const exists = res.find((p) => p.date === instance.date)
    if (exists === undefined) res.push(instance)
  }

  const excludes = new Set(event.exdate ?? [])
  res = res.filter((p) => !excludes.has(p.date))
  res = res.filter((i) => {
    const override = instances.find((p) => p.originalStartTime === i.originalStartTime)
    return override === undefined
  })
  return res
}

/**
 * @public
 */
export function getAllEvents (events: Event[], from: Timestamp, to: Timestamp): Event[] {
  const base: Event[] = []
  const recur: ReccuringEvent[] = []
  const instances: ReccuringInstance[] = []
  const recurData: ReccuringInstance[] = []
  const instancesMap: Map<string, ReccuringInstance[]> = new Map()
  for (const event of events) {
    if (event._class === calendar.class.ReccuringEvent) {
      recur.push(event as ReccuringEvent)
    } else if (event._class === calendar.class.ReccuringInstance) {
      const instance = event as ReccuringInstance
      instances.push(instance)
      const arr = instancesMap.get(instance.recurringEventId) ?? []
      arr.push(instance)
      instancesMap.set(instance.recurringEventId, arr)
    } else {
      if (from > event.dueDate) continue
      if (event.date > to) continue
      base.push(event)
    }
  }
  for (const rec of recur) {
    recurData.push(...getReccuringEventInstances(rec, instancesMap.get(rec.eventId) ?? [], from, to))
  }
  const res = [
    ...base,
    ...recurData,
    ...instances.filter((p) => {
      return from <= p.dueDate && p.date <= to && p.isCancelled !== true
    })
  ]
  res.sort((a, b) => a.date - b.date)
  return res
}

/**
 * @public
 */
export function generateEventId (): string {
  const id = generateId()
  return encodeToBase32Hex(id)
}

function encodeToBase32Hex (input: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(input)
  const base32HexDigits = '0123456789abcdefghijklmnopqrstuv'
  let result = ''

  for (let i = 0; i < bytes.length; i += 5) {
    const octets = [
      (bytes[i] ?? 0) >> 3,
      ((bytes[i] & 0x07) << 2) | (bytes[i + 1] >> 6),
      (bytes[i + 1] >> 1) & 0x1f,
      ((bytes[i + 1] & 0x01) << 4) | (bytes[i + 2] >> 4),
      ((bytes[i + 2] & 0x0f) << 1) | (bytes[i + 3] >> 7),
      (bytes[i + 3] >> 2) & 0x1f,
      ((bytes[i + 3] & 0x03) << 3) | (bytes[i + 4] >> 5),
      bytes[i + 4] & 0x1f
    ]

    for (let j = 0; j < 8; j++) {
      result += base32HexDigits.charAt(octets[j])
    }
  }

  return result
}
