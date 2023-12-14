<!--
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
-->
<script lang="ts">
  import { Ref } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import { TaskType } from '@hcengineering/task'
  import { DropdownLabels, DropdownTextItem } from '@hcengineering/ui'

  export let label: IntlString
  export let value: Ref<TaskType>[] = []
  export let onChange: (value: Ref<TaskType>[]) => void
  export let types: TaskType[]

  let items: DropdownTextItem[] = []

  $: items =
    types.map((p) => {
      return { id: p._id, label: p.name }
    }) ?? []
</script>

<DropdownLabels
  selected={[...(value ?? [])]}
  {items}
  {label}
  useFlexGrow={true}
  justify={'left'}
  size={'large'}
  kind={'link'}
  width={'10rem'}
  autoSelect={false}
  on:selected={(e) => {
    value = e.detail
    onChange(e.detail)
  }}
/>
