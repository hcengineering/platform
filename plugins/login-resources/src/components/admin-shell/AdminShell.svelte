<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { getCurrentLocation, navigate, location as locationStore } from '@hcengineering/ui'
  import { isAdminUser } from '@hcengineering/presentation'

  type Section = 'overview' | 'users' | 'workspaces' | 'settings'

  export let section: Section
  export let title: string
  export let subtitle: string | undefined = undefined

  if (typeof window !== 'undefined' && !isAdminUser()) {
    window.location.href = '/login'
  }

  function go (target: Section): void {
    const loc = getCurrentLocation()
    loc.path[0] = 'login'
    loc.path[1] = 'admin'
    if (target === 'workspaces') {
      loc.path.length = 2
    } else {
      loc.path[2] = target
      loc.path.length = 3
    }
    navigate(loc)
  }

  function backToWorkbench (): void {
    const loc = getCurrentLocation()
    loc.path[0] = 'workbench'
    loc.path.length = 1
    navigate(loc)
  }

  const items: Array<{ id: Section, label: string, icon: string }> = [
    { id: 'users', label: 'Users', icon: 'users' },
    { id: 'workspaces', label: 'Workspaces', icon: 'workspaces' }
  ]

  $: currentPath = $locationStore.path
</script>

<div class="admin-shell">
  <aside class="sidebar">
    <header class="sidebar-header">
      <button class="back" on:click={backToWorkbench} title="Back to workbench">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Workbench
      </button>
      <h1>Admin</h1>
    </header>

    <nav>
      {#each items as item (item.id)}
        <button
          class="nav-item"
          class:active={section === item.id}
          on:click={() => go(item.id)}
        >
          <span class="nav-icon">
            {#if item.icon === 'users'}
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            {:else if item.icon === 'workspaces'}
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            {/if}
          </span>
          <span class="nav-label">{item.label}</span>
        </button>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <span class="muted">huly admin</span>
    </div>
  </aside>

  <main class="content">
    <header class="content-header">
      <div>
        <h2>{title}</h2>
        {#if subtitle}
          <p class="subtitle">{subtitle}</p>
        {/if}
      </div>
      <div class="content-header-actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="content-body">
      <slot />
    </div>
  </main>
</div>

<style lang="scss">
  .admin-shell {
    display: flex;
    height: 100vh;
    width: 100vw;
    background: var(--theme-bg-color);
    color: var(--theme-content-color);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .sidebar {
    width: 240px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: var(--theme-navpanel-color);
    border-right: 1px solid var(--theme-navpanel-border);
  }

  .sidebar-header {
    padding: 1.25rem 1.25rem 0.75rem;
    border-bottom: 1px solid var(--theme-navpanel-divider);
  }

  .back {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.55rem;
    background: transparent;
    border: 1px solid transparent;
    color: var(--theme-content-color);
    opacity: 0.65;
    font-size: 0.8rem;
    border-radius: 0.35rem;
    cursor: pointer;
    transition: opacity 120ms ease, background 120ms ease;
    margin-left: -0.55rem;

    &:hover {
      opacity: 1;
      background: var(--theme-navpanel-hovered);
    }
  }

  h1 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0.5rem 0 0.75rem;
    color: var(--theme-caption-color);
    letter-spacing: -0.01em;
  }

  nav {
    flex: 1;
    padding: 0.75rem 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem 0.75rem;
    background: transparent;
    border: 1px solid transparent;
    color: var(--theme-content-color);
    font-size: 0.9rem;
    border-radius: 0.4rem;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: background 120ms ease, color 120ms ease;

    &:hover {
      background: var(--theme-navpanel-hovered);
    }

    &.active {
      background: var(--theme-navpanel-selected);
      color: var(--theme-caption-color);
      font-weight: 500;
    }
  }

  .nav-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    color: var(--theme-navpanel-icons-color);

    .active & {
      color: var(--theme-caption-color);
    }
  }

  .sidebar-footer {
    padding: 0.75rem 1.25rem;
    border-top: 1px solid var(--theme-navpanel-divider);
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .muted {
    opacity: 0.5;
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .content-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 1.75rem 2.5rem 1.25rem;
    border-bottom: 1px solid var(--theme-divider-color);
    flex-shrink: 0;
  }

  .content-header h2 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--theme-caption-color);
    letter-spacing: -0.02em;
  }

  .subtitle {
    margin: 0.25rem 0 0;
    color: var(--theme-content-color);
    opacity: 0.65;
    font-size: 0.9rem;
  }

  .content-header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .content-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.75rem 2.5rem;
  }
</style>
