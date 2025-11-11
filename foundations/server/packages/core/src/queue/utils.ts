import { type QueueTopic } from './types'

export function getDeadletterTopic (topic: QueueTopic): string {
  return `${topic}-d`
}
