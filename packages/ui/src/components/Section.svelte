<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { Asset, IntlString } from '@hcengineering/platform'
  import type { AnySvelteComponent } from '../types'
  import Label from './Label.svelte'
  import ArrowUp from './icons/Up.svelte'
  import ArrowDown from './icons/Down.svelte'
  import Icon from './Icon.svelte'

  export let icon: Asset | AnySvelteComponent
  export let label: IntlString
  export let closed: boolean = false
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="flex-row-center section-container"
  on:click|preventDefault={() => {
    closed = !closed
  }}
>
  <Icon {icon} size={'small'} />
  <!-- <svelte:component this={icon} size={'small'} /> -->
  <div class="title"><Label {label} /></div>
  <div class="arrow">
    {#if closed}<ArrowUp size={'small'} />{:else}<ArrowDown size={'small'} />{/if}
  </div>
</div>
{#if !closed}<div class="section-content"><slot /></div>{/if}

<style lang="scss">
  .section-container {
    width: 100%;
    height: 5rem;
    min-height: 5rem;
    cursor: pointer;
    user-select: none;

    .title {
      flex-grow: 1;
      margin-left: 0.75rem;
      font-weight: 500;
      color: var(--caption-color);
    }
    .arrow {
      margin: 0.5rem;
    }
  }
  .section-content {
    margin: 1rem 0 3.5rem;
    height: auto;
  }
  :global(.section-container + .section-container),
  :global(.section-content + .section-container) {
    border-top: 1px solid var(--divider-color);
  }
</style>
