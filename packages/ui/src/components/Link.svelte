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
  import type { IntlString, Asset } from '@anticrm/platform'
  import type { AnySvelteComponent } from '../types'
  import Icon from './Icon.svelte'

  export let label: IntlString
  export let href: string = '#'
  export let icon: Asset | AnySvelteComponent | undefined
  export let disabled: boolean = false
  export let maxLenght: number = 26

  const trimFilename = (fname: string): string => (fname.length > maxLenght)
                        ? fname.substr(0, (maxLenght - 1) / 2) + '...' + fname.substr(-(maxLenght - 1) / 2)
                        : fname
</script>

<span class="container" class:disabled on:click>
  {#if icon}
    <span class="icon">
      <Icon {icon} size={'small'}/>
    </span>
  {/if}
  {#if disabled}
    {trimFilename(label)}
  {:else}
    <a {href}>{trimFilename(label)}</a>
  {/if}
</span>

<style lang="scss">
  .container {
    display: inline-flex;
    align-items: center;
    line-height: 100%;
    cursor: pointer;

    .icon {
      margin-right: .25rem;
      color: var(--theme-content-color);
    }
    &:hover .icon { color: var(--theme-caption-color); }
    &:active .icon { color: var(--theme-content-accent-color); }
  }
  .disabled {
    cursor: not-allowed;
    color: var(--theme-content-trans-color);
    .icon { color: var(--theme-content-trans-color); }
    &:hover .icon { color: var(--theme-content-trans-color); }
    &:active .icon { color: var(--theme-content-trans-color); }
  }
</style>
