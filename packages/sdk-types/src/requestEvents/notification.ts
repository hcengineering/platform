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

import type {
  CardID,
  ContextID,
  MessageID,
  AccountID,
  CardType,
  NotificationType,
  NotificationContent,
  NotificationID,
  SocialID
} from '@hcengineering/communication-types'
import type { BaseRequestEvent } from './common'
import type { UpdateNotificationQuery } from '../db.ts'

export enum NotificationRequestEventType {
  AddCollaborators = 'addCollaborators',
  RemoveCollaborators = 'removeCollaborators',

  CreateNotification = 'createNotification',
  RemoveNotifications = 'removeNotifications',
  UpdateNotification = 'updateNotification',

  CreateNotificationContext = 'createNotificationContext',
  RemoveNotificationContext = 'removeNotificationContext',
  UpdateNotificationContext = 'updateNotificationContext'
}

export type NotificationRequestEvent =
  | AddCollaboratorsEvent
  | CreateNotificationContextEvent
  | CreateNotificationEvent
  | UpdateNotificationEvent
  | RemoveCollaboratorsEvent
  | RemoveNotificationContextEvent
  | RemoveNotificationsEvent
  | UpdateNotificationContextEvent

export interface CreateNotificationEvent extends BaseRequestEvent {
  type: NotificationRequestEventType.CreateNotification
  notificationType: NotificationType
  read?: boolean
  content?: NotificationContent
  contextId: ContextID
  messageId: MessageID
  messageCreated: Date
  account: AccountID

  socialId: SocialID
  date: Date
}

export interface UpdateNotificationEvent extends BaseRequestEvent {
  type: NotificationRequestEventType.UpdateNotification
  query: UpdateNotificationQuery
  updates: {
    read: boolean
  }
  socialId?: SocialID
  date?: Date
}

export interface RemoveNotificationsEvent extends BaseRequestEvent {
  type: NotificationRequestEventType.RemoveNotifications
  contextId: ContextID
  account: AccountID
  ids: NotificationID[]

  socialId?: SocialID
  date?: Date
}

export interface CreateNotificationContextEvent extends BaseRequestEvent {
  type: NotificationRequestEventType.CreateNotificationContext
  cardId: CardID
  account: AccountID
  lastView: Date
  lastUpdate: Date
  lastNotify?: Date

  socialId: SocialID
  date: Date
}

export interface RemoveNotificationContextEvent extends BaseRequestEvent {
  type: NotificationRequestEventType.RemoveNotificationContext
  contextId: ContextID
  account: AccountID

  socialId?: SocialID
  date?: Date
}

export interface UpdateNotificationContextEvent extends BaseRequestEvent {
  type: NotificationRequestEventType.UpdateNotificationContext
  contextId: ContextID
  account: AccountID
  updates: {
    lastView?: Date
    lastUpdate?: Date
    lastNotify?: Date
  }
  socialId?: SocialID
  date?: Date
}

export interface AddCollaboratorsEvent extends BaseRequestEvent {
  type: NotificationRequestEventType.AddCollaborators
  cardId: CardID
  cardType: CardType
  collaborators: AccountID[]
  socialId?: SocialID
  date?: Date
}

export interface RemoveCollaboratorsEvent extends BaseRequestEvent {
  type: NotificationRequestEventType.RemoveCollaborators
  cardId: CardID
  cardType: CardType
  collaborators: AccountID[]
  socialId?: SocialID
  date?: Date
}

// eslint-disable-next-line  @typescript-eslint/ban-types
export type NotificationEventResult = CreateNotificationContextResult | {}

export interface CreateNotificationContextResult {
  id: ContextID
}
