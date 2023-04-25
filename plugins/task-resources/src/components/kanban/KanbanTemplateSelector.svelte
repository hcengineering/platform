<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import type { Doc, Ref, Space } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import type { KanbanTemplate, KanbanTemplateSpace } from '@hcengineering/task'
  import task from '@hcengineering/task'
  import type { DropdownTextItem } from '@hcengineering/ui'
  import { DropdownLabels, ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'

  export let folders: Ref<KanbanTemplateSpace>[]
  export let template: Ref<KanbanTemplate> | undefined = undefined
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let focusIndex = -1

  let templates: KanbanTemplate[] = []
  const templatesQ = createQuery()
  $: templatesQ.query(
    task.class.KanbanTemplate,
    { space: { $in: folders as Ref<Doc>[] as Ref<Space>[] } },
    (result) => {
      templates = result
    }
  )

  let items: DropdownTextItem[] = []
  $: items = templates.map((x) => ({ id: x._id, label: x.title }))

  let selectedItem: string | undefined

  const dispatch = createEventDispatcher()
  $: {
    template = selectedItem === undefined ? undefined : (selectedItem as Ref<KanbanTemplate>)
    dispatch('change', template)
  }
</script>

<DropdownLabels
  {focusIndex}
  {items}
  {kind}
  {size}
  icon={task.icon.ManageTemplates}
  bind:selected={selectedItem}
  label={plugin.string.States}
/>
