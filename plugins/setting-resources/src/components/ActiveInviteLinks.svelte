<!--
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import type { ManagedInviteLink } from '@hcengineering/account-client'
  import { employeeByAccountStore, PersonPresenter } from '@hcengineering/contact-resources'
  import { AccountRole } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import type { IntlString } from '@hcengineering/platform'
  import { copyTextToClipboard, MessageBox } from '@hcengineering/presentation'
  import { Button, ButtonIcon, IconCopy, IconDelete, Label, Loading, showPopup, TimeSince } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  import { getInviteLinkUrl } from '../inviteLinkUrl'
  import { getAccountClient } from '../utils'

  const isSecureContext = window.isSecureContext

  let inviteLinks: ManagedInviteLink[] = []
  let loading = true
  let listError = false
  let actionError = false
  let copiedId: string | undefined

  async function load (): Promise<void> {
    loading = true
    listError = false
    try {
      inviteLinks = await getAccountClient().getActiveInviteLinks()
    } catch {
      listError = true
    } finally {
      loading = false
    }
  }

  async function copy (invite: ManagedInviteLink): Promise<void> {
    actionError = false
    try {
      await copyTextToClipboard(getInviteLinkUrl(invite.id, invite.navigateUrl))
      copiedId = invite.id
      setTimeout(() => {
        if (copiedId === invite.id) copiedId = undefined
      }, 1500)
    } catch {
      actionError = true
    }
  }

  function revoke (invite: ManagedInviteLink): void {
    showPopup(MessageBox, {
      label: login.string.RevokeInviteLink,
      message: login.string.RevokeInviteLinkConfirm,
      okLabel: login.string.RevokeInviteLink,
      dangerous: true,
      action: async () => {
        actionError = false
        try {
          await getAccountClient().revokeInviteLink(invite.id)
          inviteLinks = inviteLinks.filter((item) => item.id !== invite.id)
        } catch {
          actionError = true
        }
      }
    })
  }

  function getRoleLabel (role: AccountRole): IntlString {
    switch (role) {
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

  function formatDate (value: number): string {
    return new Date(value).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  onMount(() => {
    void load()
  })
</script>

{#if loading}
  <Loading />
{:else if listError}
  <div class="flex-row-center flex-gap-2">
    <span class="error"><Label label={login.string.InviteLinksLoadError} /></span>
    <Button label={login.string.RetryInviteLinks} size={'small'} on:click={() => void load()} />
  </div>
{:else if inviteLinks.length === 0}
  <span class="secondary"><Label label={login.string.NoActiveInviteLinks} /></span>
{:else}
  {#if actionError}
    <div class="error mb-2"><Label label={login.string.InviteLinkError} /></div>
  {/if}
  <div class="links">
    {#each inviteLinks as invite (invite.id)}
      {@const creator = invite.createdBy !== undefined ? $employeeByAccountStore.get(invite.createdBy) : undefined}
      <div class="link-row">
        <div class="link-info">
          <span class="role"><Label label={getRoleLabel(invite.role)} /></span>
          <span class="meta">
            {#if invite.expiresOn > 0}
              <Label label={login.string.InviteLinkExpires} params={{ date: formatDate(invite.expiresOn) }} />
            {:else}
              <Label label={login.string.NoExpiration} />
            {/if}
            <span class="dot">·</span>
            {#if invite.remainingUses < 0}
              <Label label={login.string.UnlimitedUses} />
            {:else}
              <Label label={login.string.RemainingUses} params={{ count: invite.remainingUses }} />
            {/if}
            {#if creator !== undefined}
              <span class="dot">·</span>
              <PersonPresenter value={creator} shouldShowAvatar={false} colorInherit noUnderline />
            {/if}
            {#if invite.createdOn !== undefined}
              <span class="dot">·</span>
              <TimeSince value={invite.createdOn} />
            {/if}
          </span>
        </div>
        <div class="link-actions">
          {#if isSecureContext}
            <ButtonIcon
              icon={IconCopy}
              kind={'tertiary'}
              size={'small'}
              tooltip={{ label: copiedId === invite.id ? login.string.Copied : login.string.Copy }}
              on:click={() => void copy(invite)}
            />
          {/if}
          <ButtonIcon
            icon={IconDelete}
            kind={'tertiary'}
            size={'small'}
            tooltip={{ label: login.string.RevokeInviteLink }}
            on:click={() => {
              revoke(invite)
            }}
          />
        </div>
      </div>
    {/each}
  </div>
{/if}

<style lang="scss">
  .links {
    display: flex;
    flex-direction: column;
  }

  .link-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.625rem 0;

    & + .link-row {
      border-top: 1px solid var(--theme-divider-color);
    }
  }

  .link-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .role {
    font-weight: 500;
    color: var(--theme-caption-color);
  }

  .meta {
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

  .link-actions {
    display: flex;
    flex-shrink: 0;
    gap: 0.25rem;
  }

  .secondary {
    color: var(--theme-dark-color);
  }

  .error {
    color: var(--theme-error-color);
  }
</style>
