<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import { Product } from '@anticrm/inventory'
  import { closeTooltip, Icon, showPopup } from '@anticrm/ui'
  import inventory from '../plugin'
  import { EditDoc } from '@anticrm/view-resources'

  export let value: Product

  function show () {
    closeTooltip()
    showPopup(EditDoc, { _id: value._id, _class: value._class }, 'full')
  }
</script>

{#if value}
  <div class="sm-tool-icon container" on:click={show}>
    <Icon icon={inventory.icon.Products} size="medium" />
    <div class="overflow-label name">{value.name}</div>
  </div>
{/if}

<style lang="scss">
  .container {
    .name {
      margin-left: 0.5rem;
      font-weight: 500;
      text-align: left;
      color: var(--theme-content-accent-color);
    }
    &:hover .name {
      text-decoration: underline;
      color: var(--theme-caption-color);
    }
  }
</style>
