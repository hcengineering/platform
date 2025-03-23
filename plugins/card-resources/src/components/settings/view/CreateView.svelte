<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'

  import { MasterTag, Tag } from '@hcengineering/card'
  import core, { Data, Ref } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import { EditBox, Label } from '@hcengineering/ui'
  import view, { Viewlet, ViewletDescriptor, ViewOptionsModel } from '@hcengineering/view'

  import DescriptorBox from './DescriptorBox.svelte'
  import ViewSettingButton from './ViewSettingButton.svelte'
  import card from '../../../plugin'
  import { updateViewletConfig } from './utils'

  export let tag: MasterTag | Tag

  let title: string
  let descriptor: Ref<ViewletDescriptor> | undefined = undefined

  let viewletConfig: Data<Viewlet> | undefined = undefined
  $: viewletConfig = {
    title,
    attachTo: tag._id,
    descriptor: descriptor ?? view.viewlet.Table,
    config: [
      {
        key: ''
      },
      'createdBy',
      'modifiedOn'
    ],
    configOptions: {},
    viewOptions: getViewOptions(descriptor)
  }

  function getViewOptions (descriptor: Ref<ViewletDescriptor> | undefined): ViewOptionsModel | undefined {
    if (descriptor === undefined || descriptor === view.viewlet.Table) return undefined
    return {
      groupBy: ['_class', 'parent'],
      orderBy: [],
      other: []
    }
  }

  const client = getClient()
  const dispatch = createEventDispatcher()

  async function save (): Promise<void> {
    dispatch('close')
    if (descriptor === undefined || viewletConfig === undefined) return
    await client.createDoc(view.class.Viewlet, core.space.Model, viewletConfig)
  }
  function onConfigUpdate (items: any[]): void {
    if (viewletConfig === undefined) return
    updateViewletConfig(viewletConfig, items)
  }
</script>

<Card
  label={card.string.EditView}
  okAction={save}
  canSave={descriptor !== undefined}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="header">
    {#if tag.label !== undefined}
      <div class="flex-row-center">
        <div class="ml-2">
          <Label label={tag?.label} />
        </div>
      </div>
    {/if}
  </svelte:fragment>
  <div class="mb-2"><EditBox autoFocus bind:value={title} placeholder={view.string.Title} /></div>
  <svelte:fragment slot="pool">
    <DescriptorBox label={card.string.SelectViewType} bind:value={descriptor} />
    <ViewSettingButton
      viewlet={viewletConfig}
      disabled={descriptor === undefined}
      on:save={(event) => {
        onConfigUpdate(event.detail ?? [])
      }}
    />
  </svelte:fragment>
</Card>
