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
  import login from '@hcengineering/login'
  import { copyTextToClipboard, MessageBox } from '@hcengineering/presentation'
  import { Button, ButtonIcon, IconCopy, IconDelete, Label, Loading, showPopup, TimeSince } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  import { formatInviteDate, getInviteLinkUrl, getInviteRoleLabel, type InviteLinkSummaryItem } from '../inviteLinks'
  import { getAccountClient } from '../utils'
  import InviteLinkSummary from './InviteLinkSummary.svelte'

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

  function summarize (invite: ManagedInviteLink): InviteLinkSummaryItem[] {
    return [
      invite.expiresOn > 0
        ? { label: login.string.InviteLinkExpires, params: { date: formatInviteDate(invite.expiresOn) } }
        : { label: login.string.NoExpiration },
      invite.remainingUses < 0
        ? { label: login.string.UnlimitedUses }
        : { label: login.string.RemainingUses, params: { count: invite.remainingUses } }
    ]
  }

  async function copy (invite: ManagedInviteLink): Promise<void> {
    actionError = false
    try {
      await copyTextToClipboard(getInviteLinkUrl(invite.id))
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

  onMount(() => {
    void load()
  })
</script>

{#if loading}
  <Loading />
{:else if listError}
  <div class="flex-row-center flex-gap-2">
    <span class="error-color"><Label label={login.string.InviteLinksLoadError} /></span>
    <Button label={login.string.RetryInviteLinks} size={'small'} on:click={() => void load()} />
  </div>
{:else if inviteLinks.length === 0}
  <span class="secondary"><Label label={login.string.NoActiveInviteLinks} /></span>
{:else}
  {#if actionError}
    <div class="error-color mb-2"><Label label={login.string.InviteLinkError} /></div>
  {/if}
  <div class="links">
    {#each inviteLinks as invite (invite.id)}
      {@const creator = invite.createdBy !== undefined ? $employeeByAccountStore.get(invite.createdBy) : undefined}
      <div class="link-row">
        <div class="link-info">
          <span class="role"><Label label={getInviteRoleLabel(invite.role)} /></span>
          <InviteLinkSummary muted items={summarize(invite)}>
            {#if creator !== undefined}
              <span class="invite-summary-part">
                <PersonPresenter value={creator} shouldShowAvatar={false} colorInherit noUnderline />
              </span>
            {/if}
            {#if invite.createdOn !== undefined}
              <span class="invite-summary-part"><TimeSince value={invite.createdOn} /></span>
            {/if}
          </InviteLinkSummary>
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

  .link-actions {
    display: flex;
    flex-shrink: 0;
    gap: 0.25rem;
  }

  .secondary {
    color: var(--theme-dark-color);
  }
</style>
