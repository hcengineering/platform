<!--
// Copyright © 2021 Anticrm Platform Contributors.
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
  import type { Asset, IntlString } from '@anticrm/platform'
  import { Icon, Label } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let icon: Asset | undefined = undefined
  export let label: IntlString | undefined = undefined

  const dispatch = createEventDispatcher()
</script>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<div
  class="flex-row-center container"
  on:click|stopPropagation={() => {
    dispatch('click')
  }}
>
  <div class="icon">
    {#if icon}
      <Icon {icon} size={'small'} />
    {/if}
  </div>
  <span>
    {#if label}<Label {label} />{:else}{label}{/if}
  </span>
</div>

<style lang="scss">
  .container {
    margin: 0 1rem;
    padding-left: .625rem;
    padding-right: .75rem;
    min-height: 2.25rem;
    font-weight: 500;
    color: var(--theme-caption-color);
    border-radius: .5rem;
    user-select: none;
    cursor: pointer;

    .icon {
      margin-right: 1rem;
      width: 1rem;
      min-width: 1rem;
      height: 1rem;
      border-radius: .25rem;
    }
    span {
      flex-grow: 1;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    &:hover { background-color: var(--theme-button-bg-enabled); }
  }
</style>
