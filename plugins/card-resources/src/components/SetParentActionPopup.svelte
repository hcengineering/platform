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
  import { Card } from '@hcengineering/card'
  import { Doc, FindOptions, SortingOrder } from '@hcengineering/core'
  import { ObjectPopup, getClient } from '@hcengineering/presentation'
  import { createEventDispatcher } from 'svelte'
  import card from '../plugin'

  export let value: Card | Card[]
  export let width: 'medium' | 'large' | 'full' = 'large'

  const client = getClient()
  const dispatch = createEventDispatcher()
  const options: FindOptions<Card> = {
    sort: { modifiedOn: SortingOrder.Descending }
  }

  async function onClose ({ detail: parent }: CustomEvent<Card | undefined | null>): Promise<void> {
    const vv = Array.isArray(value) ? value : [value]
    for (const docValue of vv) {
      if (
        '_class' in docValue &&
        parent !== undefined &&
        parent?._id !== docValue.parent &&
        parent?._id !== docValue._id
      ) {
        await client.update(docValue, {
          parent: parent === null ? null : parent._id
        })
      }
    }

    dispatch('close', parent)
  }

  $: selected = !Array.isArray(value) ? value.parent ?? undefined : undefined
  $: ignoreObjects = !Array.isArray(value) ? [value._id] : undefined

  $: cards = new Set(Array.isArray(value) ? value.map((p) => p._id) : [value._id])

  const filter = (it: Doc): boolean => {
    const card = it as Card
    return !card.parentInfo.some((p) => cards.has(p._id))
  }
</script>

<ObjectPopup
  _class={card.class.Card}
  {options}
  {selected}
  category={card.completion.CardCategory}
  multiSelect={false}
  allowDeselect={true}
  placeholder={card.string.SetParent}
  create={undefined}
  {filter}
  {ignoreObjects}
  shadows={true}
  {width}
  searchMode={'spotlight'}
  on:update
  on:close={onClose}
>
  <svelte:fragment slot="item" let:item>
    <div class="flex-center clear-mins w-full h-9">
      <span class="overflow-label w-full content-color">{item.title}</span>
    </div>
  </svelte:fragment>
</ObjectPopup>
