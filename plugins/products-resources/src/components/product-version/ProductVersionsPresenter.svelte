<!--
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
-->
<script lang="ts">
  import { Product } from '@hcengineering/products'
  import { Icon, tooltip } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import products from '../../plugin'
  import ProductVersionsPopup from './ProductVersionsPopup.svelte'

  export let value: number
  export let object: Product
</script>

{#if value !== undefined && value > 0}
  <DocNavLink {object} inline noUnderline={true}>
    <div class="sm-tool-icon" use:tooltip={{ component: ProductVersionsPopup, props: { value: object } }}>
      <span class="icon"><Icon icon={products.icon.ProductVersion} size={'small'} /></span>&nbsp;{value}
    </div>
  </DocNavLink>
{/if}
