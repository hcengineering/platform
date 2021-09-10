<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
-->

<script lang="ts">

import { getResource } from '@anticrm/platform'
import type { Client } from '@anticrm/core'
import { navigate, Loading, fetchMetadataLocalStorage } from '@anticrm/ui'

import client from '@anticrm/client'
import login from '@anticrm/login'
import contact from '@anticrm/contact'

import Workbench from './Workbench.svelte'
import { setCurrentAccount } from '../utils'

async function connect(): Promise<Client | undefined> {
  const token = fetchMetadataLocalStorage(login.metadata.LoginToken)
  const endpoint = fetchMetadataLocalStorage(login.metadata.LoginEndpoint)
  const email = fetchMetadataLocalStorage(login.metadata.LoginEmail)

  if (token === null || endpoint === null || email === null) {
    navigate({ path: [login.component.LoginApp] })
    return
  }

  const getClient = await getResource(client.function.GetClient)
  const instance = await getClient(token, endpoint)
  console.log('logging in as', email)
  const me = await instance.findOne(contact.class.EmployeeAccount, { email })
  if (me !== undefined) {
    console.log('login: employee account', me)
    setCurrentAccount(me)
  } else {
    console.log('WARNING: no employee account found.')
  }
  return instance
}

</script>

{#await connect()}
  <Loading/>
{:then client}
  <Workbench {client}/>
{:catch error}
  <div>{error} -- {error.stack}</div>
{/await}
