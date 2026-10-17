<!--
// Copyright © 2022 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import { copyTextToClipboard, createQuery } from '@hcengineering/presentation'
  import setting, { RoleCapability, settingId } from '@hcengineering/setting'
  import {
    getDefaultInviteRole,
    getInviteRoleLabel,
    INVITE_SETTINGS_DEFAULT_EXPIRATION_HOURS,
    InviteExpirationSelect,
    InviteLinkSummary,
    InviteUsesSelect,
    resolveInviteSettings,
    summarizeInviteLink
  } from '@hcengineering/setting-resources'
  import {
    type AnySvelteComponent,
    Button,
    getCurrentResolvedLocation,
    Label,
    locationToUrl,
    Notice
  } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy } from 'svelte'

  import { type InviteLinkParams, LIMITED_ROLE_INVITE_EXP_HOURS } from '../inviteLinkParams'
  import login from '../plugin'
  import { getInviteLink } from '../utils'
  import InviteWorkspace from './icons/InviteWorkspace.svelte'

  export let role: AccountRole | undefined = undefined
  interface CreatedLink extends InviteLinkParams {
    url: string
    role: AccountRole
    createdOn: number
  }

  const dispatch = createEventDispatcher()
  const query = createQuery()
  const isSecureContext = window.isSecureContext
  const isOwnerOrMaintainer = hasAccountRole(getCurrentAccount(), AccountRole.Maintainer)
  // Only maintainers manage links, and there is no point in linking to the page that is already open
  const inviteSettingsUrl = isOwnerOrMaintainer && !isInviteSettingsOpen() ? getInviteSettingsUrl() : undefined

  // Filled from the workspace invite settings until the user picks something else
  let expHours = INVITE_SETTINGS_DEFAULT_EXPIRATION_HOURS
  let limit = -1
  let touched = false
  let emailMask = ''

  let creating = false
  let linkError = false
  let created: CreatedLink | undefined
  let copied = false
  let copiedTimer: ReturnType<typeof setTimeout> | undefined

  let canGenerateInviteLinks = false
  let userRoleSelect: AnySvelteComponent | undefined

  query.query(setting.class.InviteSettings, {}, (set) => {
    const state = resolveInviteSettings(set?.[0])
    if (!touched) {
      // Only maintainers may create links that never expire, so others get a 30-day link instead
      expHours = state.expirationTime < 0 && !isOwnerOrMaintainer ? LIMITED_ROLE_INVITE_EXP_HOURS : state.expirationTime
      limit = state.noLimit ? -1 : (state.limit ?? -1)
    }
    emailMask = state.emailMask
    if (role == null) role = state.defaultInviteRole
  })

  void getResource(setting.component.UserRoleSelect).then((component) => {
    userRoleSelect = component
  })

  void getResource(setting.function.HasRoleCapability).then((checkCapability) => {
    if (checkCapability != null) {
      void checkCapability(RoleCapability.GenerateInviteLink).then((value: boolean) => {
        canGenerateInviteLinks = value
      })
    }
  })

  $: selectedRole = role ?? getDefaultInviteRole()
  $: unsafe = expHours < 0 && limit < 0

  async function createLink (): Promise<void> {
    if (!canGenerateInviteLinks) return
    creating = true
    linkError = false
    try {
      const url = await getInviteLink(expHours, emailMask, limit, selectedRole)
      created = { url, expHours, limit, role: selectedRole, createdOn: Date.now() }
    } catch {
      linkError = true
    } finally {
      creating = false
    }
  }

  async function copy (): Promise<void> {
    if (created === undefined) return
    linkError = false
    try {
      await copyTextToClipboard(created.url)
      copied = true
      clearTimeout(copiedTimer)
      copiedTimer = setTimeout(() => (copied = false), 1500)
    } catch {
      linkError = true
    }
  }

  onDestroy(() => {
    clearTimeout(copiedTimer)
  })

  function close (): void {
    dispatch('close')
  }

  function isInviteSettingsOpen (): boolean {
    const [, , category, section, page] = getCurrentResolvedLocation().path
    return category === settingId && section === 'setting' && page === 'invites'
  }

  function getInviteSettingsUrl (): string {
    const loc = getCurrentResolvedLocation()
    // Workspace settings live under /<app>/<workspace>/setting/setting/<category>
    return locationToUrl({ path: [loc.path[0], loc.path[1], settingId, 'setting', 'invites'] })
  }
</script>

<div class="antiPopup popup">
  <div class="flex-between fs-title mb-2">
    <Label label={login.string.InvitePeople} />
    <InviteWorkspace size={'large'} />
  </div>

  {#if created === undefined}
    <span class="text-md content-dark-color mb-6"><Label label={login.string.InviteDescription} /></span>
    <div class="flex-col flex-gap-4">
      <div class="flex-between flex-gap-4">
        <span class="font-medium caption-color"><Label label={login.string.JoinAs} /></span>
        <div class="control">
          {#if userRoleSelect}
            <svelte:component
              this={userRoleSelect}
              selected={selectedRole}
              disabled={!isOwnerOrMaintainer}
              width={'100%'}
              justify={'left'}
              on:selected={(e) => (role = e.detail)}
            />
          {/if}
        </div>
      </div>
      <div class="flex-between flex-gap-4">
        <span class="font-medium caption-color"><Label label={login.string.LinkExpires} /></span>
        <div class="control">
          <InviteExpirationSelect
            bind:value={expHours}
            disabled={!isOwnerOrMaintainer}
            on:change={() => (touched = true)}
          />
        </div>
      </div>
      <div class="flex-between flex-gap-4">
        <span class="font-medium caption-color"><Label label={login.string.LimitUses} /></span>
        <div class="control">
          <InviteUsesSelect bind:value={limit} disabled={!isOwnerOrMaintainer} on:change={() => (touched = true)} />
        </div>
      </div>
      {#if unsafe}
        <Notice kind={'warning'} label={login.string.UnlimitedInviteWarning} />
      {/if}
    </div>
  {:else}
    <span class="link mt-4" data-id="invite-link">{created.url}</span>
    <div class="mt-2">
      <InviteLinkSummary
        muted
        role={getInviteRoleLabel(created.role)}
        items={summarizeInviteLink(created, created.createdOn)}
      />
    </div>
  {/if}

  {#if linkError}
    <div class="mt-4"><Notice kind={'error'} label={login.string.InviteLinkError} /></div>
  {/if}

  <div class="flex-between mt-9">
    {#if inviteSettingsUrl !== undefined}
      <a
        class="manage-link noBold text-md flex-row-center flex-gap-1"
        href={inviteSettingsUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Label label={login.string.ManageInviteLinks} />
        <svg
          class="flex-no-shrink"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" />
        </svg>
      </a>
    {:else}
      <span />
    {/if}
    <div class="flex-row-center flex-gap-2">
      {#if created === undefined}
        <Button
          label={login.string.GetLink}
          size={'medium'}
          kind={'primary'}
          disabled={!canGenerateInviteLinks}
          loading={creating}
          on:click={() => void createLink()}
        />
      {:else}
        {#if isSecureContext}
          <Button
            label={copied ? login.string.Copied : login.string.Copy}
            size={'medium'}
            on:click={() => void copy()}
          />
        {/if}
        <Button label={login.string.Close} size={'medium'} kind={'primary'} on:click={close} />
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .popup {
    display: flex;
    flex-direction: column;
    padding: 1.75rem;
    width: 30rem;
    max-width: 40rem;
    background: var(--popup-bg-color);
    border-radius: 1.25rem;
    box-shadow: var(--popup-shadow);
  }

  .control {
    width: 14rem;
    flex-shrink: 0;
  }

  .link {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
    font-family: var(--mono-font);
    overflow-wrap: anywhere;
    user-select: text;
  }

  .manage-link,
  .manage-link:hover {
    color: var(--theme-link-color);
  }
</style>
