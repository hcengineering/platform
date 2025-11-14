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
  import { Card } from '@hcengineering/card'
  import { Asset } from '@hcengineering/platform'
  import { AnySvelteComponent } from '@hcengineering/ui'
  import { ObjectPresenterType } from '@hcengineering/view'
  import CardPresenter from './CardPresenter.svelte'

  export let value: Card[]
  export let disabled: boolean = false
  export let noUnderline: boolean = disabled
  export let colorInherit: boolean = false
  export let noSelect: boolean = true
  export let inline = false
  export let showParent: boolean = false
  export let type: ObjectPresenterType = 'link'
  export let icon: Asset | AnySvelteComponent | undefined = undefined
</script>

{#if value}
  <div class="flex-col-center">
    {#each value as card}
      <CardPresenter value={card} {noUnderline} {noSelect} {colorInherit} {inline} {showParent} {type} {icon} />
    {/each}
  </div>
{/if}
