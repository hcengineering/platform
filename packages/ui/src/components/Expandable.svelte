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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import ExpandCollapse from './ExpandCollapse.svelte'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'
  import Chevron from './Chevron.svelte'

  export let icon: Asset | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let expanded: boolean = false
  export let bordered: boolean = false
  export let expandable = true
  export let contentColor = false
</script>

<div class="flex-col">
  <div class="expandable-header flex-between" class:expanded class:bordered>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="flex-row-center mr-4"
      class:cursor-pointer={expandable}
      on:click|stopPropagation={() => {
        if (expandable) expanded = !expanded
      }}
    >
      <Chevron {expanded} marginRight={'.5rem'} />
      {#if icon}
        <div class="min-w-4 mr-2">
          <Icon {icon} size={'small'} />
        </div>
      {/if}
      <span class="fs-title overflow-label" class:content-color={contentColor}>
        {#if label}<Label {label} />{/if}<slot name="title" />
      </span>
    </div>
    {#if $$slots.tools}
      <div class="buttons-group small-gap">
        <slot name="tools" />
      </div>
    {/if}
  </div>
  <ExpandCollapse isExpanded={expanded}>
    <slot />
  </ExpandCollapse>
</div>

<style lang="scss">
  .expandable-header {
    transition: margin-bottom 0.15s var(--timing-main);

    &:not(.expanded) {
      margin-bottom: 0;
    }
    &.expanded {
      margin-bottom: 0.75rem;
    }
    &.bordered {
      padding: 0.25rem 0.5rem;
      background-color: var(--theme-comp-header-color);
      border: 1px solid var(--theme-divider-color);
      border-radius: 0.25rem;
    }
  }
</style>
