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

  export let icon: Asset | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let expanded: boolean = false
  export let expandable = true
</script>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="flex-grow flex" class:expanded class:expandable>
  <div
    class="fs-title flex-row-center mr-4"
    on:click|stopPropagation={() => {
      expanded = !expanded
    }}
  >
    <div class="chevron" class:expanded>▶</div>
    <div class="an-element__icon">
      {#if icon}
        <Icon {icon} size={'small'} />
      {/if}
    </div>
    <span class="an-element__label title">
      {#if label}<Label {label} />{/if}
      <slot name="title" />
    </span>
  </div>
  <slot name="tools" />
</div>
<ExpandCollapse isExpanded={expanded}>
  <div class="antiComponent p-2">
    <slot />
  </div>
</ExpandCollapse>

<style lang="scss">
  .expandable {
    .chevron {
      content: '▶';
      margin-right: 0.5rem;
      font-size: 0.75rem;
      color: var(--dark-color);
      &.expanded {
        transform: rotateZ(90deg);
      }
    }
  }
</style>
