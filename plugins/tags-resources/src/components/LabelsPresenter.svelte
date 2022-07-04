<script lang="ts">
  import { Doc } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import type { TagReference } from '@anticrm/tags'
  import tags from '@anticrm/tags'
  import { getEventPopupPositionElement, showPopup } from '@anticrm/ui'
  import TagReferencePresenter from './TagReferencePresenter.svelte'
  import TagsEditorPopup from './TagsEditorPopup.svelte'
  import { createEventDispatcher, afterUpdate } from 'svelte'

  export let object: Doc
  export let full: boolean
  export let ckeckFilled: boolean = false

  const dispatch = createEventDispatcher()

  let items: TagReference[] = []
  const query = createQuery()

  $: query.query(tags.class.TagReference, { attachedTo: object._id }, (result) => {
    items = result
  })
  async function tagsHandler (evt: MouseEvent): Promise<void> {
    showPopup(TagsEditorPopup, { object }, getEventPopupPositionElement(evt))
  }

  let allWidth: number
  const widths: number[] = []

  afterUpdate(() => {
    let count: number = 0
    widths.forEach((i) => (count += i))
    full = count > allWidth
    dispatch('change', { full, ckeckFilled })
  })
</script>

<div class="labels-container" bind:clientWidth={allWidth} on:click={tagsHandler}>
  {#each items as value, i}
    <div class="label-box">
      <TagReferencePresenter {value} kind={'labels'} size={'small'} bind:realWidth={widths[i]} />
    </div>
  {/each}
</div>

<style lang="scss">
  .labels-container {
    overflow: hidden;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: nowrap;
    flex-shrink: 0;
    width: 100%;
    min-width: 0;
    border-radius: 0.25rem;
  }

  .label-box {
    display: flex;
    align-items: center;
    flex-shrink: 10;
    width: auto;
    min-width: 0;
    background-color: var(--board-card-bg-color);
    border-radius: 0.25rem;
    transition: box-shadow 0.15s ease-in-out;

    &:last-child {
      flex-shrink: 0;
    }
    &:not(:last-child) {
      margin-right: 0.375rem;
    }
    // &:not(:first-child) {
    //   box-shadow: -1px 0 1px 0 rgb(0 0 0 / 15%);
    //   &:hover {
    //     box-shadow: -2px 0 1px 0 rgb(0 0 0 / 25%);
    //   }
    // }
  }
</style>
