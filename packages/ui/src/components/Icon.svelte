<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import { Asset, getMetadata } from '@anticrm/platform'
  import { AnySvelteComponent } from '../types';

  export let icon: Asset | AnySvelteComponent
  export let size: 'xsmall' | 'small' | 'medium' | 'large'
  export let fill = 'currentColor'
  export let filled: boolean = false

  function isAsset (icon: Asset | AnySvelteComponent): boolean {
    return typeof icon === 'string'
  }

  function toAsset (icon: AnySvelteComponent | Asset): Asset {
    return icon as Asset
  }

  let url: string
  $: url = isAsset(icon) ? getMetadata(toAsset(icon)) ?? 'https://anticrm.org/logo.svg' : ''
</script>

{#if isAsset(icon)}
  <svg class={size} {fill}>
    <use href={url} />
  </svg>
{:else}
  <svelte:component this={icon} {size} {fill} {filled} />
{/if}

<style lang="scss">
  .xsmall {
    width: 0.857em;
    height: 0.857em;
  }

  .small {
    width: 1.143em;
    height: 1.143em;
  }
  .medium {
    width: 1.429em;
    height: 1.429em;
  }
  .large {
    width: 1.715em;
    height: 1.715em;
  }
</style>
