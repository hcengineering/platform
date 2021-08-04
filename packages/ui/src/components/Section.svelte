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
  import { IntlString } from '@anticrm/platform'
  import type { AnySvelteComponent } from '../types'
  import Label from './Label.svelte'
  import ArrowUp from './icons/Up.svelte'
  import ArrowDown from './icons/Down.svelte'

  export let icon: AnySvelteComponent
  export let label: IntlString
  export let closed: boolean = false
</script>

<div class="section-container"
  on:click|preventDefault={() => {
    closed = !closed
  }}
>
  <svelte:component this={icon} size={'medium'} />
  <div class="title"><Label {label} /></div>
  <div class="arrow">{#if closed}<ArrowUp size={'small'} />{:else}<ArrowDown size={'small'} />{/if}</div>
</div>
<div class="section-content" class:hidden={closed}><slot/></div>

<style lang="scss">
  .section-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: nowrap;
    width: 100%;
    height: 80px;
    min-height: 80px;
    cursor: pointer;
    user-select: none;

    .title {
      flex-grow: 1;
      margin-left: 12px;
      font-weight: 500;
      color: var(--theme-caption-color);
    }
    .arrow {
      margin: 8px;
    }
  }
  .section-content {
    margin: 16px 0 54px;
    height: auto;
    visibility: visible;
    &.hidden {
      margin: 0;
      height: 0;
      visibility: hidden;
    }
  }
  :global(.section-container + .section-container),
  :global(.section-content + .section-container) {
    border-top: 1px solid var(--theme-menu-divider);
  }
</style>
