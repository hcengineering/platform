import type { Tx } from '@hcengineering/core'
import type { QueueTopic } from '@hcengineering/server-core'

export enum QueueRatingEvent {
  Reindex = 'reindex',
  Calculate = 'calc'
}

export const ratingQueue = 'rating' as QueueTopic

export interface QueueRatingMessage {
  type: QueueRatingEvent
}

export interface QueueCalculateMessage extends QueueRatingMessage {
  type: QueueRatingEvent.Calculate

  tx: Tx
}

export const ratingEvents = {
  reindex: (): QueueRatingMessage => ({
    type: QueueRatingEvent.Reindex
  }),
  calculate: (tx: Tx): QueueCalculateMessage => ({
    type: QueueRatingEvent.Calculate,
    tx
  })
}
