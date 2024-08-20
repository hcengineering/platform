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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import tags, { TagElement, TagsEvents } from '@hcengineering/tags'
  import { Analytics } from '@hcengineering/analytics'

  import TagsPopup from './TagsPopup.svelte'
  import { getObjectId } from '@hcengineering/view-resources'

  export let object: Doc
  export let targetClass: Ref<Class<Doc>> = object._class

  let selected: Ref<TagElement>[] = []
  const query = createQuery()
  $: query.query(tags.class.TagReference, { attachedTo: object._id }, (result) => {
    selected = result.map(({ tag }) => tag)
  })
  const client = getClient()
  const hierarchy = client.getHierarchy()
  async function addRef ({ title, color, _id: tag }: TagElement): Promise<void> {
    // check if tag already attached, could happen if 'add' clicked faster than ui updates
    const containsTag = selected.some((refElement) => refElement === tag)
    if (containsTag) {
      return
    }

    selected.push(tag)

    await client.addCollection(tags.class.TagReference, object.space, object._id, object._class, 'labels', {
      title,
      color,
      tag
    })
    const id = await getObjectId(object, hierarchy)
    Analytics.handleEvent(TagsEvents.TagCreated, { objectId: id, objectClass: object._class })
  }

  async function removeTag (tag: TagElement): Promise<void> {
    const tagRef = await client.findOne(tags.class.TagReference, { tag: tag._id, attachedTo: object._id })
    if (tagRef) {
      await client.remove(tagRef)
      selected.splice(selected.indexOf(tag._id), 1)
      const id = await getObjectId(object, hierarchy)
      Analytics.handleEvent(TagsEvents.TagRemoved, { objectId: id, objectClass: object._class })
    }
  }

  async function onUpdate (event: CustomEvent<{ action: string, tag: TagElement }>) {
    const result = event.detail
    if (result === undefined) return
    if (result.action === 'add') addRef(result.tag)
    else if (result.action === 'remove') removeTag(result.tag)
  }
</script>

<TagsPopup {targetClass} {selected} on:update={onUpdate} />
