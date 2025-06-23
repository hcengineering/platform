<script lang="ts">
  import { Label } from '@hcengineering/ui'
  import { type IntlString } from '@hcengineering/platform'

  export let label: IntlString
  export let text: string | Promise<string> = ''
</script>

<div class="flex-col clear-mins stats-card" {...$$restProps}>
  <div class="flex-row-center">
    <span class="fs-title">
      <Label {label} />
    </span>
  </div>
  <div class="my-3 flex-grow flex-center stats">
    <span>
      {#if typeof text === 'string'}
        {text}
      {:else}
        {#await text then value}
          {value}
        {/await}
      {/if}
    </span>
  </div>
</div>

<style lang="scss">
  .stats-card {
    flex: 1;
    min-width: 12rem;
    min-height: 10rem;
    padding: 20px;
    box-sizing: border-box;
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.5rem;

    display: flex;

    overflow: hidden;
    word-break: break-word;
  }
  .stats > span {
    font-weight: 400;
    font-size: 2rem;
    color: var(--theme-caption-color);
    user-select: none;
  }
</style>
