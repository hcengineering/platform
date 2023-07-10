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
  const { bySecond, byMinute, byHour, bySetPos } = rule
  let i = 0

  while (true) {
    if (
      (bySecond == null || bySecond.includes(currentDate.getSeconds())) &&
      (byMinute == null || byMinute.includes(currentDate.getMinutes())) &&
      (byHour == null || byHour.includes(currentDate.getHours())) &&
      (bySetPos == null || bySetPos.includes(getSetPos(currentDate)))
    ) {
      const res = currentDate.getTime()
      if (res > from) {
        values.push(res)
      }
      i++
    }

    currentDate.setDate(currentDate.getDate() + (interval ?? 1))
    if (count !== undefined && i === count) break
    if (endDate !== undefined && currentDate.getTime() > endDate) break
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
  const { bySecond, byMinute, byHour, byDay, wkst, bySetPos } = rule
  let i = 0

  while (true) {
    if (
      (bySecond == null || bySecond.includes(currentDate.getSeconds())) &&
      (byMinute == null || byMinute.includes(currentDate.getMinutes())) &&
      (byHour == null || byHour.includes(currentDate.getHours())) &&
      (byDay == null || byDay.includes(getWeekday(currentDate, wkst))) &&
      (bySetPos == null || bySetPos.includes(getSetPos(currentDate)))
    ) {
      const res = currentDate.getTime()
      if (res > from) {
        values.push(res)
      }
      i++
    }

    currentDate.setDate(currentDate.getDate() + (interval ?? 1) * 7)
    if (count !== undefined && i === count) break
    if (endDate !== undefined && currentDate.getTime() > endDate) break
    if (currentDate.getTime() > to) break
  }
}

function generateMonthlyValues (
  rule: RecurringRule,
  currentDate: Date,
  values: Timestamp[],
  from: Timestamp,
  to: Timestamp
): void {
  const { count, endDate, interval } = rule
  const { bySecond, byMinute, byHour, byDay, byMonthDay, bySetPos, wkst } = rule
  let i = 0

  while (true) {
    if (
      (bySecond == null || bySecond.includes(currentDate.getSeconds())) &&
      (byMinute == null || byMinute.includes(currentDate.getMinutes())) &&
      (byHour == null || byHour.includes(currentDate.getHours())) &&
      (byDay == null || byDay.includes(getWeekday(currentDate, wkst))) &&
      (byMonthDay == null || byMonthDay.includes(new Date(currentDate).getDate())) &&
      (bySetPos == null || bySetPos.includes(getSetPos(currentDate)))
    ) {
      const res = currentDate.getTime()
      if (res > from) {
        values.push(res)
      }
      i++
    }

    currentDate.setMonth(currentDate.getMonth() + (interval ?? 1))
    if (count !== undefined && i === count) break
    if (endDate !== undefined && currentDate.getTime() > endDate) break
    if (currentDate.getTime() > to) break
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
  const { bySecond, byMinute, byHour, byDay, byMonthDay, byYearDay, byWeekNo, byMonth, bySetPos, wkst } = rule
  let i = 0

  while (true) {
    if (
      (bySecond == null || bySecond.includes(currentDate.getSeconds())) &&
      (byMinute == null || byMinute.includes(currentDate.getMinutes())) &&
      (byHour == null || byHour.includes(currentDate.getHours())) &&
      (byDay == null || byDay.includes(getWeekday(currentDate, wkst))) &&
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

    currentDate.setFullYear(currentDate.getFullYear() + (interval ?? 1))
    if (count !== undefined && i === count) break
    if (endDate !== undefined && currentDate.getTime() > endDate) break
    if (currentDate.getTime() > to) break
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

function getWeekday (date: Date, wkst?: string): string {
  const weekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
  const weekday = weekdays[date.getDay()]

  if (wkst !== undefined && wkst !== 'MO') {
    const wkstIndex = weekdays.indexOf(wkst)
    const offset = wkstIndex > 0 ? wkstIndex - 1 : 6

    return weekdays[(date.getDay() + offset) % 7]
  }

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
  for (const rule of event.rules) {
    const values = generateRecurringValues(rule, event.date, from, to)
    for (const val of values) {
      const instance = getInstance(event, val)
      res.push(instance)
    }
  }
  for (const date of event.rdate) {
    if (date < from || date > to) continue
    const instance = getInstance(event, date)
    const exists = res.find((p) => p.date === instance.date)
    if (exists === undefined) res.push(instance)
  }

  const excludes = new Set(event.exdate)
  res = res.filter((p) => !excludes.has(p.date))
  res = res.filter((i) => {
    const override = instances.find((p) => p.originalStartTime === i.date)
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
    if (event._class === calendar.class.Event) {
      base.push(event)
    } else if (event._class === calendar.class.ReccuringEvent) {
      recur.push(event as ReccuringEvent)
    } else if (event._class === calendar.class.ReccuringInstance) {
      const instance = event as ReccuringInstance
      instances.push(instance)
      const arr = instancesMap.get(instance.recurringEventId) ?? []
      arr.push(instance)
      instancesMap.set(instance.recurringEventId, arr)
    }
  }
  for (const rec of recur) {
    recurData.push(...getReccuringEventInstances(rec, instancesMap.get(rec.eventId) ?? [], from, to))
  }
  const res = [...base, ...recurData, ...instances]
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
