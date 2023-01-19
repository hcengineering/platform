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
  import { Class, Doc, IdMap, Ref, toIdMap } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { TagElement, TagReference } from '@hcengineering/tags'
  import tags from '../plugin'
  import TagItem from './TagItem.svelte'
  import { selectedTagElements } from '@hcengineering/tags'
  import { Label } from '@hcengineering/ui'

  export let object: Doc
  export let _class: Ref<Class<Doc>>

  let elements: IdMap<TagElement> = new Map()
  const elementQuery = createQuery()

  $: elementQuery.query(tags.class.TagElement, { _id: { $in: items.map((it) => it.tag) } }, (result) => {
    elements = toIdMap(result)
  })

  let items: TagReference[] = []

  const query = createQuery()
  $: query.query(
    tags.class.TagReference,
    { attachedTo: object._id, attachedToClass: _class },
    (res) => {
      items = res
    },
    { sort: { weight: -1, title: 1 } }
  )

  $: expert = items.filter((it) => (it.weight ?? 0) >= 6 && (it.weight ?? 0) <= 8)
  $: meaningfull = items.filter((it) => (it.weight ?? 0) >= 3 && (it.weight ?? 0) <= 5)
  $: initial = items.filter((it) => (it.weight ?? 1) >= 0 && (it.weight ?? 0) <= 2)

  $: categories = [
    { items: expert, label: tags.string.Expert },
    { items: meaningfull, label: tags.string.Meaningfull },
    { items: initial, label: tags.string.Initial }
  ]
</script>

<div class="tags flex flex-col">
  {#each categories as cat, ci}
    {#if cat.items.length > 0}
      <div class="text-xs mb-1" class:mt-2={ci > 0 && categories[ci - 1].items.length > 0}>
        <Label label={cat.label} />
      </div>
    {/if}
    <div class="flex-row-center flex-wrap tags">
      {#each cat.items as tag}
        <TagItem {tag} element={elements.get(tag.tag)} selected={$selectedTagElements.includes(tag.tag)} />
      {/each}
    </div>
  {/each}
</div>

<style lang="scss">
  .tags {
    max-width: 20rem;
  }
</style>
