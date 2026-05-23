<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { isAdminUser } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import login from '@hcengineering/login'
  import {
    deviceOptionsStore as deviceInfo,
    getCurrentLocation,
    IconArrowLeft,
    IconSettings,
    Label,
    location as locationStore,
    NavItem,
    navigate,
    Scroller,
    Separator
  } from '@hcengineering/ui'

  type Section = 'users' | 'workspaces'

  export let section: Section

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

  $: _ = $locationStore
</script>

{#if $deviceInfo.navigator.visible}
  <div
    class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal' ? 'portrait' : 'landscape'} border-left"
    class:fly={$deviceInfo.navigator.float}
  >
    <div class="antiPanel-wrap__content hulyNavPanel-container">
      <div class="hulyNavPanel-header">
        <Label label={login.string.AdminPanel} />
      </div>

      <Scroller shrink>
        <NavItem
          icon={setting.icon.Members}
          label={login.string.AdminUsers}
          selected={section === 'users'}
          on:click={() => {
            go('users')
          }}
        />
        <NavItem
          icon={IconSettings}
          label={login.string.AdminWorkspaces}
          selected={section === 'workspaces'}
          on:click={() => {
            go('workspaces')
          }}
        />
      </Scroller>

      <div class="admin-shell-footer">
        <NavItem icon={IconArrowLeft} label={login.string.BackToWorkbench} on:click={backToWorkbench} />
      </div>
    </div>
    <Separator name={'admin-shell'} float={$deviceInfo.navigator.float ? 'navigator' : true} index={0} color={'transparent'} />
  </div>
  <Separator
    name={'admin-shell'}
    float={$deviceInfo.navigator.float}
    index={0}
    color={'transparent'}
    separatorSize={0}
    short
  />
{/if}

<div class="antiPanel-component filledNav border-right" style:flex-direction={'row'}>
  <slot />
</div>

<style lang="scss">
  .admin-shell-footer {
    border-top: 1px solid var(--theme-navpanel-divider);
    padding: 0.25rem 0;
  }
</style>
