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
import Main from './components/Main.svelte'
import Connect from './components/Connect.svelte'
import IconGmail from './components/icons/GmailColor.svelte'
import TxSharedCreate from './components/activity/TxSharedCreate.svelte'
import { concatLink } from '@hcengineering/core'
import NewMessages from './components/NewMessages.svelte'
import Configure from './components/Configure.svelte'

export default async (): Promise<Resources> => ({
  component: {
    Main,
    Connect,
    IconGmail,
    NewMessages,
    Configure
  },
  activity: {
    TxSharedCreate
  },
  handler: {
    DisconnectHandler: async () => {
      const url = getMetadata(login.metadata.GmailUrl) ?? ''
      await fetch(concatLink(url, '/signout'), {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + (getMetadata(login.metadata.LoginToken) ?? ''),
          'Content-Type': 'application/json'
        }
      })
    }
  }
})
