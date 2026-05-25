<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { isAdminUser } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import login from '@hcengineering/login'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import {
    deviceOptionsStore as deviceInfo,
    getCurrentLocation,
    IconActivity,
    IconArrowLeft,
    IconSettings,
    Label,
    location as locationStore,
    NavItem,
    navigate,
    Scroller,
    Separator
  } from '@hcengineering/ui'
  import RedirectToLogin from './RedirectToLogin.svelte'

  type Section = 'users' | 'workspaces' | 'audit'

  export let section: Section

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
    // Mirror Huly Settings: go through the workspace picker so we always land
    // on a valid /workbench/{workspaceUrl}, even when the user has cleared
    // their local workspace context inside the admin panel.
    navigate({ path: ['login', 'selectWorkspace'] })
  }

  $: _ = $locationStore
</script>

{#if isAdminUser()}
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
          <NavItem
            icon={IconActivity}
            label={getEmbeddedLabel('Audit log')}
            selected={section === 'audit'}
            on:click={() => {
              go('audit')
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
{:else}
  <RedirectToLogin />
{/if}

<style lang="scss">
  .admin-shell-footer {
    border-top: 1px solid var(--theme-navpanel-divider);
    padding: 0.25rem 0;
  }

</style>
