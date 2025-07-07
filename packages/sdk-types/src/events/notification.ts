//
// Copyright © 2025 Hardcore Engineering Inc.
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

import {
  CardID,
  ContextID,
  MessageID,
  AccountID,
  CardType,
  NotificationType,
  NotificationContent,
  NotificationID,
  SocialID,
  BlobID
} from '@hcengineering/communication-types'
import type { BaseEvent } from './common'

export enum NotificationEventType {
  AddCollaborators = 'addCollaborators',
  RemoveCollaborators = 'removeCollaborators',

  CreateNotification = 'createNotification',
  RemoveNotifications = 'removeNotifications',
  UpdateNotification = 'updateNotification',

  CreateNotificationContext = 'createNotificationContext',
  RemoveNotificationContext = 'removeNotificationContext',
  UpdateNotificationContext = 'updateNotificationContext'
}

export type NotificationEvent =
  | AddCollaboratorsEvent
  | CreateNotificationContextEvent
  | CreateNotificationEvent
  | UpdateNotificationEvent
  | RemoveCollaboratorsEvent
  | RemoveNotificationContextEvent
  | RemoveNotificationsEvent
  | UpdateNotificationContextEvent

export interface CreateNotificationEvent extends BaseEvent {
  type: NotificationEventType.CreateNotification
  notificationId?: NotificationID
  notificationType: NotificationType
  read: boolean
  content: NotificationContent
  cardId: CardID
  contextId: ContextID
  messageId: MessageID
  messageCreated: Date
  blobId?: BlobID
  account: AccountID

  date?: Date
}

export interface UpdateNotificationEvent extends BaseEvent {
  type: NotificationEventType.UpdateNotification
  contextId: ContextID
  account: AccountID
  query: {
    type?: NotificationType
    id?: NotificationID
    untilDate?: Date
  }
  updates: {
    read: boolean
  }

  date?: Date
}

export interface RemoveNotificationsEvent extends BaseEvent {
  type: NotificationEventType.RemoveNotifications
  contextId: ContextID
  account: AccountID
  ids: NotificationID[]

  date?: Date
}

export interface CreateNotificationContextEvent extends BaseEvent {
  type: NotificationEventType.CreateNotificationContext
  contextId?: ContextID
  cardId: CardID
  account: AccountID

  lastView: Date
  lastUpdate: Date
  lastNotify: Date

  date?: Date
}

export interface RemoveNotificationContextEvent extends BaseEvent {
  type: NotificationEventType.RemoveNotificationContext
  contextId: ContextID
  account: AccountID

  date?: Date
}

export interface UpdateNotificationContextEvent extends BaseEvent {
  type: NotificationEventType.UpdateNotificationContext
  contextId: ContextID
  account: AccountID
  updates: {
    lastView?: Date
    lastUpdate?: Date
    lastNotify?: Date
  }

  date?: Date
}

export interface AddCollaboratorsEvent extends BaseEvent {
  type: NotificationEventType.AddCollaborators
  cardId: CardID
  cardType: CardType
  collaborators: AccountID[]

  socialId: SocialID
  date?: Date
}

export interface RemoveCollaboratorsEvent extends BaseEvent {
  type: NotificationEventType.RemoveCollaborators
  cardId: CardID
  cardType: CardType
  collaborators: AccountID[]

  socialId: SocialID
  date?: Date
}

// eslint-disable-next-line  @typescript-eslint/ban-types
export type NotificationEventResult = CreateNotificationContextResult | {}

export interface CreateNotificationContextResult {
  id: ContextID
}
