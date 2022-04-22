<!--
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
-->
<script lang="ts">
  import { DirectMessage } from '@anticrm/chunter'
  import type { Ref } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { showPanel } from '@anticrm/ui'
  import chunter from '../plugin'
  import { classIcon, getDmName } from '../utils'
  import Header from './Header.svelte'

  export let spaceId: Ref<DirectMessage> | undefined

  const client = getClient()
  const query = createQuery()
  let dm: DirectMessage | undefined

  $: query.query(chunter.class.DirectMessage, { _id: spaceId }, (result) => {
    dm = result[0]
  })

  async function onSpaceEdit (): Promise<void> {
    if (dm === undefined) return
    showPanel(chunter.component.EditChannel, dm._id, dm._class, 'right')
  }
</script>

<div class="ac-header divide full">
  {#if dm}
    {#await getDmName(client, dm) then name}
      <Header icon={classIcon(client, dm._class)} label={name} description={''} on:click={onSpaceEdit} />
    {/await}
  {/if}
</div>
