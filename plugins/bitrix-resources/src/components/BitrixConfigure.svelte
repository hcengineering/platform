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
  import presentation, { Card, createQuery, getClient } from '@hcengineering/presentation'
  import { Integration } from '@hcengineering/setting'
  import { createEventDispatcher, onMount } from 'svelte'
  import bitrix from '../plugin'

  import {
    BitrixClient,
    BitrixEntityMapping,
    BitrixFieldMapping,
    BitrixProfile,
    StatusValue
  } from '@hcengineering/bitrix'
  import { Button, eventToHTMLElement, IconAdd, showPopup } from '@hcengineering/ui'

  import { Data, Doc, Ref } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { bitrixQueue } from '../queue'
  import CreateMapping from './CreateMapping.svelte'
  import EntityMapping from './EntityMapping.svelte'

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

  let inputFile: HTMLInputElement
  const client = getClient()

  const mQuery = createQuery()

  let mappings: BitrixEntityMapping[] = []
  $: mQuery.query(bitrix.class.EntityMapping, {}, (res) => {
    mappings = res
  })

  function addMapping (evt: MouseEvent): void {
    showPopup(CreateMapping, { integration, mappings, bitrixClient }, eventToHTMLElement(evt))
  }
  const signature = '@#253heyf@'
  const downloadConfig = async () => {
    const filename = 'bitrix-config_' + new Date().toLocaleDateString() + '.json'
    const link = document.createElement('a')
    const fields = await client.findAll(bitrix.class.FieldMapping, {})
    link.style.display = 'none'
    link.setAttribute('target', '_blank')
    link.setAttribute(
      'href',
      'data:text/json;charset=utf-8,%EF%BB%BF' +
        encodeURIComponent(JSON.stringify({ mappings, fields, signature }, undefined, 2))
    )
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  const replaceConfig = async () => {
    inputFile.click()
  }

  const fileSelected = async () => {
    const file = inputFile.files?.[0]
    const text = await file?.text()
    if (text === undefined) {
      return
    }
    const jsonParsed = JSON.parse(text)
    if (jsonParsed.signature !== signature) {
      return
    }

    const op = client.apply('bitrix')
    // Remove all stuff
    for (const d of await (
      await client.findAll<Doc>(bitrix.class.EntityMapping, {})
    ).concat(...(await client.findAll<Doc>(bitrix.class.FieldMapping, {})))) {
      await op.remove(d)
    }

    // Import new items.
    const mappings = jsonParsed.mappings as BitrixEntityMapping[]
    for (const m of mappings) {
      const { _class, space, _id, ...dta } = m
      await op.tx(op.txFactory.createTxCreateDoc(_class, space, dta, _id))
    }
    const fields = jsonParsed.fields as BitrixFieldMapping[]
    for (const m of fields) {
      const { _class, space, _id, attachedTo, attachedToClass, collection, modifiedBy, modifiedOn, ...dta } = m
      const cr = op.txFactory.createTxCreateDoc<BitrixFieldMapping>(_class, space, dta as Data<BitrixFieldMapping>, _id)
      const col = op.txFactory.createTxCollectionCUD<BitrixEntityMapping, BitrixFieldMapping>(
        attachedToClass,
        attachedTo as Ref<BitrixEntityMapping>,
        space,
        collection,
        cr
      )
      await op.tx(col)
    }

    await op.commit()
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
  on:changeContent
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
    <div class="flex-row">
      {#each mappings as mapping}
        <EntityMapping {mapping} {bitrixClient} {statusList} />
      {/each}
    </div>
  {/if}
  <svelte:fragment slot="pool">
    <div class="flex-row-center flex-grow flex-between">
      <Button icon={IconAdd} label={presentation.string.Add} on:click={addMapping} />
      <div class="flex-row-center">
        <Button label={getEmbeddedLabel('Download...')} on:click={downloadConfig} />
        <Button label={getEmbeddedLabel('Replace...')} on:click={replaceConfig} />
        <input bind:this={inputFile} type="file" name="file" id="file" style="display: none" on:change={fileSelected} />
      </div>
    </div>
  </svelte:fragment>
</Card>
