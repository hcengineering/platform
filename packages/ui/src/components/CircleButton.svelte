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
  import type { IntlString, Asset } from '@anticrm/platform'
  import type { AnySvelteComponent } from '@anticrm/ui'
  import Icon from './Icon.svelte'

  export let icon: Asset | AnySvelteComponent
</script>

<div class="icon-button" on:click>
  <div class="content">
    {#if typeof (icon) === 'string'}
      <Icon {icon} size={'small'}/>
    {:else}
      <svelte:component this={icon} size={'small'} />
    {/if}
  </div>
</div>

<style lang="scss">
  .icon-button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 2rem;
    height: 2rem;
    background-color: rgba(255, 255, 255, .2);
    border-radius: 50%;
    backdrop-filter: blur(3px);
    cursor: pointer;

    .content {
      transform-origin: center center;
      transform: scale(.75);
      pointer-events: none;
    }

    &:hover {
      background-color: rgba(255, 255, 255, .25);
      box-shadow: 0 0 .5rem rgba(0, 0, 0, .3);
    }
    &:active {
      background-color: rgba(255, 255, 255, .15);
      box-shadow: 0 0 .5rem rgba(0, 0, 0, .1);
    }
  }
</style>
