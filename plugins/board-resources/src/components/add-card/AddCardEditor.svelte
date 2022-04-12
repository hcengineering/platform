<script lang='ts'>
  import { Button, TextArea, ActionIcon, IconClose } from '@anticrm/ui'
  import board from '../../plugin'

  export let onClose: () => void
  export let onAdd: (title: string, checkNewLine?: boolean) => Promise<any>

  let isEditing = false
  let title = ''
  let inputRef: TextArea
  let openedContainerRef: HTMLDivElement

  async function addCard() {
    if (!title) {
      inputRef.focus()
      return
    }

    isEditing = false
    await onAdd(title, true)
    title = ''
  }

  async function onClickOutside(e: any) {
    if (openedContainerRef && !openedContainerRef.contains(e.target) && !e.defaultPrevented && isEditing) {
      if (title) {
        await onAdd(title)
      }

      onClose()
    }
  }

  const onKeydown = (e: any) => {
    if (e.detail.key !== 'Enter') {
      return;
    }

    e.detail.preventDefault()
    addCard()
  };

  $: if (inputRef && !title) {
    isEditing = true
    inputRef.focus()
  }
</script>

<svelte:window on:click={onClickOutside}/>
<div bind:this={openedContainerRef}>
    <div class="card-container">
    <TextArea
        placeholder={board.string.CardTitlePlaceholder}
        bind:this={inputRef}
        bind:value={title}
        on:keydown={onKeydown}
        noFocusBorder={true}
    />
    </div>
    <div class="flex-row-center mt-3">
    <Button label={board.string.AddCard} kind="no-border" on:click={addCard} />
    <div class="ml-2" on:click={onClose}>
        <ActionIcon icon={IconClose} size={'large'} action={onClose} />
    </div>
    </div>
</div>

<style lang="scss">
  .card-container {
    display: flex;
    flex-direction: column;
    padding: 0.5rem 1rem;
    background-color: var(--board-card-bg-color);
    border: 1px solid var(--board-card-bg-color);
    border-radius: 0.25rem;
    user-select: none;
  }
</style>