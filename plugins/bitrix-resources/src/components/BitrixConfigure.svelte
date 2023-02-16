<!--
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
-->
<script lang="ts">
  import presentation, { Card, createQuery } from '@hcengineering/presentation'
  import { Integration } from '@hcengineering/setting'
  import { createEventDispatcher, onMount } from 'svelte'
  import bitrix from '../plugin'

  import { BitrixClient, BitrixEntityMapping, BitrixProfile, StatusValue } from '@hcengineering/bitrix'
  import { Button, eventToHTMLElement, IconAdd, showPopup } from '@hcengineering/ui'

  import { bitrixQueue } from '../queue'
  import CreateMapping from './CreateMapping.svelte'
  import EntiryMapping from './EntityMapping.svelte'

  export let integration: Integration

  const dispatch = createEventDispatcher()

  const bitrixClient = new BitrixClient(integration.value, (op) => bitrixQueue.add(op))

  let profile: BitrixProfile | undefined

  let statusList: StatusValue[] = []

  onMount(() => {
    bitrixClient.call('profile', {}).then((res: any) => {
      profile = res.result
    })

    bitrixClient.call('crm.status.list', {}).then((res) => {
      statusList = res.result
    })
  })

  const mQuery = createQuery()

  let mappings: BitrixEntityMapping[] = []
  $: mQuery.query(bitrix.class.EntityMapping, {}, (res) => {
    mappings = res
  })

  function addMapping (evt: MouseEvent): void {
    showPopup(CreateMapping, { integration, mappings, bitrixClient }, eventToHTMLElement(evt))
  }
</script>

<Card
  label={bitrix.string.BitrixDesc}
  okAction={() => {
    dispatch('close')
  }}
  canSave={true}
  okLabel={presentation.string.Ok}
  on:close={() => dispatch('close')}
  fullSize={true}
>
  <svelte:fragment slot="header">
    {#if profile}
      <div class="lines-limit-2">
        {profile.LAST_NAME}
        {profile.NAME}
      </div>
    {/if}
  </svelte:fragment>
  {#if profile}
    <div class="flex flex-reverse flex-grab">
      <Button icon={IconAdd} label={presentation.string.Add} on:click={addMapping} />
    </div>
    <div class="flex-row">
      {#each mappings as mapping}
        <EntiryMapping {mapping} {bitrixClient} {statusList} />
      {/each}
    </div>
  {/if}
  <!-- <EditBox label={bitrix.string.BitrixTokenUrl} bind:value={url} /> -->
  <svelte:fragment slot="pool" />
</Card>
