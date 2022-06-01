<script lang="ts">
  import { Doc, Ref } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import tags, { TagElement } from '@anticrm/tags'
  import TagsPopup from './TagsPopup.svelte'

  export let object: Doc

  let selected: Ref<TagElement>[] = []
  const query = createQuery()
  $: query.query(tags.class.TagReference, { attachedTo: object._id }, (result) => {
    selected = result.map(({ tag }) => tag)
  })
  const client = getClient()
  async function addRef ({ title, color, _id: tag }: TagElement): Promise<void> {
    await client.addCollection(tags.class.TagReference, object.space, object._id, object._class, 'labels', {
      title,
      color,
      tag
    })
  }
  async function removeTag (tag: TagElement): Promise<void> {
    const tagRef = await client.findOne(tags.class.TagReference, { tag: tag._id })
    if (tagRef) await client.remove(tagRef)
  }
  async function onUpdate (event: CustomEvent<{ action: string; tag: TagElement }>) {
    const result = event.detail
    if (result === undefined) return
    if (result.action === 'add') addRef(result.tag)
    else if (result.action === 'remove') removeTag(result.tag)
  }
</script>

<TagsPopup targetClass={object._class} {selected} on:update={onUpdate} />
