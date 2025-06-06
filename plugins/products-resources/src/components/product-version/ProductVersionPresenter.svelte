<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
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
//
-->

<script lang="ts">
  import { Product, ProductVersion } from '@hcengineering/products'
  import { WithLookup } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { tooltip } from '@hcengineering/ui'
  import { DocNavLink, ObjectMention } from '@hcengineering/view-resources'

  import products from '../../plugin'

  import DocIcon from '../DocIcon.svelte'

  export let value: WithLookup<ProductVersion> | undefined
  export let inline: boolean = false
  export let disabled: boolean = false
  export let accent: boolean = false
  export let noUnderline: boolean = false
  export let shouldShowAvatar: boolean = true

  function getProductVersionName (value: ProductVersion): string {
    const version = `${value.major}.${value.minor}`
    const codename = value.codename ?? ''
    return codename !== '' ? `${version} ${codename}` : version
  }

  $: product = value?.$lookup?.space as Product
  $: version = value !== undefined ? getProductVersionName(value) : ''
  $: name = product !== undefined ? `${product.name} ${version}` : version
</script>

{#if value}
  {#if inline}
    <ObjectMention object={value} {disabled} title={name} />
  {:else}
    <DocNavLink object={value} {disabled} {accent} {noUnderline}>
      <div class="flex-presenter" use:tooltip={{ label: getEmbeddedLabel(name) }}>
        {#if shouldShowAvatar && product}
          <div class="icon">
            <DocIcon value={product} size={'small'} defaultIcon={products.icon.ProductVersion} />
          </div>
        {/if}
        <span class="label nowrap" class:no-underline={noUnderline || disabled} class:fs-bold={accent}>
          {name}
        </span>
      </div>
    </DocNavLink>
  {/if}
{/if}
