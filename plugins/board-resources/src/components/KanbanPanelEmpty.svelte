<script lang="ts">
  import { ActionIcon, Button, EditBox, IconAdd, IconClose } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import board from '../plugin'

  const dispatch = createEventDispatcher()

  let isAdding = false
  let newPanelTitle = ''

  async function onAdd () {
    if (!newPanelTitle) return
    dispatch('add', newPanelTitle)
    newPanelTitle = ''
    isAdding = false
  }
</script>

<div class="panel-container step-lr75">
  {#if isAdding}
    <EditBox bind:value={newPanelTitle} maxWidth={'19rem'} placeholder={board.string.NewListPlaceholder} focus={true} />
    <div class="list-add-controls">
      <Button
        icon={IconAdd}
        label={board.string.AddList}
        justify={'left'}
        on:click={() => {
          onAdd()
        }}
      />
      <ActionIcon
        icon={IconClose}
        size={'large'}
        action={() => {
          isAdding = false
        }}
      />
    </div>
  {:else}
    <Button
      icon={IconAdd}
      label={board.string.NewList}
      justify={'left'}
      on:click={() => {
        isAdding = true
      }}
    />
  {/if}
</div>

<style lang="scss">
  .panel-container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 20rem;
    height: fit-content;
    background-color: transparent;
    border: 0.125rem solid transparent;
    border-radius: 0.25rem;
  }
  .list-add-controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin: 0.5rem 0 0 0;
  }
</style>
