<script lang="ts">
  import { Button, IconAdd, TextAreaEditor } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import board from '../plugin'

  const dispatch = createEventDispatcher()

  let isOpened = false
  let value = ''

  async function onAdd () {
    if (!value) return
    dispatch('add', value)
    value = ''
    isOpened = false
  }
</script>

<div class="flex-col min-w-80 step-lr75">
  {#if isOpened}
    <TextAreaEditor
      bind:value
      placeholder={board.string.NewListPlaceholder}
      submitLabel={board.string.AddList}
      on:submit={onAdd}
      on:cancel={() => {
        isOpened = false
      }}
    />
  {:else}
    <Button
      icon={IconAdd}
      label={board.string.NewList}
      justify={'left'}
      kind={'ghost'}
      on:click={() => {
        isOpened = true
      }}
    />
  {/if}
</div>
