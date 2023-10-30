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
  import core, { IdMap, Ref, toIdMap } from '@hcengineering/core'
  import { AttributeEditor, createQuery, getClient } from '@hcengineering/presentation'
  import task, { ProjectStatus, ProjectType, ProjectTypeCategory, createState } from '@hcengineering/task'
  import { CircleButton, IconAdd, IconMoreH, Label, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { ContextMenu } from '@hcengineering/view-resources'

  export let category: ProjectTypeCategory
  export let type: ProjectType | undefined
  export let typeId: Ref<ProjectType> | undefined

  let types: ProjectType[] = []
  let typeMap: IdMap<ProjectType> = new Map()
  const query = createQuery()
  $: if (category !== undefined) {
    query.query(task.class.ProjectType, { category: category._id, archived: false }, (result) => {
      types = result
    })
  } else {
    query.unsubscribe()
  }

  $: if (typeId === undefined && types.length > 0) {
    typeId = types[0]._id
  }

  $: typeMap = toIdMap(types)
  $: type = typeId !== undefined ? typeMap.get(typeId) : undefined

  const client = getClient()
  async function createProjectType () {
    if (category === undefined) {
      return
    }

    const statuses: ProjectStatus[] = []
    for (const cat of category.statusCategories) {
      const statusCategory = await client.findOne(core.class.StatusCategory, {
        _id: cat
      })
      if (statusCategory !== undefined) {
        const id = await createState(client, category.statusClass, {
          name: statusCategory.defaultStatusName,
          ofAttribute: statusCategory.ofAttribute,
          category: statusCategory._id
        })
        statuses.push({ _id: id })
      }
    }

    await client.createDoc(task.class.ProjectType, core.space.Space, {
      category: category._id,
      name: 'New project type',
      description: '',
      private: false,
      members: [],
      archived: false,
      statuses
    })
  }

  function select (item: ProjectType) {
    typeId = item._id
  }
</script>

<div id="create-template" class="flex-between trans-title mb-3">
  <Label label={task.string.ProjectTypes} />
  <CircleButton icon={IconAdd} size="medium" on:click={createProjectType} />
</div>
<div id="templates" class="flex-col overflow-y-auto">
  {#each types as t (t._id)}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="ac-column__list-item" class:selected={t._id === type?._id} on:click={() => select(t)}>
      <AttributeEditor maxWidth={'15rem'} _class={task.class.ProjectType} object={t} key="name" />
      {#if types.length > 1}
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
