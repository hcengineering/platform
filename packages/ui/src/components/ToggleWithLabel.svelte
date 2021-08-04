<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import type { IntlString } from '@anticrm/platform'
  
  import Toggle from './Toggle.svelte'
  import Label from './Label.svelte'
  
  export let label: IntlString
  export let description: IntlString | undefined = undefined
  export let on: boolean = false
</script>

<div class="toggleWithLabel">
  <div class="caption">
    <Label {label} />
    {#if description}
      <span><Label label={description} /></span>
    {/if}
  </div>
  <Toggle bind:on={on}/>
</div>

<style lang="scss">
  .toggleWithLabel {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .caption {
      margin-right: 16px;
      font-size: 14px;
      font-weight: 400;
      color: var(--theme-caption-color);
      user-select: none;
      span {
        display: block;
        font-size: 12px;
        opacity: .3;
      }
    }
  }
</style>
