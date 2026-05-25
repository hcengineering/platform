<!--
// Copyright © 2026 Hardcore Engineering Inc.
// Confirm dialog for mass actions that protects against unfiltered
// application. When the caller passes dangerousScope=true (admin would
// hit the entire universe with no filter in place), a typed confirmation
// is required ("ARCHIVE ALL" / "DISABLE ALL" / etc.). Otherwise it
// behaves as a standard confirmation. The "is this dangerous?" decision
// lives in the caller because only the page knows what "universe" means
// (filters? pagination? unfiltered count?).
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Button, EditBox } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  export let title: string                       // e.g. "Mass Archive 13"
  export let affectedCount: number               // e.g. 13
  export let filterSummary: string               // e.g. "No filter set" or "Filter: mode, region"
  export let typedConfirmPhrase: string          // e.g. "ARCHIVE ALL"
  export let actionLabel: string                 // e.g. "Archive"
  export let dangerous: boolean = true
  // Caller decides whether this invocation is a footgun (e.g. no filter
  // active + every row selected). Keeps the policy in the page that
  // knows what "universe" means, instead of forcing this component to
  // know about filters/pagination.
  export let dangerousScope: boolean = false
  export let helperText: string = ''             // Optional one-liner below the count

  const dispatch = createEventDispatcher<{ close: boolean }>()

  $: requiresTypedConfirm = dangerousScope && affectedCount > 0
  let typedValue = ''
  $: typedMatches = !requiresTypedConfirm || typedValue.trim() === typedConfirmPhrase

  function onConfirm (): void {
    if (!typedMatches) return
    dispatch('close', true)
  }
  function onCancel (): void {
    dispatch('close', false)
  }
</script>

<!-- data-drawer-keep-open on the root prevents AdminUsersDrawer (when -->
<!-- the popup opens from inside the drawer) from closing on interaction -->
<div class="mass-action-confirm" data-drawer-keep-open>
  <h3 class="title">{title}</h3>

  {#if requiresTypedConfirm}
    <div class="banner danger" role="alert">
      <strong>{filterSummary}</strong> — this will {actionLabel.toLowerCase()} ALL {affectedCount} item(s) in the
      system. Type <code>{typedConfirmPhrase}</code> to confirm.
    </div>
    <EditBox bind:value={typedValue} placeholder={getEmbeddedLabel(typedConfirmPhrase)} kind={'editbox'} />
    {#if helperText !== ''}
      <span class="helper">{helperText}</span>
    {/if}
  {:else}
    <p class="message">
      {filterSummary}<br />
      About to {actionLabel.toLowerCase()} <strong>{affectedCount}</strong> item(s).
      {#if helperText !== ''}
        <br /><span class="helper">{helperText}</span>
      {/if}
    </p>
  {/if}

  <div class="actions">
    <Button kind={'ghost'} label={getEmbeddedLabel('Cancel')} on:click={onCancel} />
    <Button
      kind={dangerous ? 'dangerous' : 'primary'}
      label={getEmbeddedLabel(actionLabel)}
      disabled={!typedMatches}
      on:click={onConfirm}
    />
  </div>
</div>

<style lang="scss">
  .mass-action-confirm {
    padding: 1rem 1.25rem;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.5rem;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
    min-width: 24rem;
    max-width: 32rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .title {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    color: var(--theme-caption-color);
  }

  .message {
    margin: 0;
    font-size: 0.875rem;
    color: var(--theme-content-color);
    line-height: 1.4;
  }

  .banner.danger {
    padding: 0.75rem 0.85rem;
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

  .helper {
    font-size: 0.78rem;
    color: var(--theme-darker-color);
    line-height: 1.4;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.4rem;
    margin-top: 0.25rem;
  }
</style>
