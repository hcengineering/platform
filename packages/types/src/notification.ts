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

import type { Message, CardID, WorkspaceID } from './message'

export type ContextID = string & { context: true }

export interface Notification {
  message: Message
  context: ContextID
  read: boolean
  archived: boolean
}

export interface NotificationContext {
  id: ContextID
  card: CardID
  workspace: WorkspaceID
  personalWorkspace: WorkspaceID
  archivedFrom?: Date
  lastView?: Date
  lastUpdate?: Date
}

export interface NotificationContextUpdate {
  archivedFrom?: Date
  lastView?: Date
  lastUpdate?: Date
}
