<!--
// Copyright © 2026 Hardcore Engineering Inc.
// Stub - full implementation in Task 25.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let accountUuid: string

  const dispatch = createEventDispatcher<{ close: void, 'account-changed': void }>()

  function onClose (): void {
    dispatch('close')
  }
</script>

<aside class="drawer" role="dialog" aria-modal="true">
  <header>
    <h2>Account details</h2>
    <button class="close" on:click={onClose}>×</button>
  </header>
  <p class="placeholder">Detail view for <code>{accountUuid}</code> — implementation in progress.</p>
</aside>

<style lang="scss">
  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 480px;
    max-width: 100vw;
    background: var(--theme-popup-color);
    color: var(--theme-content-color);
    border-left: 1px solid var(--theme-divider-color);
    box-shadow: -4px 0 16px rgba(0, 0, 0, 0.2);
    z-index: 9000;
    padding: 1.5rem;
    overflow-y: auto;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .close {
    background: transparent;
    border: 0;
    font-size: 1.5rem;
    cursor: pointer;
    color: inherit;
  }
  .placeholder {
    opacity: 0.7;
  }
</style>
