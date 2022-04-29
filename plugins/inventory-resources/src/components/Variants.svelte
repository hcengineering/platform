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
  import { CircleButton, eventToHTMLElement, Icon, IconAdd, Label, showPopup } from '@anticrm/ui'
  import { Table } from '@anticrm/view-resources'
  import inventory from '../plugin'
  import CreateVariant from './CreateVariant.svelte'

  export let objectId: Ref<Doc>

  export let variants: number

  const create = (ev: MouseEvent): void => {
    showPopup(CreateVariant, { product: objectId }, eventToHTMLElement(ev))
  }
</script>

<div class="variants-container">
  <div class="flex-row-center">
    <div class="title"><Label label={inventory.string.Variants} /></div>
    <CircleButton icon={IconAdd} size={'small'} selected on:click={create} />
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
    <div class="flex-col-center mt-5 create-container">
      <Icon size={'large'} icon={inventory.icon.Variant} />
      <div class="text-sm content-dark-color mt-2">
        <Label label={inventory.string.NoVariantsForProduct} />
      </div>
      <div class="text-sm">
        <div class="over-underline" on:click={create}><Label label={inventory.string.CreateVariant} /></div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .variants-container {
    display: flex;
    flex-direction: column;

    .title {
      margin-right: 0.75rem;
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--theme-caption-color);
    }
  }

  .create-container {
    padding: 1rem;
    color: var(--theme-caption-color);
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 0.75rem;
  }
</style>
