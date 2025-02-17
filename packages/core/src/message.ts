import type { MessageID } from '@hcengineering/communication-types'

let lastTimestamp = Math.floor(Date.now() / 1000)
let counter = 0

export function generateMessageId(): MessageID {
  const timestamp = Math.floor(Date.now() / 1000)

  if (timestamp !== lastTimestamp) {
    lastTimestamp = timestamp
    counter = 0
  }

  counter++

  return ((timestamp << 24) | counter) as MessageID
}

export function parseMessageId(id: MessageID): { timestamp: number; counter: number } {
  const timestamp = id >> 24
  const counter = id & 0xffffff

  return { timestamp, counter }
}
