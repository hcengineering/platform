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
  import core, { Association, Data, Ref, generateId } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import { EditBox, Label } from '@hcengineering/ui'
  import view, { MasterDetailConfig, Viewlet, ViewletDescriptor, ViewOptionsModel } from '@hcengineering/view'
  import setting from '@hcengineering/setting'

  import DescriptorBox from './DescriptorBox.svelte'
  import ViewSettingButton from './ViewSettingButton.svelte'
  import card from '../../../plugin'
  import { updateViewletConfig } from './utils'
  import ViewConfigSection from './ViewConfigSection.svelte'

  export let tag: MasterTag | Tag

  let title: string
  let descriptor: Ref<ViewletDescriptor> | undefined = undefined
  let association: Association | undefined = undefined
  $: viewConfigs = [
    {
      class: tag?._id,
      view: view.viewlet.Tree,
      id: generateId(),
      createComponent: card.component.CreateCardButton
    },
    {
      class: tag?._id,
      view: view.viewlet.Document,
      id: generateId(),
      createComponent: card.component.CreateCardButton
    }
  ]

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
    setMasterDetailConfig()
    await client.createDoc(view.class.Viewlet, core.space.Model, viewletConfig)
  }

  function setMasterDetailConfig (): void {
    if (viewletConfig === undefined || descriptor !== view.viewlet.MasterDetail) return
    viewletConfig.masterDetailOptions = {
      views: viewConfigs
    }
  }
  function onConfigUpdate (items: any[]): void {
    if (viewletConfig === undefined) return
    updateViewletConfig(viewletConfig, items)
  }
  function onMasterDetailUpdate (items: MasterDetailConfig[]): void {
    if (viewletConfig === undefined) return
    viewConfigs = items
  }
</script>

<Card
  label={card.string.CreateView}
  okAction={save}
  canSave={descriptor !== undefined && (descriptor !== view.viewlet.MasterDetail || (viewConfigs.length > 0 && viewConfigs.every((config) => config.class !== undefined && config.view !== undefined)))}
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
  <div class="antiGrid-row">
    <div class="antiGrid-row__header">
      <Label label={view.string.Title} />
    </div>
    <div class="padding">
      <EditBox
        bind:value={title}
        placeholder={view.string.Title}
        kind={'large-style'}
        autoFocus
      />
    </div>
  </div>
  <div class="antiGrid-row">
    <div class="antiGrid-row__header withDesciption">
      <Label label={card.string.SelectViewType} />
    </div>
    <div class="padding flex-row-center relative">
      <DescriptorBox label={card.string.SelectViewType} bind:value={descriptor} />
    </div>
  </div>
  {#if descriptor === view.viewlet.MasterDetail}
    <ViewConfigSection tag={tag} {viewConfigs} on:change={(e) => { onMasterDetailUpdate(e.detail) }}/>
  {:else}
    <div class="antiGrid-row">
      <div class="antiGrid-row__header withDesciption">
        <Label label={setting.string.Settings} />
      </div>
      <div class="padding flex-row-center relative">
        <ViewSettingButton
          viewlet={viewletConfig}
          disabled={descriptor === undefined}
          on:save={(event) => {
            onConfigUpdate(event.detail ?? [])
          }}
        />
      </div>
    </div>
  {/if}
</Card>
