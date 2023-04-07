<script lang="ts">
  import { IntlString } from '@hcengineering/platform'
  import { AnyAttribute, Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import type { TagReference, TagElement } from '@hcengineering/tags'
  import tags from '@hcengineering/tags'
  import { getEventPopupPositionElement, Icon, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import TagReferencePresenter from './TagReferencePresenter.svelte'
  import TagsEditorPopup from './TagsEditorPopup.svelte'

  export let object: Doc
  export let label: IntlString
  export let readonly: boolean = false
  export let attr: AnyAttribute | undefined = undefined

  let items: TagReference[] = []
  const query = createQuery()
  const client = getClient()

  $: query.query(tags.class.TagReference, { attachedTo: object._id }, (result) => {
    items = result
  })
  async function tagsHandler (evt: MouseEvent): Promise<void> {
    if (readonly) return
    showPopup(TagsEditorPopup, { object }, getEventPopupPositionElement(evt))
  }
  async function removeTag (tag: Ref<TagElement>): Promise<void> {
    const tagRef = await client.findOne(tags.class.TagReference, { tag })
    if (tagRef) await client.remove(tagRef)
  }
</script>

{#if items.length}
  <div class="flex-row-center flex-wrap">
    {#each items as value}
      <div class="step-container">
        <TagReferencePresenter
          {attr}
          {value}
          isEditable={!readonly}
          kind={'labels'}
          on:remove={(res) => removeTag(res.detail)}
        />
      </div>
    {/each}
    {#if !readonly}
      <div class="step-container">
        <button class="tag-button" on:click|stopPropagation={tagsHandler}>
          <div class="icon"><Icon icon={IconAdd} size={'full'} /></div>
          <span class="overflow-label label"><Label {label} /></span>
        </button>
      </div>
    {/if}
  </div>
{:else if !readonly}
  <button class="tag-button" style="width: min-content" on:click|stopPropagation={tagsHandler}>
    <div class="icon"><Icon icon={IconAdd} size={'full'} /></div>
    <span class="overflow-label label"><Label {label} /></span>
  </button>
{/if}

<style lang="scss">
  .step-container {
    margin: 0.125rem 0.125rem 0 0;
  }
  .tag-button {
    overflow: hidden;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: 0 0.5rem;
    height: 1.5rem;
    min-width: 0;
    min-height: 0;
    color: var(--content-color);
    border: 1px solid transparent;
    border-radius: 0.75rem;

    .icon {
      flex-shrink: 0;
      width: 0.625rem;
      height: 0.625rem;
    }
    .label {
      margin-left: 0.125rem;
    }
    &:hover {
      color: var(--caption-color);
      border-color: var(--divider-color);
    }
  }
</style>
