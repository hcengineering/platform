<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { Button, Label } from '@hcengineering/ui'
  import login from '@hcengineering/login'

  export let reason: string

  function onSignOut (): void {
    window.location.href = '/login'
  }
</script>

<div class="overlay" role="dialog" aria-modal="true">
  <div class="modal">
    <h2><Label label={login.string.AccountDisabledTitle} /></h2>
    <p>
      <Label label={login.string.AccountDisabledBody} />
    </p>
    <p class="reason">Reason: <strong>{reason}</strong></p>
    <div class="actions">
      <Button label={login.string.SignOut} kind="primary" on:click={onSignOut} />
    </div>
  </div>
</div>

<style lang="scss">
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal {
    background: var(--theme-popup-color);
    color: var(--theme-content-color);
    border-radius: 0.75rem;
    padding: 1.5rem 2rem;
    max-width: 480px;
    width: 90%;
  }
  .reason {
    opacity: 0.7;
    font-size: 0.85rem;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1rem;
  }
</style>
