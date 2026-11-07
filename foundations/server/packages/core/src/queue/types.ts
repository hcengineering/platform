//
// Copyright © 2025 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { AccountUuid, MeasureContext, WorkspaceUuid } from '@hcengineering/core'

export enum QueueTopic {
  // Topic with partitions to split workspace transactions into
  Tx = 'tx',

  // Instance-wide audit delivery; deliberately independent of producer region.
  Audit = 'audit',

  // Topic to send workspace information into
  Workspace = 'workspace',

  // A fulltext topic to hold extra fulltext request, like re-indexing requests etc, private to fulltext service.
  Fulltext = 'fulltext',

  // A topic about user activity.
  Users = 'users',

  TelegramBot = 'telegramBot',

  // A topic about calendar events.
  CalendarEventCUD = 'calendarEventCUD',

  // A topic about process events
  Process = 'process',

  TimeMachine = 'timeMachine',

  AI = 'ai',

  // Queue for AI requests
  AIQueue = 'ai-queue',

  // Queue for audio transcription tasks
  TranscriptionQueue = 'transcription-queue',

  // All OTP and notifications to mail/notify services are goes here first
  // And services will take them and send to a proper places.
  NotificationQueue = 'notifications',

  // Events about meetings and operations with meetings
  LoveQueue = 'love-queue',

  // Cross-workspace unread notification flags. The notification trigger publishes
  // the receivers of freshly created notifications here; account-service consumes
  // the topic and raises workspace_members.has_unread in bulk, instead of the
  // trigger issuing one account RPC per receiver.
  WorkspaceMemberUnread = 'workspace-member-unread'
}

/**
 * Payload of a {@link QueueTopic.WorkspaceMemberUnread} message. The workspace is
 * carried by the queue envelope ({@link ConsumerMessage.workspace}); `accounts`
 * are the members that just gained an unread notification in that workspace.
 */
export interface WorkspaceMemberUnreadMessage {
  accounts: AccountUuid[]
}

export interface ConsumerHandle {
  close: () => Promise<void>
  isConnected: () => boolean
}

export interface ConsumerMessage<T> {
  workspace: WorkspaceUuid
  value: T
}

export interface ConsumerControl {
  pause: () => void
  heartbeat: () => Promise<void>
}

/** Delivery policy selected by the producer's owner, without backend SDK types. */
export interface QueueProducerOptions {
  allowAutoTopicCreation?: boolean
  idempotent?: boolean
  maxInFlightRequests?: number
  retry?: {
    retries: number
    initialRetryTime?: number // Milliseconds
    maxRetryTime?: number // Milliseconds
  }
  acks?: -1 | 0 | 1
  timeout?: number // Broker acknowledgement timeout in milliseconds
}

/** Consumer execution policy; existing callers retain the default configuration. */
export interface QueueConsumerOptions {
  fromBegining?: boolean
  retryDelay?: number // Initial retry delay in milliseconds (default 1000)
  maxRetryDelay?: number // Maximum retry multiplier (default 10)
  allowAutoTopicCreation?: boolean
  partitionsConsumedConcurrently?: number
}

/** Topic scope is part of the application topology, not a backend delivery policy. */
export function isGlobalQueueTopic (topic: QueueTopic | string): boolean {
  return topic === QueueTopic.WorkspaceMemberUnread || topic === QueueTopic.Audit
}

export interface PlatformQueue {
  getProducer: <T>(
    ctx: MeasureContext,
    topic: QueueTopic | string,
    options?: QueueProducerOptions
  ) => PlatformQueueProducer<T>

  /**
   * Create a consumer for a topic.
   * return a function to close the reciever.
   */
  createConsumer: <T>(
    ctx: MeasureContext,
    topic: QueueTopic | string,
    groupId: string,
    onMessage: (ctx: MeasureContext, msg: ConsumerMessage<T>, queue: ConsumerControl) => Promise<void>,
    options?: QueueConsumerOptions
  ) => ConsumerHandle

  createTopic: (topics: string | string[], partitions: number) => Promise<void>

  createTopics: (tx: number) => Promise<void>

  // If not passed will delete all topica from QueueTopic enum
  deleteTopics: (topics?: (QueueTopic | string)[]) => Promise<void>

  getClientId: () => string

  // Will close all producers and consumers
  shutdown: () => Promise<void>
}

/**
 * Create a producer for a topic.
 */
export interface PlatformQueueProducer<T> {
  send: (ctx: MeasureContext, workspace: WorkspaceUuid | undefined, msgs: T[], partitionKey?: string) => Promise<void>
  close: () => Promise<void>

  getQueue: () => PlatformQueue
}
