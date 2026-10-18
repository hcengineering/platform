<script lang="ts">
  import { Doc } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Button, IconDownOutline, IconUpOutline } from '@hcengineering/ui'
  import { tick } from 'svelte'
  import { get } from 'svelte/store'
  import view from '../plugin'
  import { ListSelectionProvider, focusStore } from '../selection'
  import { getUpDownNavigationOffset, nextDocumentKeys, previousDocumentKeys } from '../upDownNavigation'
  import { openDoc, restrictionStore } from '../utils'

  export let element: Doc

  const client = getClient()

  // The list the document was opened from. Looked up by document, since the focus could
  // belong to another list (for example sub-issues shown inside the opened document).
  // Re-evaluated on focus changes, which also happen when the list content is updated.
  $: provider = $focusStore !== undefined ? ListSelectionProvider.Find(element._id) : undefined

  let navigating = false

  async function next (offset: 1 | -1): Promise<void> {
    const current = element
    const listProvider = ListSelectionProvider.Find(current._id)
    if (navigating || listProvider === undefined) return
    navigating = true
    try {
      // Let the list resolve the neighbour, so grouping and sorting are respected.
      listProvider.select(offset, current, 'vertical')
      await tick()
      const { focus, provider: focusProvider } = get(focusStore)
      if (focus === undefined || focus._id === current._id || focusProvider !== listProvider) return
      if (!listProvider.docs().some((it) => it._id === focus._id)) return
      await openDoc(client.getHierarchy(), focus)
    } finally {
      navigating = false
    }
  }

  function onKeydown (evt: KeyboardEvent): void {
    if (provider === undefined || $restrictionStore.disableNavigation) return
    const offset = getUpDownNavigationOffset(evt, evt.target as HTMLElement | null)
    if (offset === undefined) return
    evt.preventDefault()
    void next(offset)
  }
</script>

<svelte:window on:keydown={onKeydown} />

{#if provider !== undefined && !$restrictionStore.disableNavigation}
  <Button
    icon={IconUpOutline}
    iconProps={{ size: 'medium' }}
    kind={'icon'}
    dataId={'btnPreviousDocument'}
    showTooltip={{ label: view.string.PreviousItem, keys: previousDocumentKeys }}
    on:click={() => {
      void next(-1)
    }}
  />
  <Button
    icon={IconDownOutline}
    iconProps={{ size: 'medium' }}
    kind={'icon'}
    dataId={'btnNextDocument'}
    showTooltip={{ label: view.string.NextItem, keys: nextDocumentKeys }}
    on:click={() => {
      void next(1)
    }}
  />
{/if}
