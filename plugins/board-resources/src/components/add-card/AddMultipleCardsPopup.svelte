<script lang="ts">
  import board from '../../plugin'
  import { Button, ActionIcon, IconClose, Label } from '@hcengineering/ui'

  export let cardsNumber: number
  export let onAddSingle: () => void
  export let onAddMultiple: () => void
  export let onClose: () => void
</script>

<div class="antiPopup container p-3">
  <div class="flex-row-center header">
    <div class="flex-center flex-grow">
      <Label label={board.string.Create} />
    </div>
    <div class="close-icon">
      <ActionIcon icon={IconClose} size={'small'} action={onClose} />
    </div>
  </div>
  <div class="mt-2">
    <Label label={board.string.CreateDescription} params={{ number: cardsNumber }} />
  </div>
  <div class="mt-4">
    <Button
      label={board.string.CreateMultiple}
      labelParams={{ number: cardsNumber }}
      kind="no-border"
      width={'100%'}
      on:click={onAddMultiple}
    />
  </div>
  <div class="mt-2">
    <Button label={board.string.CreateSingle} kind="no-border" width={'100%'} on:click={onAddSingle} />
  </div>
</div>

<style lang="scss">
  .container {
    max-width: 20rem;
  }

  .close-icon {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
  }

  .header {
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--divider-color);
  }
</style>
