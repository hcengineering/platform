<!--
// 
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { Contact } from '@anticrm/contact'
  import { ClassifierKind, Doc, Mixin } from '@anticrm/core'
  import {
    getClient
  } from '@anticrm/presentation'
  import { Label } from '@anticrm/ui'
  import contact from '../plugin'
  import { getMixinStyle } from '../utils'

  export let value: Contact

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let mixins: Mixin<Doc>[] = []

  $: if (value !== undefined) {
    mixins = hierarchy
      .getDescendants(contact.class.Contact)
      .filter((m) => hierarchy.getClass(m).kind === ClassifierKind.MIXIN && hierarchy.hasMixin(value, m))
      .map((m) => hierarchy.getClass(m) as Mixin<Doc>)
  }
</script>
{#if mixins.length > 0}
  <div class="mixin-container">
    {#each mixins as mixin}
      <div class="mixin-selector" 
      style={getMixinStyle(mixin._id, true)}>
        <Label label={mixin.label} />
      </div>
    {/each}
  </div>
{/if}
<style lang="scss">
  .mixin-container {
    display: flex;
    .mixin-selector {
      margin-left: 8px;
      cursor: pointer;
      height: 24px;
      min-width: 84px;
      
      border-radius: 8px;

      font-weight: 500;
      font-size: 10px;

      text-transform: uppercase;
      color: #FFFFFF;

      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
