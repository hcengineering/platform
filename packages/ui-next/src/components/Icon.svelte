<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { IconSize, IconComponent } from '../types'

  export let icon: IconComponent
  export let size: IconSize = 'small'

  function isAsset (icon: IconComponent): boolean {
    return typeof icon === 'string'
  }

  function toAsset (icon: IconComponent): Asset {
    return icon as Asset
  }

  let url: string
  $: url = isAsset(icon) ? getMetadata(toAsset(icon)) ?? '' : ''
</script>

{#if isAsset(icon) && url}
  <svg class="next-svg__{size}">
    <use href={url} />
  </svg>
{:else if typeof icon !== 'string'}
  <svelte:component this={icon} {size} />
{/if}
