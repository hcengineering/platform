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
  import type { ManagedInviteLink } from '@hcengineering/account-client'
  import { AccountRole, getCurrentAccount, hasAccountRole, Timestamp } from '@hcengineering/core'
  import { copyTextToClipboard, createQuery } from '@hcengineering/presentation'
  import setting, { RoleCapability } from '@hcengineering/setting'
  import { getDefaultInviteRole, resolveInviteSettings } from '@hcengineering/setting-resources'
  import { getResource, type IntlString } from '@hcengineering/platform'
  import { AnySvelteComponent, Button, EditBox, Grid, Label, Loading, MiniToggle, ticker } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'

  import login from '../plugin'
  import { getAccountClient, getInviteLink, getInviteLinkUrl } from '../utils'
  import InviteWorkspace from './icons/InviteWorkspace.svelte'

  export let role: AccountRole | undefined = undefined
  export let ignoreSettings: boolean = false

  const dispatch = createEventDispatcher()

  const query = createQuery()
  const isSecureContext = window.isSecureContext

  interface InviteParams {
    expirationTime: number
    emailMask: string
    limit: number | undefined
  }

  const defaultInviteRole: AccountRole = getDefaultInviteRole()

  $: !ignoreSettings &&
    query.query(setting.class.InviteSettings, {}, (set) => {
      const state = resolveInviteSettings(set?.[0])
      expHours = state.expirationTime
      noExpiration = expHours < 0
      emailMask = state.emailMask
      limit = state.limit
      if (role == null) {
        role = state.defaultInviteRole
      }
      if (state.noLimit) noLimit = true

      defaultValues = {
        expirationTime: expHours,
        emailMask,
        limit
      }
    })

  function setToDefault (): void {
    expHours = defaultValues.expirationTime
    noExpiration = expHours < 0
    emailMask = defaultValues.emailMask
    limit = defaultValues.limit
  }

  async function getLink (expHours: number, mask: string, limit: number | undefined, role: AccountRole): Promise<void> {
    loading = true
    hasError = false
    try {
      link = await getInviteLink(expHours, mask, limit ?? -1, role)
      await loadInviteLinks()
    } catch {
      hasError = true
    } finally {
      loading = false
    }
  }

  async function loadInviteLinks (): Promise<void> {
    if (!isOwnerOrMaintainer) return
    loadingInviteLinks = true
    try {
      inviteLinks = await getAccountClient().getActiveInviteLinks()
      hasError = false
    } catch {
      hasError = true
    } finally {
      loadingInviteLinks = false
    }
  }

  function getRoleLabel (inviteRole: AccountRole): IntlString {
    switch (inviteRole) {
      case AccountRole.Guest:
        return login.string.InviteRoleGuest
      case AccountRole.Maintainer:
        return login.string.InviteRoleMaintainer
      case AccountRole.Owner:
        return login.string.InviteRoleOwner
      default:
        return login.string.InviteRoleUser
    }
  }

  async function revokeLink (id: string): Promise<void> {
    revokingId = id
    hasError = false
    try {
      await getAccountClient().revokeInviteLink(id)
      inviteLinks = inviteLinks.filter((item) => item.id !== id)
      if (link === getInviteLinkUrl(id)) link = undefined
    } catch {
      hasError = true
    } finally {
      revokingId = undefined
    }
  }

  async function copyInviteLink (id: string): Promise<void> {
    if (!isSecureContext) return
    try {
      await copyTextToClipboard(getInviteLinkUrl(id))
    } catch {
      hasError = true
    }
  }

  onMount(() => {
    void loadInviteLinks()
  })

  let copiedTime: Timestamp | undefined
  let copied = false

  $: if (copiedTime !== undefined && copied && $ticker - copiedTime > 1000) {
    copied = false
  }

  async function copy (): Promise<void> {
    if (!isSecureContext) return
    if (link === undefined) return

    await copyTextToClipboard(link)
    copied = true
    copiedTime = Date.now()
  }

  let expHours: number = 48
  let noExpiration = false
  let emailMask: string = ''
  let limit: number | undefined = undefined
  let useDefault: boolean | undefined = true
  let noLimit: boolean = false
  const currentAccount = getCurrentAccount()
  const isOwnerOrMaintainer: boolean = hasAccountRole(currentAccount, AccountRole.Maintainer)
  let userRoleSelectComponent: AnySvelteComponent | undefined
  void getResource(setting.component.UserRoleSelect).then((component) => {
    userRoleSelectComponent = component
  })
  let canGenerateInviteLinks = false

  // Use shared HasRoleCapability function resource from setting package instead of setting-resources
  void getResource(setting.function.HasRoleCapability).then((checkCapability) => {
    if (checkCapability != null) {
      void checkCapability(RoleCapability.GenerateInviteLink).then((value: boolean) => {
        canGenerateInviteLinks = value
      })
    }
  })
  let defaultValues: InviteParams = {
    expirationTime: 48,
    emailMask: '',
    limit: undefined
  }

  let link: string | undefined
  let loading = false
  let inviteLinks: ManagedInviteLink[] = []
  let loadingInviteLinks = false
  let revokingId: string | undefined
  let hasError = false

  function handleInviteRoleSelected (e: CustomEvent<AccountRole>): void {
    role = e.detail
    link = undefined
  }
</script>

<div class="antiPopup popup" class:secure={isSecureContext}>
  <div class="flex-between fs-title mb-9">
    <Label label={login.string.InviteDescription} />
    <InviteWorkspace size={'large'} />
  </div>
  {#if isOwnerOrMaintainer && !ignoreSettings}
    <Grid column={1} rowGap={1.5}>
      <MiniToggle
        bind:on={useDefault}
        label={login.string.UseWorkspaceInviteSettings}
        on:click={() => {
          setToDefault()
        }}
      />
      {#if !useDefault}
        <MiniToggle
          bind:on={noExpiration}
          label={login.string.NoExpiration}
          on:change={() => {
            expHours = noExpiration ? -1 : defaultValues.expirationTime
            link = undefined
          }}
        />
        {#if !noExpiration}
          <EditBox
            label={login.string.LinkValidHours}
            bind:value={expHours}
            format={'number'}
            on:keypress={() => (link = undefined)}
            disabled={useDefault || !isOwnerOrMaintainer}
          />
        {/if}
        <MiniToggle bind:on={noLimit} label={login.string.NoLimit} on:change={() => noLimit && (limit = -1)} />
        {#if !noLimit}
          <EditBox
            label={login.string.InviteLimit}
            bind:value={limit}
            format={'number'}
            on:keypress={() => (link = undefined)}
            disabled={useDefault || !isOwnerOrMaintainer}
          />
        {/if}
        {#if userRoleSelectComponent}
          <svelte:component
            this={userRoleSelectComponent}
            selected={role ?? defaultInviteRole}
            on:selected={handleInviteRoleSelected}
          />
        {/if}
      {/if}
    </Grid>
  {/if}
  {#if noExpiration && noLimit && !useDefault}
    <div class="invite-warning"><Label label={login.string.UnlimitedInviteWarning} /></div>
  {/if}
  {#if hasError}
    <div class="invite-error"><Label label={login.string.InviteLinkError} /></div>
  {/if}
  {#if loading}
    <Loading />
  {:else if link !== undefined}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="link" class:notSecure={!isSecureContext} class:over-underline={isSecureContext} on:click={copy}>
      {link}
    </div>
    <div class="buttons">
      <Button
        label={login.string.Close}
        size={'medium'}
        kind={'primary'}
        on:click={() => {
          dispatch('close')
        }}
      />
      {#if isSecureContext}
        <Button label={copied ? login.string.Copied : login.string.Copy} size={'medium'} on:click={copy} />
      {/if}
    </div>
  {:else}
    <div class="buttons">
      <Button
        label={login.string.GetLink}
        size={'medium'}
        kind={'primary'}
        disabled={!canGenerateInviteLinks}
        on:click={() => {
          if (!canGenerateInviteLinks) return
          const effectiveLimit = limit ?? 0
          if (effectiveLimit > 0 || noLimit) {
            void getLink(expHours, emailMask, limit, role ?? defaultInviteRole)
          }
        }}
      />
    </div>
  {/if}
  {#if isOwnerOrMaintainer}
    <div class="active-links">
      <Label label={login.string.ActiveInviteLinks} />
      {#if loadingInviteLinks}
        <Loading />
      {:else if inviteLinks.length === 0}
        <div class="muted"><Label label={login.string.NoActiveInviteLinks} /></div>
      {:else}
        <div class="invite-list">
          {#each inviteLinks as invite (invite.id)}
            <div class="invite-item">
              <div class="invite-details">
                <span><Label label={getRoleLabel(invite.role)} /></span>
                <span>
                  {#if invite.expiresOn < 0}
                    <Label label={login.string.NoExpiration} />
                  {:else}
                    {new Date(invite.expiresOn).toLocaleString()}
                  {/if}
                </span>
                <span>
                  {#if invite.remainingUses < 0}
                    <Label label={login.string.UnlimitedUses} />
                  {:else}
                    <Label label={login.string.RemainingUses} /> {invite.remainingUses}
                  {/if}
                </span>
              </div>
              <div class="invite-actions">
                {#if isSecureContext}
                  <Button label={login.string.Copy} size={'small'} on:click={() => void copyInviteLink(invite.id)} />
                {/if}
                <Button
                  label={login.string.RevokeInviteLink}
                  size={'small'}
                  disabled={revokingId === invite.id}
                  on:click={() => void revokeLink(invite.id)}
                />
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
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
    -webkit-user-select: none;
    user-select: none;
    box-shadow: var(--popup-shadow);

    .link {
      margin: 1.75rem 0 0;
      overflow-wrap: break-word;

      &.notSecure {
        user-select: text;
      }
    }

    .buttons {
      margin-top: 1.75rem;
      flex-shrink: 0;
      display: grid;
      grid-auto-flow: column;
      direction: rtl;
      justify-content: flex-start;
      align-items: center;
      column-gap: 0.5rem;
    }

    .invite-warning,
    .invite-error {
      margin-top: 1rem;
    }

    .invite-error {
      color: var(--theme-error-color);
    }

    .active-links {
      margin-top: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .muted {
      opacity: 0.7;
    }

    .invite-list {
      max-height: 14rem;
      overflow-y: auto;
    }

    .invite-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0;
      border-top: 1px solid var(--theme-divider-color);
    }

    .invite-details,
    .invite-actions {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
  }
</style>
