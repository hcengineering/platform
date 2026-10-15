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
    InviteLinkSummary,
    resolveInviteSettings,
    summarizeInviteLink
  } from '@hcengineering/setting-resources'
  import {
    type AnySvelteComponent,
    Button,
    getCurrentResolvedLocation,
    IconCopy,
    Label,
    locationToUrl,
    Modal,
    Notice
  } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy } from 'svelte'

  import { type InviteLinkParams, LIMITED_ROLE_INVITE_EXP_HOURS } from '../inviteLinkParams'
  import login from '../plugin'
  import { getInviteLink } from '../utils'
  import InviteLinkSettings from './InviteLinkSettings.svelte'

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

  let defaults: InviteLinkParams = { expHours: INVITE_SETTINGS_DEFAULT_EXPIRATION_HOURS, limit: -1 }
  let params: InviteLinkParams = defaults
  let valid = true
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
    // Only maintainers may create links that never expire, so others get a 30-day link instead
    const expHours =
      state.expirationTime < 0 && !isOwnerOrMaintainer ? LIMITED_ROLE_INVITE_EXP_HOURS : state.expirationTime
    defaults = { expHours, limit: state.noLimit ? -1 : (state.limit ?? -1) }
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

  async function createLink (): Promise<void> {
    if (!canGenerateInviteLinks || !valid) return
    const { expHours, limit } = params
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

<Modal
  label={login.string.InvitePeople}
  type={'type-popup'}
  width={'small'}
  footerPadding={'var(--spacing-1_5) var(--spacing-3)'}
  okLabel={created !== undefined ? login.string.Close : login.string.GetLink}
  okAction={created !== undefined ? close : createLink}
  canSave={created !== undefined || (canGenerateInviteLinks && valid && !creating)}
  okLoading={creating}
  showCancelButton={created === undefined}
  onCancel={close}
>
  <div class="flex-col flex-gap-4">
    {#if created === undefined}
      <span class="text-md content-dark-color"><Label label={login.string.InviteDescription} /></span>

      <div class="flex-between flex-gap-4">
        <span class="font-medium caption-color"><Label label={login.string.JoinAs} /></span>
        {#if userRoleSelect}
          <svelte:component
            this={userRoleSelect}
            selected={selectedRole}
            disabled={!isOwnerOrMaintainer}
            on:selected={(e) => (role = e.detail)}
          />
        {/if}
      </div>

      <InviteLinkSettings
        {defaults}
        canCustomize={isOwnerOrMaintainer}
        settingsUrl={inviteSettingsUrl}
        bind:value={params}
        bind:valid
      />
    {:else}
      <div class="flex-row-center flex-gap-2">
        <span
          class="link flex-grow clear-mins text-md"
          data-id="invite-link"
          class:overflow-label={isSecureContext}
          class:selectable={!isSecureContext}>{created.url}</span
        >
        {#if isSecureContext}
          <Button
            icon={IconCopy}
            label={copied ? login.string.Copied : login.string.Copy}
            kind={'primary'}
            on:click={() => void copy()}
          />
        {/if}
      </div>
      <InviteLinkSummary
        muted
        role={getInviteRoleLabel(created.role)}
        items={summarizeInviteLink(created, created.createdOn)}
      />
    {/if}
    {#if linkError}
      <Notice kind={'error'} label={login.string.InviteLinkError} />
    {/if}
  </div>

  <svelte:fragment slot="footer">
    {#if inviteSettingsUrl !== undefined}
      <div class="flex-grow flex-row-center">
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
      </div>
    {/if}
  </svelte:fragment>
</Modal>

<style lang="scss">
  .link {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
    font-family: var(--mono-font);

    &.selectable {
      overflow-wrap: anywhere;
      user-select: all;
    }
  }

  .manage-link,
  .manage-link:hover {
    color: var(--theme-link-color);
  }
</style>
