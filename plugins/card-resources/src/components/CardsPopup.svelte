<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { getClient, ObjectPopup } from '@hcengineering/presentation'
  import { Card } from '@hcengineering/card'
  import { Class, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let _class: Ref<Class<Card>>
  export let selected: Ref<Card> | undefined
  export let selectedObjects: Ref<Card>[] | undefined
  export let multiSelect: boolean = false
  export let allowDeselect: boolean = true
  export let titleDeselect: IntlString | undefined = undefined
  export let readonly = false

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()
</script>

<ObjectPopup
  {_class}
  {selected}
  {selectedObjects}
  {multiSelect}
  {allowDeselect}
  {titleDeselect}
  type={'object'}
  groupBy={'_class'}
  on:update
  on:close
  on:changeContent
  on:created={(doc) => dispatch('close', doc.detail)}
  {readonly}
>
  <svelte:fragment slot="item" let:item={it}>
    <div class="flex-row-center flex-grow">
      {it.title}
    </div>
  </svelte:fragment>

  <svelte:fragment slot="category" let:item={it}>
    {@const cl = hierarchy.getClass(it._class)}
    <div class="menu-group__header">
      <span class="overflow-label">
        <Label label={cl.label} />
      </span>
    </div>
  </svelte:fragment>
</ObjectPopup>
