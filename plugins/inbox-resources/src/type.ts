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

import { type Card } from '@hcengineering/card'
import { type Class, type Doc, type Ref } from '@hcengineering/core'
import { type NotificationContext } from '@hcengineering/communication-types'
import { type DisplayInboxNotification, type DocNotifyContext } from '@hcengineering/notification'

export type NavigationItem =
  | {
    type: 'modern'
    _id: Ref<Card>
    _class: Ref<Class<Card>>
    context: NotificationContext
    date: Date
  }
  | {
    type: 'legacy'
    _id: Ref<Doc>
    _class: Ref<Class<Doc>>
    context: DocNotifyContext
    date: Date
    notifications: DisplayInboxNotification[]
  }
