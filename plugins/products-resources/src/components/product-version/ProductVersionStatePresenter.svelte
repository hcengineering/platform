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

<script lang="ts" context="module">
  import type { ComponentProps } from 'svelte'
  import type { IntlString } from '@hcengineering/platform'
  import { StateTag, StateType } from '@hcengineering/ui'
  import { ProductVersionState } from '@hcengineering/products'

  import products from '../../plugin'

  export const propsByStates: Record<ProductVersionState, ComponentProps<StateTag<IntlString>>> = {
    [ProductVersionState.Active]: {
      label: products.string.ProductVersionStateActive,
      params: {},
      type: StateType.Regular
    },
    [ProductVersionState.Released]: {
      label: products.string.ProductVersionStateReleased,
      params: {},
      type: StateType.Positive
    }
  }
</script>

<script lang="ts">
  export let value: ProductVersionState
</script>

<div class="inline-flex">
  <StateTag {...propsByStates[value]} />
</div>
