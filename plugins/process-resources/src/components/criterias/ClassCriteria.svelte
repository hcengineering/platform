<!--
// Copyright © 2026 TraceX SAS.
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
  import core from '@hcengineering/core'
  import type { Class, Doc, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Button, DropdownLabelsIntl, IconClose, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let _class: Ref<Class<Doc>>
  export let readonly: boolean
  export let value: Ref<Class<Doc>> | undefined = undefined

  const hierarchy = getClient().getHierarchy()
  const dispatch = createEventDispatcher<{ change: { value: Ref<Class<Doc>> }, delete: void }>()

  function onSelect (event: CustomEvent<Ref<Class<Doc>>>): void {
    dispatch('change', { value: event.detail })
  }

  $: items = hierarchy
    .getDescendants(_class)
    .filter((id) => !hierarchy.isMixin(id))
    .map((id) => {
      const clazz = hierarchy.getClass(id)
      return { id, label: clazz.label }
    })
</script>

<div class="labelOnPanel">
  <Label label={core.string.Class} />
</div>
<div class="flex-row-center flex-gap-4">
  <div class="w-full">
    <DropdownLabelsIntl
      {items}
      selected={value}
      label={core.string.Class}
      disabled={readonly}
      shouldUpdateUndefined={false}
      withSearch
      size="large"
      width="100%"
      justify="left"
      on:selected={onSelect}
    />
  </div>
  <Button icon={IconClose} kind="ghost" disabled={readonly} on:click={() => dispatch('delete')} />
</div>
