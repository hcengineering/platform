<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let filter: {
    search?: string
    authMethod?: 'all' | 'email_only' | 'oidc' | 'mixed'
    status?: 'all' | 'active' | 'disabled'
    workspaceUuids?: string[]
  } = { status: 'active' }

  const dispatch = createEventDispatcher<{ change: typeof filter }>()
  let searchValue = filter.search ?? ''
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  function onSearchInput (): void {
    if (debounceTimer != null) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      filter = { ...filter, search: searchValue !== '' ? searchValue : undefined }
      dispatch('change', filter)
    }, 300)
  }

  function onAuthChange (e: Event): void {
    const v = (e.target as HTMLSelectElement).value as typeof filter.authMethod
    filter = { ...filter, authMethod: v }
    dispatch('change', filter)
  }

  function onStatusChange (e: Event): void {
    const v = (e.target as HTMLSelectElement).value as typeof filter.status
    filter = { ...filter, status: v }
    dispatch('change', filter)
  }
</script>

<div class="filter-bar">
  <div class="search-wrap">
    <svg class="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
    <input
      class="search"
      type="text"
      placeholder="Search by name or email…"
      bind:value={searchValue}
      on:input={onSearchInput}
    />
  </div>
  <div class="select-wrap">
    <select on:change={onAuthChange} value={filter.authMethod ?? 'all'}>
      <option value="all">All auth methods</option>
      <option value="email_only">Email only</option>
      <option value="oidc">OIDC only</option>
      <option value="mixed">Email + OIDC</option>
    </select>
  </div>
  <div class="select-wrap">
    <select on:change={onStatusChange} value={filter.status ?? 'active'}>
      <option value="all">All statuses</option>
      <option value="active">Active</option>
      <option value="disabled">Disabled</option>
    </select>
  </div>
</div>

<style lang="scss">
  .filter-bar {
    display: flex;
    gap: 0.6rem;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--theme-divider-color);
    align-items: center;
  }

  .search-wrap {
    position: relative;
    flex: 1;
    max-width: 480px;
  }

  .search-icon {
    position: absolute;
    left: 0.65rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--theme-content-color);
    opacity: 0.4;
    pointer-events: none;
  }

  .search {
    width: 100%;
    padding: 0.5rem 0.65rem 0.5rem 2rem;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-bg-color);
    color: var(--theme-content-color);
    border-radius: 0.4rem;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 120ms ease;

    &:focus {
      border-color: var(--theme-content-color);
    }

    &::placeholder {
      color: var(--theme-content-color);
      opacity: 0.4;
    }
  }

  .select-wrap select {
    padding: 0.5rem 0.65rem;
    border: 1px solid var(--theme-divider-color);
    background: var(--theme-bg-color);
    color: var(--theme-content-color);
    border-radius: 0.4rem;
    font-size: 0.9rem;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: var(--theme-content-color);
    }
  }
</style>
