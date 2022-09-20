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
  import type { Class, Doc, Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { TagElement, TagReference } from '@hcengineering/tags'
  import tags from '../plugin'
  import TagItem from './TagItem.svelte'
  import { selectedTagElements } from '@hcengineering/tags'

  export let object: Doc
  export let _class: Ref<Class<Doc>>

  let elements: Map<Ref<TagElement>, TagElement> = new Map()
  const elementQuery = createQuery()

  $: elementQuery.query(tags.class.TagElement, { _id: { $in: items.map((it) => it.tag) } }, (result) => {
    elements = new Map(result.map((it) => [it._id, it]))
  })

  let items: TagReference[] = []

  const query = createQuery()
  $: query.query(
    tags.class.TagReference,
    { attachedTo: object._id, attachedToClass: _class },
    (res) => {
      items = res
    },
    { sort: { title: 1 } }
  )
</script>

<div class="tags flex flex-wrap">
  {#each items as tag}
    <TagItem {tag} element={elements.get(tag.tag)} selected={$selectedTagElements.includes(tag.tag)} />
  {/each}
</div>

<style lang="scss">
  .tags {
    max-width: 20rem;
  }
</style>
