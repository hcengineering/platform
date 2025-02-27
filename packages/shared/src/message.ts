import type { MessageID } from '@hcengineering/communication-types'

let lastTimestamp = 0
let counter = 0n

export function generateMessageId(): MessageID {
  const timestamp = Math.floor(Date.now() / 1000)

  if (timestamp !== lastTimestamp) {
    lastTimestamp = timestamp
    counter = 0n
  }

  const id = (BigInt(timestamp) << 20n) | counter
  counter++

  return id.toString() as MessageID
}

export function parseMessageId(messageId: MessageID): Date {
  const timestamp = Number(BigInt(messageId) >> 20n)

  return new Date(timestamp * 1000)
}
