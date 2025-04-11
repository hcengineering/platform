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
  NotificationContext,
  Notification,
  AccountID,
  CardType,
} from '@hcengineering/communication-types'
import type { BaseResponseEvent } from './common'

export enum NotificationResponseEventType {
  NotificationCreated = 'notificationCreated',
  NotificationsRemoved = 'notificationsRemoved',

  NotificationContextCreated = 'notificationContextCreated',
  NotificationContextRemoved = 'notificationContextRemoved',
  NotificationContextUpdated = 'notificationContextUpdated',

  AddedCollaborators = 'addedCollaborators',
  RemovedCollaborators = 'removedCollaborators'
}

export type NotificationResponseEvent =
  | NotificationCreatedEvent
  | NotificationsRemovedEvent
  | NotificationContextCreatedEvent
  | NotificationContextRemovedEvent
  | NotificationContextUpdatedEvent
  | AddedCollaboratorsEvent
  | RemovedCollaboratorsEvent

export interface NotificationCreatedEvent extends BaseResponseEvent {
  type: NotificationResponseEventType.NotificationCreated
  notification: Notification
  account: AccountID
}

export interface NotificationsRemovedEvent extends BaseResponseEvent {
  type: NotificationResponseEventType.NotificationsRemoved
  untilDate: Date
  context: ContextID
  account: AccountID
}

export interface NotificationContextCreatedEvent extends BaseResponseEvent {
  type: NotificationResponseEventType.NotificationContextCreated
  context: NotificationContext
}

export interface NotificationContextRemovedEvent extends BaseResponseEvent {
  type: NotificationResponseEventType.NotificationContextRemoved
  context: ContextID
  account: AccountID
}

export interface NotificationContextUpdatedEvent extends BaseResponseEvent {
  type: NotificationResponseEventType.NotificationContextUpdated
  context: ContextID
  account: AccountID
  lastView?: Date
  lastUpdate?: Date
}

export interface AddedCollaboratorsEvent extends BaseResponseEvent {
  type: NotificationResponseEventType.AddedCollaborators
  card: CardID
  cardType: CardType
  collaborators: AccountID[]
}

export interface RemovedCollaboratorsEvent extends BaseResponseEvent {
  type: NotificationResponseEventType.RemovedCollaborators
  card: CardID
  collaborators: AccountID[]
}
