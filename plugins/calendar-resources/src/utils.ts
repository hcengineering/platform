import { Timestamp } from '@hcengineering/core'

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
