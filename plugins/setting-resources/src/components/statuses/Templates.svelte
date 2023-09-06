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
  import { Doc, Ref, Space, toIdMap } from '@hcengineering/core'
  import { AttributeEditor, createQuery, getClient } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import task, { genRanks, KanbanTemplate, KanbanTemplateSpace } from '@hcengineering/task'
  import { CircleButton, eventToHTMLElement, IconAdd, IconMoreH, Label, showPopup } from '@hcengineering/ui'
  import { ContextMenu } from '@hcengineering/view-resources'

  export let folder: KanbanTemplateSpace | undefined
  export let template: KanbanTemplate | undefined

  let templates: KanbanTemplate[] = []
  let templateMap = new Map<Ref<KanbanTemplate>, KanbanTemplate>()
  const templatesQ = createQuery()
  $: if (folder !== undefined) {
    templatesQ.query(task.class.KanbanTemplate, { space: folder._id }, (result) => {
      templates = result
    })
  } else {
    templatesQ.unsubscribe()
  }

  let selectedId: Ref<KanbanTemplate> | undefined
  $: if (selectedId === undefined && templates.length > 0) {
    selectedId = templates[0]._id
  }

  $: templateMap = toIdMap(templates)
  $: template = selectedId !== undefined ? templateMap.get(selectedId) : undefined

  const client = getClient()
  async function createTemplate () {
    if (folder === undefined) {
      return
    }

    const space = folder._id

    const template = await client.createDoc(task.class.KanbanTemplate, space as Ref<Doc> as Ref<Space>, {
      doneStatesC: 0,
      statesC: 0,
      title: 'New Template'
    })

    await client.createDoc(task.class.StateTemplate, space as Ref<Doc> as Ref<Space>, {
      attachedTo: template,
      ofAttribute: task.attribute.State,
      name: 'New State',
      color: 9,
      rank: [...genRanks(1)][0]
    })

    const ranks = [...genRanks(2)]
    const doneStates = [
      {
        class: task.class.WonStateTemplate,
        name: 'Won',
        rank: ranks[0]
      },
      {
        class: task.class.LostStateTemplate,
        name: 'Lost',
        rank: ranks[1]
      }
    ]

    await Promise.all(
      doneStates.map(async (ds) => {
        await client.createDoc(ds.class, space, {
          attachedTo: template,
          ofAttribute: task.attribute.DoneState,
          name: ds.name,
          rank: ds.rank
        })
      })
    )
  }

  function select (item: KanbanTemplate) {
    selectedId = item._id
  }
</script>

<div id="create-template" class="flex-between trans-title mb-3">
  <Label label={setting.string.Templates} />
  <CircleButton icon={IconAdd} size="medium" on:click={createTemplate} />
</div>
<div id="templates" class="flex-col overflow-y-auto">
  {#each templates as t (t._id)}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="ac-column__list-item" class:selected={t._id === template?._id} on:click={() => select(t)}>
      <AttributeEditor maxWidth={'15rem'} _class={task.class.KanbanTemplate} object={t} key="title" />
      {#if templates.length > 1}
        <div
          class="hover-trans"
          on:click|stopPropagation={(ev) => {
            showPopup(ContextMenu, { object: t }, eventToHTMLElement(ev), () => {})
          }}
        >
          <IconMoreH size={'medium'} />
        </div>
      {/if}
    </div>
  {/each}
</div>
