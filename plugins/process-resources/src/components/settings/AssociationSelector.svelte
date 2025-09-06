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
  import core, { Association, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Process } from '@hcengineering/process'
  import { Button, eventToHTMLElement, Label, SelectPopup, SelectPopupValueType, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let process: Process
  export let association: Ref<Association> | undefined = undefined
  export let direction: 'A' | 'B' | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const dispatch = createEventDispatcher()

  function open (e: MouseEvent): void {
    const descendants = hierarchy.getDescendants(process.masterTag)
    const leftAssociations = client.getModel().findAllSync(core.class.Association, { classA: { $in: descendants } })
    const rightAssociations = client.getModel().findAllSync(core.class.Association, { classB: { $in: descendants } })
    const items: SelectPopupValueType[] = []
    rightAssociations.forEach((a) => {
      items.push({
        id: 'A_' + a._id,
        text: a.nameA,
        isSelected: association !== undefined && association === a._id && direction === 'A'
      })
    })
    leftAssociations.forEach((a) => {
      items.push({
        id: 'B_' + a._id,
        text: a.nameB,
        isSelected: association !== undefined && association === a._id && direction === 'B'
      })
    })
    showPopup(
      SelectPopup,
      {
        value: items
      },
      eventToHTMLElement(e),
      (res) => {
        if (res !== undefined) {
          const [dir, id] = res.split('_')
          association = id as Ref<Association>
          direction = dir as 'A' | 'B'
        } else {
          association = undefined
          direction = undefined
        }
        dispatch('change', {
          association,
          direction
        })
      }
    )
  }

  $: selected = association !== undefined && client.getModel().findObject(association)
</script>

<Button on:click={open} width={'100%'}>
  <div slot="content">
    {#if selected && direction !== undefined}
      {direction === 'A' ? selected.nameA : selected.nameB}
    {:else}
      <Label label={core.string.Relation} />
    {/if}
  </div>
</Button>
