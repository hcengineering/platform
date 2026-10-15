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
  import { getDefaultInviteRole, getInviteRoleLabel, resolveInviteSettings } from '@hcengineering/setting-resources'
  import {
    type AnySvelteComponent,
    Button,
    getCurrentResolvedLocation,
    IconCopy,
    Label,
    locationToUrl,
    Modal,
    Notice,
    TextLink
  } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy } from 'svelte'

  import {
    DEFAULT_INVITE_EXP_HOURS,
    type InviteLinkParams,
    LIMITED_ROLE_INVITE_EXP_HOURS,
    summarizeInviteLink
  } from '../inviteLinkParams'
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

  let defaults: InviteLinkParams = { expHours: DEFAULT_INVITE_EXP_HOURS, limit: -1 }
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
  <div class="invite-dialog">
    {#if created === undefined}
      <span class="hint"><Label label={login.string.InviteDescription} /></span>

      <div class="row">
        <span class="label"><Label label={login.string.JoinAs} /></span>
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
      <div class="link-field">
        <span class="link" data-id="invite-link" class:selectable={!isSecureContext}>{created.url}</span>
        {#if isSecureContext}
          <Button
            icon={IconCopy}
            label={copied ? login.string.Copied : login.string.Copy}
            kind={'primary'}
            on:click={() => void copy()}
          />
        {/if}
      </div>
      <div class="summary">
        <span class="role"><Label label={getInviteRoleLabel(created.role)} /></span>
        {#each summarizeInviteLink(created, created.createdOn) as item}
          <span class="dot">·</span>
          <Label label={item.label} params={item.params} />
        {/each}
      </div>
    {/if}
    {#if linkError}
      <Notice kind={'error'} label={login.string.InviteLinkError} />
    {/if}
  </div>

  <svelte:fragment slot="footer">
    {#if inviteSettingsUrl !== undefined}
      <div class="manage-links">
        <TextLink href={inviteSettingsUrl} external>
          <Label label={login.string.ManageInviteLinks} />
        </TextLink>
      </div>
    {/if}
  </svelte:fragment>
</Modal>

<style lang="scss">
  .invite-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2);
  }

  .label {
    font-weight: 500;
    color: var(--theme-caption-color);
  }

  .hint {
    font-size: 0.8125rem;
    color: var(--theme-dark-color);
  }

  .summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 0.375rem;
    font-size: 0.8125rem;
    color: var(--theme-dark-color);
  }

  .dot {
    opacity: 0.6;
  }

  .role {
    font-weight: 500;
    color: var(--theme-caption-color);
  }

  .link-field {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
  }

  .link {
    flex: 1;
    min-width: 0;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
    font-family: var(--mono-font);
    font-size: 0.8125rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &.selectable {
      white-space: normal;
      overflow-wrap: anywhere;
      user-select: all;
    }
  }

  .manage-links {
    margin-right: auto;
    align-self: center;
  }
</style>
