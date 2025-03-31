import type { MeasureContext, WorkspaceUuid } from '@hcengineering/core'

export enum QueueTopic {
  // Topic with partitions to split workspace transactions into
  Tx = 'tx',

  // Topic to send workspace information into
  Workspace = 'workspace',

  // A fulltext topic to hold extra fulltext request, like re-indexing requests etc, private to fulltext service.
  Fulltext = 'fulltext',

  // A topic about user activity.
  Users = 'users',

  TelegramBot = 'telegramBot'
}

export interface ConsumerHandle {
  close: () => Promise<void>
  isConnected: () => boolean
}

export interface ConsumerMessage<T> {
  id: WorkspaceUuid | string
  value: T[]
}

export interface ConsumerControl {
  pause: () => void
  heartbeat: () => Promise<void>
}

export interface PlatformQueue {
  createProducer: <T>(ctx: MeasureContext, topic: QueueTopic) => PlatformQueueProducer<T>

  /**
   * Create a consumer for a topic.
   * return a function to close the reciever.
   */
  createConsumer: <T>(
    ctx: MeasureContext,
    topic: QueueTopic,
    groupId: string,
    onMessage: (msg: ConsumerMessage<T>[], queue: ConsumerControl) => Promise<void>,
    options?: {
      fromBegining?: boolean
    }
  ) => ConsumerHandle
  createTopics: (tx: number) => Promise<void>

  getClientId: () => string
}

/**
 * Create a producer for a topic.
 */
export interface PlatformQueueProducer<T> {
  send: (id: WorkspaceUuid | string, msgs: T[]) => Promise<void>
  close: () => Promise<void>

  getQueue: () => PlatformQueue
}
