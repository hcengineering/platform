<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Typed-confirm dialog for the per-account "Delete account" action.
// Delete is irreversible (the server-side `deleteAccount` removes the
// account row, all workspace memberships, mailbox secrets, and
// integration secrets — see server/account/src/operations.ts and
// the corresponding postgres `deleteAccount`). Social IDs are kept
// but marked un-verified so historical createdBy / modifiedBy refs
// keep resolving to a name.
//
// We require the admin to type the literal phrase `DELETE` to confirm,
// matching the style of MassActionConfirm but with single-account
// wording. Lives in a separate component so future copy edits don't
// also affect the bulk-confirm wording.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Button, EditBox } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  export let identityLabel: string  // e.g. "alice@example.com" or "Alice Admin"
  export let workspaceCount: number = 0
  export let isLastAdmin: boolean = false

  const dispatch = createEventDispatcher<{ close: boolean }>()

  const PHRASE = 'DELETE'
  let typedValue = ''
  $: typedMatches = typedValue.trim() === PHRASE
  $: blockingError = isLastAdmin

  function onConfirm (): void {
    if (!typedMatches || blockingError) return
    dispatch('close', true)
  }
  function onCancel (): void {
    dispatch('close', false)
  }
</script>

<div class="delete-account-confirm" data-drawer-keep-open>
  <h3 class="title">Delete account</h3>

  {#if blockingError}
    <div class="banner danger" role="alert">
      Cannot delete the last admin. At least one active admin must remain.
    </div>
    <div class="actions">
      <Button kind={'ghost'} label={getEmbeddedLabel('Close')} on:click={onCancel} />
    </div>
  {:else}
    <p class="message">
      Permanently delete <strong>{identityLabel}</strong>.
    </p>

    <ul class="consequences">
      <li>Account row + password (if any) removed.</li>
      <li>
        Removed from
        <strong>{workspaceCount}</strong>
        {workspaceCount === 1 ? 'workspace' : 'workspaces'}.
      </li>
      <li>Integration secrets, mailbox secrets, and OAuth links cleared.</li>
      <li>Historical comments / created-by refs keep showing the name (social IDs preserved but unverified).</li>
      <li><strong>This is irreversible.</strong> To temporarily lock instead, use Disable.</li>
    </ul>

    <div class="banner danger" role="alert">
      Type <code>{PHRASE}</code> to confirm.
    </div>
    <EditBox bind:value={typedValue} placeholder={getEmbeddedLabel(PHRASE)} kind={'editbox'} />

    <div class="actions">
      <Button kind={'ghost'} label={getEmbeddedLabel('Cancel')} on:click={onCancel} />
      <Button
        kind={'dangerous'}
        label={getEmbeddedLabel('Delete account')}
        disabled={!typedMatches}
        on:click={onConfirm}
      />
    </div>
  {/if}
</div>

<style lang="scss">
  .delete-account-confirm {
    padding: 1rem 1.25rem;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.5rem;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
    min-width: 26rem;
    max-width: 34rem;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .title {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    color: var(--theme-caption-color);
  }

  .message {
    margin: 0;
    font-size: 0.9rem;
    color: var(--theme-content-color);
    line-height: 1.4;
  }

  .consequences {
    margin: 0;
    padding-left: 1.1rem;
    font-size: 0.82rem;
    color: var(--theme-darker-color);
    line-height: 1.45;

    li + li {
      margin-top: 0.2rem;
    }

    strong {
      color: var(--theme-content-color);
    }
  }

  .banner.danger {
    padding: 0.6rem 0.85rem;
    background: rgba(239, 68, 68, 0.10);
    border: 1px solid rgba(239, 68, 68, 0.35);
    border-radius: 0.35rem;
    color: var(--theme-state-negative-color, #b91c1c);
    font-size: 0.85rem;
    line-height: 1.4;

    code {
      font-family: var(--mono-font, 'SF Mono', 'Menlo', 'Consolas', monospace);
      font-weight: 600;
      background: rgba(239, 68, 68, 0.15);
      padding: 0.05rem 0.3rem;
      border-radius: 0.2rem;
    }
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.4rem;
    margin-top: 0.25rem;
  }
</style>
