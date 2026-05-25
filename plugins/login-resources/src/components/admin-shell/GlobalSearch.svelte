<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { EditBox, navigate, getCurrentLocation } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { getAccountClient } from '../../utils'
  import type { AccountListRow } from '@hcengineering/account-client'
  import { DEBOUNCE_MS } from '../admin-shared/constants'

  let query = ''
  let results: AccountListRow[] = []
  let active = false
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  async function runSearch (): Promise<void> {
    const q = query.trim()
    if (q === '') { results = []; return }
    try {
      const res = await getAccountClient(null).listAccountsAdmin({
        search: q,
        pagination: { limit: 8, offset: 0 }
      })
      results = res.accounts
    } catch {
      results = []
    }
  }

  // Svelte 4 static dependency tracking only sees identifiers used directly
  // inside the reactive block — `query` is otherwise hidden behind the
  // runSearch() closure, so the block would never re-run on input. Read
  // `query` explicitly so the block is invalidated on every keystroke.
  $: {
    void query
    if (debounceTimer != null) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => { void runSearch() }, DEBOUNCE_MS)
  }

  function onKeyDown (ev: KeyboardEvent): void {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'k') {
      ev.preventDefault()
      active = true
      setTimeout(() => { document.querySelector<HTMLInputElement>('.gs-input input')?.focus() }, 0)
    } else if (ev.key === 'Escape' && active) {
      active = false
    }
  }

  function openUser (uuid: string): void {
    const loc = getCurrentLocation()
    loc.path[0] = 'login'
    loc.path[1] = 'admin'
    loc.path[2] = 'users'
    loc.path.length = 3
    loc.query = { ...(loc.query ?? {}), drawer: uuid }
    navigate(loc)
    active = false
    query = ''
    results = []
  }

  onMount(() => {
    document.addEventListener('keydown', onKeyDown)
  })

  onDestroy(() => {
    document.removeEventListener('keydown', onKeyDown)
  })
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div class="gs-trigger" role="button" tabindex="0" on:click={() => { active = true }} on:keydown={(e) => { if (e.key === 'Enter') active = true }}>
  <span class="gs-trigger-text">Find a user…</span>
  <kbd>Ctrl+K</kbd>
</div>

{#if active}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <div class="gs-overlay" on:click|self={() => { active = false }}>
    <div class="gs-panel" data-drawer-keep-open>
      <div class="gs-input">
        <EditBox bind:value={query} placeholder={getEmbeddedLabel('Find a user by name or email…')} kind="editbox" />
      </div>
      {#if results.length > 0}
        <ul class="gs-results">
          {#each results as r}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <li on:click={() => openUser(String(r.uuid))}>
              <strong>{r.firstName} {r.lastName}</strong>
              <span class="gs-email">{r.primaryEmail ?? ''}</span>
            </li>
          {/each}
        </ul>
      {:else if query.trim() !== ''}
        <p class="gs-empty">No matches.</p>
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  .gs-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.6rem;
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.35rem;
    cursor: pointer;
    color: var(--theme-darker-color);
    font-size: 0.8rem;

    kbd {
      font-size: 0.7rem;
      padding: 0.05rem 0.3rem;
      border: 1px solid var(--theme-divider-color);
      border-radius: 0.2rem;
      background: var(--theme-bg-color);
    }
  }

  .gs-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 9500;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 8vh;
  }

  .gs-panel {
    width: 28rem;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.5rem;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }

  .gs-input {
    padding: 0.75rem;
    border-bottom: 1px solid var(--theme-divider-color);
  }

  .gs-results {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 24rem;
    overflow-y: auto;

    li {
      padding: 0.5rem 0.85rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      border-bottom: 1px solid var(--theme-divider-color);

      &:last-child { border-bottom: 0; }
      &:hover { background: var(--theme-list-row-color, rgba(96, 165, 250, 0.06)); }

      .gs-email {
        font-size: 0.78rem;
        color: var(--theme-darker-color);
      }
    }
  }

  .gs-empty {
    padding: 1rem;
    text-align: center;
    color: var(--theme-darker-color);
    font-size: 0.85rem;
  }
</style>
