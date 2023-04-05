import contact from '@hcengineering/contact'
import { Doc } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'

export function getTime (time: number): string {
  let options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' }
  if (!isCurrentYear(time)) {
    options = {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric',
      ...options
    }
  } else if (!isToday(time)) {
    options = {
      month: 'numeric',
      day: 'numeric',
      ...options
    }
  }

  return new Date(time).toLocaleString('default', options)
}

export function isToday (time: number): boolean {
  const current = new Date()
  const target = new Date(time)
  return (
    current.getDate() === target.getDate() &&
    current.getMonth() === target.getMonth() &&
    current.getFullYear() === target.getFullYear()
  )
}

export function isCurrentYear (time: number): boolean {
  const current = new Date()
  const target = new Date(time)
  return current.getFullYear() === target.getFullYear()
}

export async function checkHasEmail (doc: Doc | Doc[] | undefined): Promise<boolean> {
  if (doc === undefined) return false
  const client = getClient()
  const arr = Array.isArray(doc) ? doc.map((p) => p._id) : [doc._id]
  const res = await client.findAll(
    contact.class.Channel,
    {
      provider: contact.channelProvider.Email,
      attachedTo: { $in: arr }
    },
    { projection: { _id: 1, attachedTo: 1 } }
  )
  const set = new Set(res.map((p) => p.attachedTo))
  for (const val of arr) {
    if (!set.has(val)) return false
  }
  return true
}
