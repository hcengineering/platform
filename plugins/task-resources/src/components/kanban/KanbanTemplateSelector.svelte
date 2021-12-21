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
  import type { Ref } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { DumbDropdown } from '@anticrm/ui'
  import type { DumbDropdownItem } from '@anticrm/ui/src/types'
  import type { KanbanTemplate, KanbanTemplateSpace } from '@anticrm/task'
  import task from '@anticrm/task'

  export let folders: Ref<KanbanTemplateSpace>[]
  export let template: Ref<KanbanTemplate> | undefined = undefined

  let templates: KanbanTemplate[] = []
  const templatesQ = createQuery()
  $: templatesQ.query(task.class.KanbanTemplate, { space: { $in: folders } }, (result) => { templates = result })

  let items: DumbDropdownItem[] = []
  $: items = templates.map(x => ({ id: x._id, label: x.title }))

  let selectedItem: string | undefined
  $: template = selectedItem === undefined ? undefined : selectedItem as Ref<KanbanTemplate>
</script>

<DumbDropdown {items} bind:selected={selectedItem} title="Statuses" />
