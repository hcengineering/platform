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
  <input
    type="text"
    placeholder="Search users..."
    bind:value={searchValue}
    on:input={onSearchInput}
  />
  <select on:change={onAuthChange} value={filter.authMethod ?? 'all'}>
    <option value="all">All auth methods</option>
    <option value="email_only">Email only</option>
    <option value="oidc">OIDC only</option>
    <option value="mixed">Mixed</option>
  </select>
  <select on:change={onStatusChange} value={filter.status ?? 'active'}>
    <option value="all">All statuses</option>
    <option value="active">Active</option>
    <option value="disabled">Disabled</option>
  </select>
</div>

<style lang="scss">
  .filter-bar {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
    align-items: center;
  }
  input,
  select {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--theme-button-border);
    background: var(--theme-button-color);
    color: var(--theme-content-color);
    border-radius: 0.25rem;
  }
  input {
    flex: 1;
    max-width: 360px;
  }
</style>
