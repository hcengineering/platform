<script lang="ts">
  import { AnyAttribute, Class, Doc, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import type { TagReference } from '@hcengineering/tags'
  import tags from '@hcengineering/tags'
  import { Icon, Label, getEventPopupPositionElement, showPopup } from '@hcengineering/ui'
  import TagReferencePresenter from './TagReferencePresenter.svelte'
  import TagsEditorPopup from './TagsEditorPopup.svelte'
  import TagIcon from './icons/TagIcon.svelte'

  export let object: Doc
  export let label: IntlString = tags.string.AddLabel
  export let readonly: boolean = false
  export let attr: AnyAttribute | undefined = undefined
  export let targetClass: Ref<Class<Doc>> = object._class

  let items: TagReference[] = []
  const query = createQuery()
  const client = getClient()

  $: query.query(tags.class.TagReference, { attachedTo: object._id }, (result) => {
    items = result
  })
  async function tagsHandler (evt: MouseEvent): Promise<void> {
    if (readonly) return
    showPopup(TagsEditorPopup, { object, targetClass }, getEventPopupPositionElement(evt))
  }
  async function removeTag (tag: TagReference): Promise<void> {
    if (tag !== undefined) await client.remove(tag)
  }
</script>

{#if items.length}
  <div class="flex-row-center flex-wrap">
    {#each items as value}
      <div class="step-container clear-mins">
        <TagReferencePresenter
          {attr}
          {value}
          isEditable={!readonly}
          kind={'list'}
          on:remove={(res) => removeTag(res.detail)}
        />
      </div>
    {/each}
    {#if !readonly}
      <div class="step-container clear-mins">
        <button class="tag-button" on:click|stopPropagation={tagsHandler}>
          <div class="icon"><Icon icon={TagIcon} size={'full'} /></div>
          <span class="overflow-label label"><Label {label} /></span>
        </button>
      </div>
    {/if}
  </div>
{:else if !readonly}
  <button class="tag-button" style="width: min-content" on:click|stopPropagation={tagsHandler}>
    <div class="icon"><Icon icon={TagIcon} size={'full'} /></div>
    <span class="overflow-label label"><Label {label} /></span>
  </button>
{/if}

<style lang="scss">
  .step-container {
    margin: 0.375rem 0.375rem 0 0;
  }
  .tag-button {
    overflow: hidden;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: 0 0.625rem 0 0.5rem;
    height: 2rem;
    min-width: 0;
    min-height: 0;
    color: var(--theme-content-color);
    border: 1px solid transparent;
    border-radius: 1rem;

    .icon {
      flex-shrink: 0;
      width: 1rem;
      height: 1rem;
    }
    .label {
      margin-left: 0.25rem;
    }
    &:hover {
      color: var(--theme-caption-color);
      border-color: var(--theme-divider-color);
    }
  }
</style>
