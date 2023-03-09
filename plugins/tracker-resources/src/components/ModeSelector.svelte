<script lang="ts">
  import { IntlString } from '@hcengineering/platform'
  import { Button } from '@hcengineering/ui'

  export let mode: string
  export let config: [string, IntlString, object][]
  export let onChange: (_mode: string) => void

  function getButtonShape (i: number) {
    if (config.length === 1) return 'round'
    switch (i) {
      case 0:
        return 'rectangle-right'
      case config.length - 1:
        return 'rectangle-left'
      default:
        return 'rectangle'
    }
  }
</script>

<div class="itemsContainer">
  {#each config as [_mode, label, params], i}
    <div class="buttonWrapper">
      <Button
        {label}
        labelParams={params}
        size="small"
        on:click={() => onChange(_mode)}
        selected={_mode === mode}
        shape={getButtonShape(i)}
      />
    </div>
  {/each}
</div>

<style lang="scss">
  .itemsContainer {
    display: flex;
    align-items: center;
    padding: 0.65rem 1.35rem 0.65rem 2.25rem;
    border-top: 1px solid var(--divider-color);
  }
  .buttonWrapper {
    margin-right: 1px;

    &:last-child {
      margin-right: 0;
    }
  }
</style>
