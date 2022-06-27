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
  import type { Doc, Ref } from '@anticrm/core'
  import { Button, eventToHTMLElement, Icon, IconAdd, Label, showPopup } from '@anticrm/ui'
  import { Table } from '@anticrm/view-resources'
  import inventory from '../plugin'
  import CreateVariant from './CreateVariant.svelte'

  export let objectId: Ref<Doc>

  export let variants: number

  const create = (ev: MouseEvent): void => {
    showPopup(CreateVariant, { product: objectId }, eventToHTMLElement(ev))
  }
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <span class="antiSection-header__title">
      <Label label={inventory.string.Variants} />
    </span>
    <Button icon={IconAdd} kind={'transparent'} shape={'circle'} on:click={create} />
  </div>
  {#if variants > 0}
    <Table
      _class={inventory.class.Variant}
      config={['', 'sku', 'modifiedOn']}
      options={{}}
      query={{ attachedTo: objectId }}
      loadingProps={{ length: variants }}
    />
  {:else}
    <div class="antiSection-empty solid flex-col-center mt-3">
      <div class="content-accent-color">
        <Icon size={'large'} icon={inventory.icon.Variant} />
      </div>
      <span class="text-sm dark-color mt-2">
        <Label label={inventory.string.NoVariantsForProduct} />
      </span>
      <span class="text-sm content-accent-color over-underline" on:click={create}>
        <Label label={inventory.string.CreateVariant} />
      </span>
    </div>
  {/if}
</div>
