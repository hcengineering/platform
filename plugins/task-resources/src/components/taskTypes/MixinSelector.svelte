<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Class, ClassifierKind, Doc, Mixin, Ref } from '@hcengineering/core'
  import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Task } from '@hcengineering/task'
  import { ButtonKind, ButtonSize, DropdownLabelsIntl, type DropdownIntlItem } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'

  export let value: Ref<Mixin<Task>> | undefined = undefined
  export let baseClass: Ref<Class<Task>>
  export let label: IntlString = plugin.string.BaseMixin
  export let placeholder: IntlString = plugin.string.NoBaseMixin
  export let kind: ButtonKind = 'regular'
  export let size: ButtonSize = 'medium'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = '100%'
  export let disabled: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  // Get all mixins that derive from baseClass
  $: availableMixins = hierarchy
    .getDescendants(baseClass)
    .map((d) => hierarchy.getClass(d))
    .filter((c) => c.kind === ClassifierKind.MIXIN && c._id !== baseClass)

  // Build dropdown items - first item is "None" option
  $: items = [
    {
      id: '',
      label: placeholder
    },
    ...availableMixins.map((m) => ({
      id: m._id,
      label: m.label ?? getEmbeddedLabel(m._id)
    }))
  ] as DropdownIntlItem[]

  $: selected = value ?? ''

  function handleSelect (event: CustomEvent<string>) {
    const newValue = event.detail === '' ? undefined : (event.detail as Ref<Mixin<Task>>)
    value = newValue
    dispatch('change', newValue)
  }
</script>

<DropdownLabelsIntl
  {label}
  {kind}
  {size}
  {items}
  {justify}
  {width}
  {disabled}
  selected={selected}
  on:selected={handleSelect}
/>
