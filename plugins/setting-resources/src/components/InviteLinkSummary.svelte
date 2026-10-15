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

<div class="flex-row-center flex-wrap flex-gap-1-5 {muted ? 'text-md content-dark-color' : 'caption-color'}">
  {#if role !== undefined}
    <span class="invite-summary-part font-medium caption-color"><Label label={role} /></span>
  {/if}
  {#each items as item}
    <span class="invite-summary-part"><Label label={item.label} params={item.params} /></span>
  {/each}
  <slot />
</div>

<style lang="scss">
  /* Keeps parts with block-level content (such as a person presenter) on the same line */
  div :global(.invite-summary-part) {
    display: inline-flex;
    align-items: center;
  }

  div :global(.invite-summary-part + .invite-summary-part::before) {
    content: '·';
    margin-right: 0.375rem;
    opacity: 0.6;
  }
</style>
