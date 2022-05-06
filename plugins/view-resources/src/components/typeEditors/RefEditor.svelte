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
  import core, { Class, Doc, Ref } from '@anticrm/core'
  import { TypeRef } from '@anticrm/model'
  import { getClient } from '@anticrm/presentation'
  import { DOMAIN_STATE } from '@anticrm/task'
  import { DropdownLabelsIntl, Label } from '@anticrm/ui'
  import view from '../../plugin'
  import { createEventDispatcher } from 'svelte'

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
        hierarchy.getDomain(p._id) !== DOMAIN_STATE
      )
    })
    .map((p) => {
      return { id: p._id, label: p.label }
    })

  let refClass: Ref<Class<Doc>>

  $: dispatch('change', { type: TypeRef(refClass) })
</script>

<div class="flex-row-center flex-grow">
  <Label label={core.string.Class} />
  <div class="ml-4">
    <DropdownLabelsIntl label={core.string.Class} items={classes} width="8rem" bind:selected={refClass} />
  </div>
</div>
