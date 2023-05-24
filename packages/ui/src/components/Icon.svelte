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
  import { Asset, getMetadata } from '@hcengineering/platform'
  import { AnySvelteComponent, IconSize } from '../types'
  import { ComponentType } from 'svelte'

  export let icon: Asset | AnySvelteComponent | ComponentType
  export let size: IconSize
  export let iconProps: any | undefined = undefined
  export let fill: string | undefined = 'currentColor'

  function isAsset (icon: Asset | AnySvelteComponent): boolean {
    return typeof icon === 'string'
  }

  function toAsset (icon: AnySvelteComponent | Asset): Asset {
    return icon as Asset
  }

  let url: string
  $: url = isAsset(icon) ? getMetadata(toAsset(icon)) ?? 'https://anticrm.org/logo.svg' : ''

  $: _fill = iconProps?.fill ?? fill
</script>

{#if isAsset(icon)}
  <svg class="svg-{size}" fill={_fill} {...iconProps}>
    <use href={url} />
  </svg>
{:else if typeof icon !== 'string'}
  <svelte:component this={icon} {size} fill={_fill} {...iconProps} />
{/if}
