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
  import { Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import tags, { TagElement, TagReference } from '@hcengineering/tags'
  import TagsPopup from './TagsPopup.svelte'

  export let value: Doc | Doc[]
  $: objects = Array.isArray(value) ? value : [value]

  let selected: Ref<TagElement>[] = []
  let tagRefs: TagReference[] = []
  const query = createQuery()
  $: query.query(tags.class.TagReference, { attachedTo: { $in: objects.map((p) => p._id) } }, (result) => {
    tagRefs = result
    const res: Record<Ref<TagElement>, TagReference> = {}
    for (const value of result) {
      const arr = (res as any)[value.tag] ?? []
      arr.push(value)
      ;(res as any)[value.tag] = arr
    }
    const sel: Ref<TagElement>[] = []
    for (const value in res) {
      if ((res as any)[value].length === objects.length) {
        sel.push(value as Ref<TagElement>)
      }
    }
    selected = sel
  })

  const client = getClient()
  async function addRef ({ title, color, _id: tag }: TagElement): Promise<void> {
    await Promise.all(
      objects.map(async (object) => {
        if (tagRefs.findIndex((p) => p.attachedTo === object._id && p.tag === tag) !== -1) return

        await client.addCollection(tags.class.TagReference, object.space, object._id, object._class, 'labels', {
          title,
          color,
          tag
        })
      })
    )
  }
  async function removeTag (tag: TagElement): Promise<void> {
    await Promise.all(
      objects.map(async (object) => {
        const tagRef = await client.findOne(tags.class.TagReference, { attachedTo: object._id, tag: tag._id })
        if (tagRef) await client.remove(tagRef)
      })
    )
  }
  async function onUpdate (event: CustomEvent<{ action: string; tag: TagElement }>) {
    const result = event.detail
    if (result === undefined) return
    if (result.action === 'add') addRef(result.tag)
    else if (result.action === 'remove') removeTag(result.tag)
  }
</script>

<TagsPopup targetClass={objects[0]._class} {selected} on:update={onUpdate} />
