<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import type { IntlString, Asset } from '@anticrm/platform'
  import type { AnySvelteComponent } from '@anticrm/ui'
  import { Icon, Label } from '@anticrm/ui'

  export let icon: Asset | AnySvelteComponent
  export let label: IntlString

</script>

<div class="tag-container">
  <div class="icon">
    {#if typeof (icon) === 'string'}
      <Icon {icon} size={'small'}/>
    {:else}
      <svelte:component this={icon} size={'small'} />
    {/if}
  </div>
  <Label {label} />
</div>

<style lang="scss">
  .tag-container {
    display: flex;
    align-items: center;
    padding: 6px 10px;
    font-size: 12px;
    text-align: center;
    background-color: var(--theme-bg-accent-color);
    color: var(--theme-caption-color);
    border-radius: 8px;
    
    .icon {
      margin-right: .3em;
      width: 16px;
      height: 16px;
    }
  }
</style>
