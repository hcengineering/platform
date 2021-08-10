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

import { getResource, getMetadata } from '@anticrm/platform'
import type { Client } from '@anticrm/core'
import { navigate, Loading } from '@anticrm/ui'

import client from '@anticrm/client'
import login from '@anticrm/login'

import Workbench from './Workbench.svelte'

async function connect(): Promise<Client | undefined> {
  const token = getMetadata(login.metadata.LoginToken)
  const endpoint = getMetadata(login.metadata.LoginEndpoint)

  if (token === undefined || endpoint === undefined) {
    navigate({ path: [login.component.LoginApp] })
    return
  }

  const getClient = await getResource(client.function.GetClient)
  return getClient(token, endpoint)
}

</script>

{#await connect()}
  <Loading/>
{:then client}
  <Workbench {client}/>
{:catch error}
  <div>{error} -- {error.stack}</div>
{/await}
