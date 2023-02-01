//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { getMetadata, Resources } from '@hcengineering/platform'
import login from '@hcengineering/login'
import Chat from './components/Chat.svelte'
import Connect from './components/Connect.svelte'
import Reconnect from './components/Reconnect.svelte'
import IconTelegram from './components/icons/TelegramColor.svelte'
import TxSharedCreate from './components/activity/TxSharedCreate.svelte'
import { concatLink } from '@hcengineering/core'

export default async (): Promise<Resources> => ({
  component: {
    Chat,
    Connect,
    Reconnect,
    IconTelegram
  },
  activity: {
    TxSharedCreate
  },
  handler: {
    DisconnectHandler: async () => {
      const url = getMetadata(login.metadata.TelegramUrl) ?? ''
      await fetch(concatLink(url, '/signout'), {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + (getMetadata(login.metadata.LoginToken) ?? ''),
          'Content-Type': 'application/json'
        }
      })
    }
  }
})
