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
  import { Employee, getName, Person } from '@hcengineering/contact'
  import { IntlString } from '@hcengineering/platform'
  import { Avatar } from '@hcengineering/presentation'
  import { Label, LabelAndProps, tooltip } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'

  export let value: Person | Employee | undefined | null
  export let inline: boolean = false
  export let isInteractive = true
  export let shouldShowAvatar: boolean = true
  export let shouldShowName = true
  export let shouldShowPlaceholder = false
  export let defaultName: IntlString | undefined = undefined
  export let avatarSize: 'inline' | 'tiny' | 'x-small' | 'small' | 'medium' | 'large' | 'x-large' = 'x-small'
  export let onEdit: ((event: MouseEvent) => void) | undefined = undefined
  export let showTooltip: LabelAndProps | undefined = undefined
  export let enlargedText = false
  export let element: HTMLElement | undefined = undefined
</script>

{#if value}
  <DocNavLink object={value} onClick={onEdit} disableClick={!isInteractive}>
    <span use:tooltip={showTooltip} class="contentPresenter" class:text-base={enlargedText}>
      {#if shouldShowAvatar}
        <span
          class="eContentPresenterIcon"
          class:mr-2={shouldShowName && !enlargedText}
          class:mr-3={shouldShowName && enlargedText}
        >
          <Avatar size={avatarSize} avatar={value.avatar} />
        </span>
      {/if}
      {#if shouldShowName}
        <span class="eContentPresenterLabel">{getName(value)}</span>
      {/if}
    </span>
  </DocNavLink>
{:else if shouldShowPlaceholder}
  <span use:tooltip={showTooltip} class="contentPresenter" class:text-base={enlargedText}>
    {#if shouldShowAvatar}
      <span
        class="eContentPresenterIcon"
        class:mr-2={shouldShowName && !enlargedText}
        class:mr-3={shouldShowName && enlargedText}
      >
        <Avatar size={avatarSize} />
      </span>
    {/if}
    {#if shouldShowName && defaultName}
      <span class="eContentPresenterLabel">
        <Label label={defaultName} />
      </span>
    {/if}
  </span>
{/if}

<style lang="scss">
  .contentPresenter {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;

    &.inline-presenter {
      display: inline-flex;
      align-items: baseline;
    }
    .eContentPresenterIcon {
      color: var(--dark-color);
    }
    .eContentPresenterLabel {
      min-width: 0;
      font-weight: 500;
      text-align: left;
      color: var(--accent-color);

      overflow: hidden;
      visibility: visible;
      display: -webkit-box;
      /* autoprefixer: ignore next */
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      user-select: none;
    }
    &:hover {
      .eContentPresenterIcon {
        color: var(--caption-color);
      }
      .eContentPresenterLabel {
        text-decoration: underline;
        color: var(--caption-color);
      }
    }
  }
</style>
