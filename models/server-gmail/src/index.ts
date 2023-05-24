//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { Builder } from '@hcengineering/model'

import contact from '@hcengineering/contact'
import core, { Class, Doc } from '@hcengineering/core'
import gmail from '@hcengineering/gmail'
import notification from '@hcengineering/notification'
import serverCore, { ObjectDDParticipant } from '@hcengineering/server-core'
import serverGmail from '@hcengineering/server-gmail'
import serverNotification from '@hcengineering/server-notification'
export { serverGmailId } from '@hcengineering/server-gmail'

export function createModel (builder: Builder): void {
  builder.mixin<Class<Doc>, ObjectDDParticipant>(
    contact.class.Channel,
    core.class.Class,
    serverCore.mixin.ObjectDDParticipant,
    {
      collectDocs: serverGmail.function.FindMessages
    }
  )

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverGmail.trigger.OnMessageCreate,
    txMatch: {
      _class: core.class.TxCollectionCUD,
      'tx.objectClass': gmail.class.Message,
      'tx._class': core.class.TxCreateDoc
    }
  })

  builder.mixin(gmail.ids.EmailNotification, notification.class.NotificationType, serverNotification.mixin.TypeMatch, {
    func: serverGmail.function.IsIncomingMessage
  })
}
