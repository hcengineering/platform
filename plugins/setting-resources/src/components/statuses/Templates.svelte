<!--
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
-->

<script lang="ts">
  import core from '@anticrm/core'
  import type { Ref } from '@anticrm/core'
  import { AttributeEditor, createQuery, getClient } from '@anticrm/presentation'
  import { CircleButton, IconAdd, IconMoreH, Label, showPopup } from '@anticrm/ui'
  import view, { KanbanTemplate, KanbanTemplateSpace } from '@anticrm/view'
  import setting from '@anticrm/setting'

  import TemplateMenu from './TemplateMenu.svelte';

  export let folder: KanbanTemplateSpace | undefined
  export let template: KanbanTemplate | undefined

  let templates: KanbanTemplate[] = []
  let templateMap = new Map<Ref<KanbanTemplate>, KanbanTemplate>()
  const templatesQ = createQuery()
  $: if (folder !== undefined) {
    templatesQ.query(view.class.KanbanTemplate, { space: folder._id }, (result) => {
      templates = result
    })
  }

  let selectedId: Ref<KanbanTemplate> | undefined
  $: if (selectedId === undefined && templates.length > 0) {
    selectedId = templates[0]._id
  }

  $: templateMap = new Map(templates.map(x => [x._id, x]))
  $: template = selectedId !== undefined ? templateMap.get(selectedId) : undefined

  const client = getClient()
  async function createTemplate() {
    if (folder === undefined) {
      return
    }

    const doneStates = await Promise.all([
      client.createDoc(core.class.WonState, folder._id, {
        title: 'Won'
      }),
      client.createDoc(core.class.LostState, folder._id, {
        title: 'Lost'
      })
    ])

    await client.createDoc(view.class.KanbanTemplate, folder._id, {
      states: [],
      doneStates,
      title: 'New Template'
    })
  }

  function select (item: KanbanTemplate) {
    selectedId = item._id
  }
</script>

<div class="root flex-col w-full">
  <div class="header">
    <Label label={setting.string.Templates}/>
    <CircleButton icon={IconAdd} size="medium" on:click={createTemplate} />
  </div>
  <div class="content">
    {#each templates as t (t._id)}
      <div class="item flex-between" class:selected={t._id === template?._id} on:click={() => select(t)}>
        <AttributeEditor maxWidth="20rem" _class={view.class.KanbanTemplate} object={t} key="title"/>
        <div class="tool hover-trans"
          on:click|stopPropagation={(ev) => {
            showPopup(TemplateMenu, { template: t }, ev.target, () => {})
          }}
        >
          <IconMoreH size="medium" />
        </div>
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .root {
    gap: 1rem;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    font-weight: 600;
    text-transform: uppercase;
    color: var(--theme-content-trans-color);
    font-size: 0.75rem;

    height: 1.75rem;
  }

  .content {
    display: flex; 
    flex-direction: column;

    overflow-y: auto;
  }

  .item {
    padding: 10px 20px;

    cursor: pointer;

    &:hover, &.selected {
      background-color: var(--theme-button-bg-enabled);
      border-radius: 12px;
    }
  }
</style>
