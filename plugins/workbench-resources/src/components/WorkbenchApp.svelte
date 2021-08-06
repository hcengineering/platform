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
import type { Connection } from '@anticrm/client'
import client from '@anticrm/client'

import Workbench from './Workbench.svelte'

async function connect(): Promise<Connection> {
  const getClient = await getResource(client.function.GetClient)
  return getClient()
}

</script>

{#await connect()}
  <div></div>
{:then client}
  <Workbench {client}/>
{:catch error}
  <div>{error}</div>
{/await}
