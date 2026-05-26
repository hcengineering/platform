<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Button } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  export let count: number = 0

  const dispatch = createEventDispatcher<{
    'deselect-all': void
    add: void
    remove: void
    disable: void
    enable: void
    reset: void
  }>()
</script>

<div class="bar" class:hidden={count === 0}>
  <span class="label">{count} selected</span>
  <button class="link" on:click={() => dispatch('deselect-all')}>Clear</button>
  <div class="spacer" />
  <Button label={getEmbeddedLabel('Add to workspace')} on:click={() => dispatch('add')} />
  <Button label={getEmbeddedLabel('Remove from workspace')} on:click={() => dispatch('remove')} />
  <Button label={getEmbeddedLabel('Disable')} kind={'dangerous'} on:click={() => dispatch('disable')} />
  <Button label={getEmbeddedLabel('Enable')} on:click={() => dispatch('enable')} />
  <Button label={getEmbeddedLabel('Send password reset')} on:click={() => dispatch('reset')} />
</div>

<style lang="scss">
  /*
   * Sticky bulk-action bar pinned to the top of the scroll container, just
   * above the table — follows the standard data-grid convention rather than
   * the bottom-toolbar pattern. Hidden (display:none) when no rows are
   * selected so it does not steal keyboard focus or screen-reader narration
   * during single-row workflows.
   */
  .bar {
    position: sticky;
    top: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 1rem;
    margin-bottom: var(--spacing-2);
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    width: 100%;
    max-width: 76rem;
    z-index: 5;
  }

  .hidden {
    display: none;
  }

  .label {
    font-weight: 500;
    color: var(--theme-caption-color);
    font-size: 0.85rem;
  }

  .link {
    background: transparent;
    border: 0;
    color: var(--theme-link-color, #3b82f6);
    cursor: pointer;
    font-size: 0.82rem;
    padding: 0;

    &:hover {
      text-decoration: underline;
    }
  }

  .spacer {
    flex: 1;
  }
</style>
