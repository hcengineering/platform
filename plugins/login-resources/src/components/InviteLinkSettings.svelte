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
  import { Button, IconEdit, Label, Notice, NumberInput, Toggle } from '@hcengineering/ui'

  import {
    DEFAULT_INVITE_EXP_HOURS,
    type InviteLinkParams,
    isValidInviteLinkParams,
    summarizeInviteLink
  } from '../inviteLinkParams'
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
  let linkExpires = true
  let hours: number | undefined = DEFAULT_INVITE_EXP_HOURS
  let limitUses = false
  let uses: number | undefined = 1

  $: value = customized ? { expHours: linkExpires ? (hours ?? 0) : -1, limit: limitUses ? (uses ?? 0) : -1 } : defaults
  $: valid = isValidInviteLinkParams(value)
  $: unsafe = customized && value.expHours < 0 && value.limit < 0

  function customize (): void {
    // Start from the workspace defaults so customizing does not change anything by itself
    linkExpires = defaults.expHours > 0
    hours = defaults.expHours > 0 ? defaults.expHours : DEFAULT_INVITE_EXP_HOURS
    limitUses = defaults.limit > 0
    uses = defaults.limit > 0 ? defaults.limit : 1
    customized = true
  }
</script>

{#if !customized}
  <div class="defaults">
    <div class="defaults-info">
      <div class="summary">
        {#each summarizeInviteLink(defaults) as item, i}
          {#if i > 0}<span class="dot">·</span>{/if}
          <Label label={item.label} params={item.params} />
        {/each}
      </div>
      {#if settingsUrl !== undefined}
        <a class="caption link" href={settingsUrl} target="_blank" rel="noopener noreferrer">
          <Label label={login.string.WorkspaceDefaults} />
        </a>
      {:else}
        <span class="caption"><Label label={login.string.WorkspaceDefaults} /></span>
      {/if}
    </div>
    {#if canCustomize}
      <Button icon={IconEdit} label={login.string.CustomizeInviteLink} size={'medium'} on:click={customize} />
    {/if}
  </div>
{:else}
  <div class="custom">
    <div class="custom-header">
      <span class="title"><Label label={login.string.LinkSettings} /></span>
      <Button
        label={login.string.ResetToWorkspaceDefaults}
        kind={'link'}
        size={'small'}
        padding={'0'}
        on:click={() => (customized = false)}
      />
    </div>
    <div class="settings">
      <div class="setting">
        <div class="row">
          <Label label={login.string.LinkExpires} />
          <Toggle size={'small'} bind:on={linkExpires} />
        </div>
        {#if linkExpires}
          <div class="amount">
            <NumberInput bind:value={hours} minValue={1} maxDigitsAfterPoint={0} maxWidth={'5rem'} />
            <Label label={login.string.HoursUnit} params={{ count: hours ?? 0 }} />
          </div>
        {/if}
      </div>
      <div class="setting">
        <div class="row">
          <Label label={login.string.LimitUses} />
          <Toggle size={'small'} bind:on={limitUses} />
        </div>
        {#if limitUses}
          <div class="amount">
            <NumberInput bind:value={uses} minValue={1} maxDigitsAfterPoint={0} maxWidth={'5rem'} />
            <Label label={login.string.PeopleUnit} params={{ count: uses ?? 0 }} />
          </div>
        {/if}
      </div>
    </div>
    {#if unsafe}
      <Notice kind={'warning'} label={login.string.UnlimitedInviteWarning} />
    {/if}
  </div>
{/if}

<style lang="scss">
  .defaults {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2);
    padding: var(--spacing-1_5) var(--spacing-2);
    background-color: var(--theme-list-row-color);
    border-radius: var(--medium-BorderRadius);
  }

  .defaults-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-0_25);
    min-width: 0;
  }

  .summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 0.375rem;
    color: var(--theme-caption-color);
  }

  .dot {
    opacity: 0.6;
  }

  .caption {
    align-self: flex-start;
    font-size: 0.8125rem;
    font-weight: 400;
    color: var(--theme-dark-color);

    &.link:hover {
      color: var(--theme-link-color);
      text-decoration: underline;
    }
  }

  .custom {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .custom-header,
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2);
  }

  .title {
    font-weight: 500;
    color: var(--theme-caption-color);
  }

  .settings {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--medium-BorderRadius);
  }

  .setting {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    padding: var(--spacing-1_5) var(--spacing-2);

    & + .setting {
      border-top: 1px solid var(--theme-divider-color);
    }
  }

  .amount {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    font-size: 0.8125rem;
    color: var(--theme-dark-color);
  }
</style>
