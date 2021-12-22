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
  import core, { generateId, genRanks } from '@anticrm/core'
  import type { Ref } from '@anticrm/core'
  import { AttributeEditor, createQuery, getClient } from '@anticrm/presentation'
  import { CircleButton, IconAdd, IconMoreH, Label, showPopup } from '@anticrm/ui'
  import task, { KanbanTemplate, KanbanTemplateSpace, LostStateTemplate, WonStateTemplate } from '@anticrm/task'
  import { ContextMenu } from '@anticrm/view-resources'
  import setting from '@anticrm/setting'

  export let folder: KanbanTemplateSpace | undefined
  export let template: KanbanTemplate | undefined

  let templates: KanbanTemplate[] = []
  let templateMap = new Map<Ref<KanbanTemplate>, KanbanTemplate>()
  const templatesQ = createQuery()
  $: if (folder !== undefined) {
    templatesQ.query(task.class.KanbanTemplate, { space: folder._id }, (result) => {
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

    const space = folder._id

    const template = await client.createDoc(task.class.KanbanTemplate, space, {
      doneStatesC: 0,
      statesC: 0,
      title: 'New Template'
    })

    const ranks = [...genRanks(2)]
    const doneStates = [
      {
        class: task.class.WonStateTemplate,
        title: 'Won',
        rank: ranks[0]
      },
      {
        class: task.class.LostStateTemplate,
        title: 'Lost',
        rank: ranks[1]
      }
    ]

    await Promise.all(doneStates.map(async (ds) => {
      await client.addCollection(
        ds.class,
        space,
        template,
        task.class.KanbanTemplate,
        'doneStatesC',
        {
          title: ds.title,
          rank: ds.rank
        }
      )
    }))
  }

  function select (item: KanbanTemplate) {
    selectedId = item._id
  }
</script>

<div class="flex-between trans-title mb-3">
  <Label label={setting.string.Templates}/>
  <CircleButton icon={IconAdd} size="medium" on:click={createTemplate} />
</div>
<div class="flex-col overflow-y-auto">
  {#each templates as t (t._id)}
    <div class="flex-between item" class:selected={t._id === template?._id} on:click={() => select(t)}>
      <AttributeEditor maxWidth={'18rem'} _class={task.class.KanbanTemplate} object={t} key="title"/>
      <div class="hover-trans"
        on:click|stopPropagation={(ev) => {
          showPopup(ContextMenu, { object: t }, ev.target, () => {})
        }}
      >
        <IconMoreH size={'medium'} />
      </div>
    </div>
  {/each}
</div>

<style lang="scss">
  .item {
    min-height: 2.5rem;
    padding: 0 1.25rem;
    border: 1px solid transparent;
    border-radius: 12px;
    cursor: pointer;

    &:hover { background-color: var(--theme-bg-accent-color); }
    &.selected {
      background-color: var(--theme-button-bg-enabled);
      border-color: var(--theme-bg-accent-color);
      cursor: auto;
    }
  }
  .item + .item { margin-top: .75rem; }
</style>
