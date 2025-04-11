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
  CardType
} from '@hcengineering/communication-types'
import type { BaseRequestEvent } from './common'

export enum NotificationRequestEventType {
  AddCollaborators = 'addCollaborators',
  RemoveCollaborators = 'removeCollaborators',

  CreateNotification = 'createNotification',
  RemoveNotifications = 'removeNotifications',

  CreateNotificationContext = 'createNotificationContext',
  RemoveNotificationContext = 'removeNotificationContext',
  UpdateNotificationContext = 'updateNotificationContext',
}

export type NotificationRequestEvent =
  | AddCollaboratorsEvent
  | CreateNotificationContextEvent
  | CreateNotificationEvent
  | RemoveCollaboratorsEvent
  | RemoveNotificationContextEvent
  | RemoveNotificationsEvent
  | UpdateNotificationContextEvent

export interface CreateNotificationEvent extends BaseRequestEvent {
  type: NotificationRequestEventType.CreateNotification
  context: ContextID
  message: MessageID
  created: Date
  account: AccountID
}

export interface RemoveNotificationsEvent extends BaseRequestEvent {
  type: NotificationRequestEventType.RemoveNotifications
  context: ContextID
  account: AccountID
  untilDate: Date
}

export interface CreateNotificationContextEvent extends BaseRequestEvent {
  type: NotificationRequestEventType.CreateNotificationContext
  card: CardID
  account: AccountID
  lastView: Date
  lastUpdate: Date
}

export interface RemoveNotificationContextEvent extends BaseRequestEvent {
  type: NotificationRequestEventType.RemoveNotificationContext
  context: ContextID
  account: AccountID
}

export interface UpdateNotificationContextEvent extends BaseRequestEvent {
  type: NotificationRequestEventType.UpdateNotificationContext
  context: ContextID
  account: AccountID
  lastView?: Date
  lastUpdate?: Date
}

export interface AddCollaboratorsEvent extends BaseRequestEvent {
  type: NotificationRequestEventType.AddCollaborators
  card: CardID
  cardType: CardType
  collaborators: AccountID[]
  date?: Date
}

export interface RemoveCollaboratorsEvent extends BaseRequestEvent {
  type: NotificationRequestEventType.RemoveCollaborators
  card: CardID
  collaborators: AccountID[]
}

export type NotificationEventResult = CreateNotificationContextResult | {}

export interface CreateNotificationContextResult {
  id: ContextID
}
