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
import calendar, { Event } from '@hcengineering/calendar'
import { PersonSpace } from '@hcengineering/contact'
import { Ref, TxOperations, AccountUuid } from '@hcengineering/core'
import notification from '@hcengineering/notification'
import { IntlString } from '@hcengineering/platform'

export async function createNotification (
  client: TxOperations,
  forEvent: Event,
  user: AccountUuid,
  space: Ref<PersonSpace>,
  message: IntlString,
  props: Record<string, any>
): Promise<void> {
  const docNotifyContext = await client.findOne(notification.class.DocNotifyContext, { objectId: forEvent._id, user })
  let docNotifyContextId = docNotifyContext?._id
  if (docNotifyContextId === undefined) {
    docNotifyContextId = await client.createDoc(notification.class.DocNotifyContext, space, {
      objectId: forEvent._id,
      objectClass: forEvent._class,
      objectSpace: forEvent.space,
      user,
      isPinned: false,
      hidden: false
    })
  }
  await client.createDoc(notification.class.CommonInboxNotification, space, {
    user,
    objectId: forEvent._id,
    objectClass: forEvent._class,
    icon: calendar.icon.Calendar,
    message,
    props,
    isViewed: false,
    archived: false,
    docNotifyContext: docNotifyContextId
  })
}
