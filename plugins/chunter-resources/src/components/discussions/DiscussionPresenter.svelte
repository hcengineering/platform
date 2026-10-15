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
-->
<script lang="ts">
  import { type Discussion, getDiscussionTitle } from '@hcengineering/chunter'
  import { Icon, IconCheckCircle, Label } from '@hcengineering/ui'
  import { type ObjectPresenterType } from '@hcengineering/view'
  import { DocNavLink } from '@hcengineering/view-resources'

  import chunter from '../../plugin'
  import { getDiscussionVisibility } from '../../utils'

  export let value: Discussion | undefined = undefined
  export let type: ObjectPresenterType = 'link'
  export let disabled: boolean = false
  export let readonly: boolean = false
  export let inline: boolean = false
  export let noUnderline: boolean = true
  export let shouldShowAvatar: boolean = false
  export let colorInherit: boolean = false
  export let onClick: ((event: MouseEvent) => void) | undefined = undefined
  export let onOpenDiscussion: ((discussion: Discussion) => void) | undefined = undefined

  $: title = value !== undefined ? getDiscussionTitle(value) : undefined
  $: visibility = value !== undefined ? getDiscussionVisibility(value) : 'public'
  // Read-only lists restrict editing, but discussions must still open for reading.
  $: navigationDisabled = disabled && !readonly

  function open (event: MouseEvent): void {
    if (value !== undefined && onOpenDiscussion !== undefined) {
      onOpenDiscussion(value)
    } else {
      onClick?.(event)
    }
  }
</script>

{#if value !== undefined}
  {#if type === 'link'}
    <DocNavLink
      object={value}
      component={chunter.component.DiscussionPanel}
      disabled={navigationDisabled}
      {inline}
      {noUnderline}
      {colorInherit}
      onClick={onOpenDiscussion !== undefined || onClick !== undefined ? open : undefined}
    >
      <span class="flex-presenter flex-gap-2">
        {#if !inline}
          {#if shouldShowAvatar}
            <Icon icon={value.resolved ? IconCheckCircle : chunter.icon.Thread} size="small" />
            {#if visibility !== 'public'}
              <Icon icon={visibility === 'private' ? chunter.icon.Lock : chunter.icon.Collaborators} size="x-small" />
            {/if}
          {/if}
        {/if}
        <span class="overflow-label">
          {#if title !== undefined}{title}{:else}<Label label={chunter.string.UntitledDiscussion} />{/if}
        </span>
      </span>
    </DocNavLink>
  {:else}
    <span class="overflow-label">
      {#if title !== undefined}{title}{:else}<Label label={chunter.string.UntitledDiscussion} />{/if}
    </span>
  {/if}
{/if}
