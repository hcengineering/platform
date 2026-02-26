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
  import cardPlugin, { Tag as MasterTag } from '@hcengineering/card'
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Process } from '@hcengineering/process'
  import { Button, eventToHTMLElement, Label, SelectPopup, SelectPopupValueType, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let process: Process
  export let tag: Ref<MasterTag> | undefined = undefined
  export let includeBase: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const dispatch = createEventDispatcher()

  function open (e: MouseEvent): void {
    const res = new Set<MasterTag>(includeBase ? [hierarchy.getClass(process.masterTag)] : [])
    const ancestors = hierarchy.getAncestors(process.masterTag)
    const tags = client.getModel().findAllSync(cardPlugin.class.Tag, {})
    for (const p of tags) {
      try {
        const base = hierarchy.getBaseClass(p._id)
        if (process.masterTag === base || ancestors.includes(base)) {
          res.add(p)
        }
      } catch (err) {
        console.log('error', err, p._id)
      }
    }
    const items: SelectPopupValueType[] = []
    res.forEach((cl) => {
      items.push({
        id: cl._id,
        label: cl.label,
        isSelected: tag !== undefined && tag === cl._id
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
          tag = res
          dispatch('change', {
            tag
          })
        }
      }
    )
  }

  $: selected = tag !== undefined ? client.getModel().findObject(tag) : undefined
</script>

<Button on:click={open} width={'100%'}>
  <div slot="content">
    <Label label={selected?.label ?? cardPlugin.string.Tag} />
  </div>
</Button>
