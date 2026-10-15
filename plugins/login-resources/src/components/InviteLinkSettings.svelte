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
  import {
    InviteExpirationSelect,
    InviteLinkSummary,
    InviteUsesSelect,
    summarizeInviteLink
  } from '@hcengineering/setting-resources'
  import { Button, IconEdit, IconReset, Label, Notice } from '@hcengineering/ui'

  import { type InviteLinkParams, isValidInviteLinkParams } from '../inviteLinkParams'
  import login from '../plugin'

  /** Workspace defaults, used until the user customizes the link. */
  export let defaults: InviteLinkParams
  /** Resulting restrictions for the link to create. */
  export let value: InviteLinkParams = defaults
  export let valid: boolean = true
  export let canCustomize: boolean = false
  /** Where the workspace defaults can be changed; the caption becomes a link when set. */
  export let settingsUrl: string | undefined = undefined

  let customized = false
  let expHours = defaults.expHours
  let limit = defaults.limit

  $: value = customized ? { expHours, limit } : defaults
  $: valid = isValidInviteLinkParams(value)
  $: unsafe = value.expHours < 0 && value.limit < 0

  function customize (): void {
    // Start from the workspace defaults so customizing does not change anything by itself
    expHours = defaults.expHours
    limit = defaults.limit
    customized = true
  }
</script>

{#if !customized}
  <div class="defaults flex-between flex-gap-4">
    <div class="flex-col flex-gap-0-5 clear-mins">
      <InviteLinkSummary items={summarizeInviteLink(defaults)} />
      {#if settingsUrl !== undefined}
        <a
          class="link self-start noBold text-md content-dark-color"
          href={settingsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Label label={login.string.WorkspaceDefaults} />
        </a>
      {:else}
        <span class="self-start text-md content-dark-color"><Label label={login.string.WorkspaceDefaults} /></span>
      {/if}
    </div>
    {#if canCustomize}
      <Button icon={IconEdit} label={login.string.CustomizeInviteLink} size={'medium'} on:click={customize} />
    {/if}
  </div>
{:else}
  <div class="flex-col flex-gap-2">
    <div class="flex-between flex-gap-4">
      <span class="font-medium caption-color"><Label label={login.string.LinkSettings} /></span>
      <Button
        icon={IconReset}
        iconProps={{ size: 'x-small' }}
        label={login.string.RestoreDefaults}
        kind={'ghost'}
        size={'small'}
        on:click={() => (customized = false)}
      />
    </div>
    <div class="flex-col border-divider-color settings">
      <div class="setting">
        <span class="name"><Label label={login.string.LinkExpires} /></span>
        <div class="control"><InviteExpirationSelect bind:value={expHours} /></div>
      </div>
      <div class="setting">
        <span class="name"><Label label={login.string.LimitUses} /></span>
        <div class="control"><InviteUsesSelect bind:value={limit} /></div>
      </div>
    </div>
  </div>
{/if}

{#if unsafe}
  <Notice kind={'warning'} label={login.string.UnlimitedInviteWarning} />
{/if}

<style lang="scss">
  .defaults {
    padding: var(--spacing-1_5) var(--spacing-2);
    background-color: var(--theme-list-row-color);
    border-radius: var(--medium-BorderRadius);
  }

  .link:hover {
    color: var(--theme-link-color);
  }

  .settings {
    border-radius: var(--medium-BorderRadius);
  }

  .setting {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-2);
    padding: var(--spacing-1_5) var(--spacing-2);

    & + .setting {
      border-top: 1px solid var(--theme-divider-color);
    }
  }

  /* Aligns the name with the text of the input next to it */
  .name {
    padding-top: 0.375rem;
  }

  .control {
    width: 13rem;
    max-width: 60%;
    flex-shrink: 0;
  }
</style>
