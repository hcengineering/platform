<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { AttachedData, Class, Doc, Ref } from '@hcengineering/core'
  import { TagElement, TagReference } from '@hcengineering/tags'
  import { createEventDispatcher } from 'svelte'
  import TagsPopup from './TagsPopup.svelte'

  export let targetClass: Ref<Class<Doc>>
  export let tags: AttachedData<TagReference>[] = []

  $: selected = tags.map((p) => p.tag)

  const dispatch = createEventDispatcher()
  async function addRef ({ title, color, _id: tag }: TagElement): Promise<void> {
    tags.push({
      tag,
      title,
      color
    })
    tags = tags
    dispatch('update', tags)
  }

  async function removeTag (tag: TagElement): Promise<void> {
    tags = tags.filter((t) => t.tag !== tag._id)
    tags = tags
    dispatch('update', tags)
  }

  async function onUpdate (event: CustomEvent<{ action: string; tag: TagElement }>) {
    const result = event.detail
    if (result === undefined) return
    if (result.action === 'add') addRef(result.tag)
    else if (result.action === 'remove') removeTag(result.tag)
  }
</script>

<TagsPopup {targetClass} {selected} on:update={onUpdate} />
