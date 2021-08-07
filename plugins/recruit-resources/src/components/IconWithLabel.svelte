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

<div class="label-container">
  <div class="icon">
    {#if typeof (icon) === 'string'}
      <Icon {icon} size={'large'}/>
    {:else}
      <svelte:component this={icon} size={'large'} />
    {/if}
  </div>
  <Label {label} />
</div>

<style lang="scss">
  .label-container {
    display: flex;
    align-items: center;
    font-weight: 500;
    font-size: 16px;
    color: var(--theme-caption-color);
    
    .icon {
      margin-right: .5em;
      width: 24px;
      height: 24px;
    }
  }
</style>
