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

import { CollaboratorsQuery, LabelsQuery, MessagesQuery, NotificationContextsQuery, NotificationsQuery } from './query'

export type { MessageQueryParams } from '@hcengineering/communication-query'
export { initLiveQueries, refreshLiveQueries } from './init'

export function createMessagesQuery (dontDestroy?: boolean): MessagesQuery {
  return new MessagesQuery(dontDestroy)
}

export function createNotificationsQuery (dontDestroy?: boolean): NotificationsQuery {
  return new NotificationsQuery(dontDestroy)
}

export function createNotificationContextsQuery (dontDestroy?: boolean): NotificationContextsQuery {
  return new NotificationContextsQuery(dontDestroy)
}

export function createLabelsQuery (dontDestroy?: boolean): LabelsQuery {
  return new LabelsQuery(dontDestroy)
}

export function createCollaboratorsQuery (dontDestroy?: boolean): CollaboratorsQuery {
  return new CollaboratorsQuery(dontDestroy)
}
