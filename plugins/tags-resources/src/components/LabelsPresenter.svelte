<script lang="ts">
  import { Doc, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import type { TagReference } from '@hcengineering/tags'
  import tags from '@hcengineering/tags'
  import { getEventPopupPositionElement, showPopup, resizeObserver } from '@hcengineering/ui'
  import TagReferencePresenter from './TagReferencePresenter.svelte'
  import TagsEditorPopup from './TagsEditorPopup.svelte'
  import { createEventDispatcher, afterUpdate } from 'svelte'

  export let object: WithLookup<Doc>
  export let full: boolean
  export let ckeckFilled: boolean = false
  export let kind: 'short' | 'full' | 'list' | 'kanban' = 'short'
  export let isEditable: boolean = false
  export let action: (evt: MouseEvent) => Promise<void> | void = async () => {}
  export let compression: boolean = false

  export let lookupField: string | undefined

  const dispatch = createEventDispatcher()

  let items: TagReference[] = []
  const query = createQuery()

  $: if (lookupField === undefined) {
    query.query(tags.class.TagReference, { attachedTo: object._id }, (result) => {
      items = result
    })
  } else {
    query.unsubscribe()
    items = (object.$lookup as any)[lookupField]
  }
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

{#if kind === 'list' || kind === 'kanban'}
  {#each items as value}
    <div class="label-box no-shrink" title={value.title}>
      <TagReferencePresenter attr={undefined} {value} kind={kind === 'kanban' ? 'kanban-labels' : 'labels'} />
    </div>
  {/each}
{:else}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="labels-container"
    style:justify-content={kind === 'short' ? 'space-between' : 'flex-start'}
    class:w-full={kind === 'full'}
    style:flex-wrap={kind === 'short' || compression ? 'nowrap' : 'wrap'}
    style:flex-shrink={compression ? 1 : 0}
    use:resizeObserver={(element) => {
      allWidth = element.clientWidth
    }}
    on:click|stopPropagation={(evt) => {
      if (isEditable) tagsHandler(evt)
      else action(evt)
    }}
  >
    {#each items as value, i}
      <div class="label-box wrap-{kind}" title={value.title}>
        <TagReferencePresenter attr={undefined} {value} kind={'kanban-labels'} bind:realWidth={widths[i]} />
      </div>
    {/each}
  </div>
{/if}

<style lang="scss">
  .labels-container {
    overflow: hidden;
    display: flex;
    align-items: center;
    // flex-shrink: 0;
    min-width: 0;
    border-radius: 0.25rem;
  }

  .label-box {
    display: flex;
    align-items: center;
    flex-shrink: 10;
    width: auto;
    min-width: 0;
    border-radius: 0.25rem;
    transition: box-shadow 0.15s ease-in-out;

    &:not(.no-shrink):last-child {
      flex-shrink: 0;
    }
  }
  .wrap-short:not(:last-child) {
    margin-right: 0.375rem;
  }
  .wrap-full {
    margin: 0.125rem;
  }
</style>
