<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Employee, Person } from '@hcengineering/contact'
  import { IconSize, LabelAndProps, tooltip } from '@hcengineering/ui'
  import { DocNavLink, ObjectMention } from '@hcengineering/view-resources'
  import { ObjectPresenterType } from '@hcengineering/view'

  import Avatar from './Avatar.svelte'

  export let value: Person | Employee | undefined | null
  export let name: string
  export let inline: boolean = false
  export let disabled: boolean = false
  export let shouldShowAvatar: boolean = true
  export let shouldShowName: boolean = true
  export let noUnderline: boolean = false
  export let avatarSize: IconSize = 'x-small'
  export let onEdit: ((event: MouseEvent) => void) | undefined = undefined
  export let showTooltip: LabelAndProps | undefined = undefined
  export let enlargedText: boolean = false
  export let colorInherit: boolean = false
  export let accent: boolean = false
  export let maxWidth: string = ''
  export let type: ObjectPresenterType = 'link'
  export let showStatus = true
  export let overflowLabel = true
</script>

{#if value}
  {#if inline}
    <ObjectMention object={value} {disabled} {accent} {noUnderline} {colorInherit} onClick={onEdit} />
  {:else if type === 'link'}
    <DocNavLink object={value} onClick={onEdit} {disabled} {noUnderline} {colorInherit} {accent} noOverflow>
      <span
        use:tooltip={disabled ? undefined : showTooltip}
        class="antiPresenter h-full"
        class:text-base={enlargedText}
        style:max-width={maxWidth}
      >
        {#if shouldShowAvatar}
          <span
            class="ap-icon"
            class:mr-2={shouldShowName && !enlargedText}
            class:mr-3={shouldShowName && enlargedText}
          >
            <Avatar size={avatarSize} person={value} name={value.name} {showStatus} />
          </span>
        {/if}
        {#if shouldShowName}
          <span class="ap-label" class:overflow-label={overflowLabel} class:colorInherit class:fs-bold={accent}>
            {name}
          </span>
        {/if}
      </span>
    </DocNavLink>
  {:else if type === 'text'}
    <span class:overflow-label={overflowLabel} use:tooltip={disabled ? undefined : showTooltip}>
      {name}
    </span>
  {/if}
{/if}
