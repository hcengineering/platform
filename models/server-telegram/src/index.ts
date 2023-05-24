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
import serverCore, { ObjectDDParticipant } from '@hcengineering/server-core'
import serverTelegram from '@hcengineering/server-telegram'
import telegram from '@hcengineering/telegram'
import notification from '@hcengineering/notification'
import serverNotification from '@hcengineering/server-notification'

export { serverTelegramId } from '@hcengineering/server-telegram'

export function createModel (builder: Builder): void {
  builder.mixin<Class<Doc>, ObjectDDParticipant>(
    contact.class.Channel,
    core.class.Class,
    serverCore.mixin.ObjectDDParticipant,
    {
      collectDocs: serverTelegram.function.FindMessages
    }
  )

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverTelegram.trigger.OnMessageCreate,
    txMatch: {
      _class: core.class.TxCollectionCUD,
      'tx.objectClass': telegram.class.Message,
      'tx._class': core.class.TxCreateDoc
    }
  })

  builder.mixin(
    telegram.ids.NewMessageNotification,
    notification.class.NotificationType,
    serverNotification.mixin.TypeMatch,
    {
      func: serverTelegram.function.IsIncomingMessage
    }
  )
}
