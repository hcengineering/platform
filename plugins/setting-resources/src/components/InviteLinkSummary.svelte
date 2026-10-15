<!--
//
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
//
-->
<script lang="ts">
  import type { IntlString } from '@hcengineering/platform'
  import { Label } from '@hcengineering/ui'

  import type { InviteLinkSummaryItem } from '../inviteLinks'

  /** Parts of the summary, separated by a dot. */
  export let items: InviteLinkSummaryItem[]
  /** Optional emphasized first part. */
  export let role: IntlString | undefined = undefined
  /** Smaller, secondary text instead of the caption color. */
  export let muted: boolean = false
</script>

<div class="invite-summary" class:muted>
  {#if role !== undefined}
    <span class="invite-summary-part role"><Label label={role} /></span>
  {/if}
  {#each items as item}
    <span class="invite-summary-part"><Label label={item.label} params={item.params} /></span>
  {/each}
  <slot />
</div>

<style lang="scss">
  .invite-summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 0.375rem;
    color: var(--theme-caption-color);

    &.muted {
      font-size: 0.8125rem;
      color: var(--theme-dark-color);
    }
  }

  .role {
    font-weight: 500;
    color: var(--theme-caption-color);
  }

  .invite-summary :global(.invite-summary-part + .invite-summary-part::before) {
    content: '·';
    margin-right: 0.375rem;
    opacity: 0.6;
  }
</style>
