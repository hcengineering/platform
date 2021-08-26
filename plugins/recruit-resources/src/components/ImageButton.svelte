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
  import type { IntlString, Asset } from '@anticrm/platform'
  import type { AnySvelteComponent } from '@anticrm/ui'
  import { Label, Icon } from '@anticrm/ui'

  export let label: IntlString
  export let icon: Asset | AnySvelteComponent
</script>

<div class="flex-row-center container">
  <div class="icon">
    {#if typeof (icon) === 'string'}
      <Icon {icon} size='small'/>
    {:else}
      <svelte:component this={icon} size='small' />
    {/if}
  </div>
  <span><Label {label} /></span>
</div>

<style lang="scss">
  .container {
    padding: .5rem .75rem;
    color: #fff;
    background-color: rgba(255, 255, 255, .17);
    border: 1px solid rgba(255, 255, 255, .14);
    border-radius: .5rem;
    backdrop-filter: blur(3px);
    cursor: pointer;

    .icon {
      transform-origin: center center;
      transform: scale(.75);
    }

    span {
      margin-left: 0.376rem;
      font-weight: 500;
      user-select: none;
    }

    &:hover {
      background-color: rgba(255, 255, 255, .22);
      border-color: rgba(255, 255, 255, .19);
      box-shadow: 0 0 1rem rgba(0, 0, 0, .3);
    }
    &:active {
      box-shadow: 0 0 1rem rgba(0, 0, 0, .1);
    }
  }
</style>
