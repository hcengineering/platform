<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Icon, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let icon: Asset | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let selected: boolean = false
  export let expandable = false

  const dispatch = createEventDispatcher()
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="antiNav-element"
  class:selected
  class:expandable
  on:click|stopPropagation={() => {
    dispatch('click')
  }}
>
  <div class="an-element__icon">
    {#if icon}
      <Icon {icon} size={'small'} />
    {/if}
  </div>
  <span class="an-element__label title">
    {#if label}<Label {label} />{/if}
  </span>
</div>

<style lang="scss">
  .expandable {
    position: relative;
    &::after {
      content: '▶';
      position: absolute;
      top: 50%;
      right: 0.5rem;
      font-size: 0.375rem;
      color: var(--dark-color);
      transform: translateY(-50%);
    }
  }
</style>
