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
  import { createEventDispatcher } from 'svelte'
  import core, { type Ref, type SpaceType, type SpaceTypeDescriptor } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { type DropdownTextItem, ButtonKind, ButtonSize, DropdownLabels } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  export let descriptors: Ref<SpaceTypeDescriptor>[]
  export let type: Ref<SpaceType> | undefined = undefined
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let focusIndex = -1
  export let disabled: boolean = false

  let types: SpaceType[] = []
  const typesQ = createQuery()
  $: query = {
    descriptor: { $in: descriptors }
  }
  $: typesQ.query(core.class.SpaceType, query, (result) => {
    types = result
  })

  let items: DropdownTextItem[] = []
  $: items = types.map((x) => ({ id: x._id, label: x.name }))

  let selectedItem: string | undefined = type

  const dispatch = createEventDispatcher()
  $: {
    type = selectedItem === undefined ? undefined : (selectedItem as Ref<SpaceType>)
    dispatch('change', type)
  }
</script>

<DropdownLabels
  {focusIndex}
  {items}
  {kind}
  {size}
  {disabled}
  icon={view.icon.Setting}
  bind:selected={selectedItem}
  label={core.string.SpaceType}
/>
