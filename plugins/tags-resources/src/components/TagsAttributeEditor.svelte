<script lang="ts">
  import { Doc } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import tags, { TagReference } from '@anticrm/tags'

  import { getEventPopupPositionElement, Icon, IconAdd, showPopup } from '@anticrm/ui'

  import Button from '@anticrm/ui/src/components/Button.svelte'
  import TagReferencePresenter from './TagReferencePresenter.svelte'
  import TagsEditorPopup from './TagsEditorPopup.svelte'

  export let object: Doc
  export let isEditable: boolean = true

  let items: TagReference[] = []
  const query = createQuery()
  $: query.query(tags.class.TagReference, { attachedTo: object._id }, (result) => {
    items = result
  })
  async function tagsHandler (evt: MouseEvent): Promise<void> {
    if (!isEditable) return
    showPopup(TagsEditorPopup, { object }, getEventPopupPositionElement(evt))
  }
</script>

{#if items.length}
  <div class="flex-row-center flex-wrap flex-gap-1 ml-4" on:click={tagsHandler}>
    {#each items as value}
      <TagReferencePresenter {value} />
    {/each}
  </div>
{:else if isEditable}
  <Button kind="link" on:click={tagsHandler}>
    <Icon icon={IconAdd} slot="content" size="small" />
  </Button>
{/if}
