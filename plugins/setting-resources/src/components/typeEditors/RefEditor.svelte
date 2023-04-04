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
  import core, { Class, Doc, DOMAIN_STATUS, Ref, RefTo } from '@hcengineering/core'
  import { TypeRef } from '@hcengineering/model'
  import { getClient } from '@hcengineering/presentation'
  import { DropdownLabelsIntl, Label } from '@hcengineering/ui'
  import view from '@hcengineering/view-resources/src/plugin'
  import { createEventDispatcher } from 'svelte'

  export let type: RefTo<Doc> | undefined
  export let editable: boolean = true

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const descendants = hierarchy.getDescendants(core.class.Doc)
  const classes = descendants
    .map((p) => hierarchy.getClass(p))
    .filter((p) => {
      return (
        hierarchy.hasMixin(p, view.mixin.AttributeEditor) &&
        p.label !== undefined &&
        hierarchy.getDomain(p._id) !== DOMAIN_STATUS
      )
    })
    .map((p) => {
      return { id: p._id, label: p.label }
    })

  let refClass: Ref<Class<Doc>> | undefined = type?.to

  $: selected = classes.find((p) => p.id === refClass)

  $: refClass && dispatch('change', { type: TypeRef(refClass) })
</script>

<div class="flex-row-center flex-grow">
  <Label label={core.string.Class} />
  <div class="ml-4">
    {#if editable}
      <DropdownLabelsIntl label={core.string.Class} items={classes} width="8rem" bind:selected={refClass} />
    {:else if selected}
      <Label label={selected.label} />
    {/if}
  </div>
</div>
