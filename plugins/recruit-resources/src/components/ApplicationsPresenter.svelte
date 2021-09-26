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

  import type { Candidate } from '@anticrm/recruit'
  import { CircleButton, IconFile, Label, showPopup, closePopup } from '@anticrm/ui'
  import Vacancy from './icons/Vacancy.svelte'
  import ApplicationsPopup from './ApplicationsPopup.svelte'

  export let value: Candidate

  let trigger: HTMLElement
  const apps = [{ label: 'Lead analyst', description: 'Tesla' },
                { label: 'Principal analyst', description: 'Google' }]
</script>

{#if value.applications && value.applications > 0}
  <div class="apps-container"
    bind:this={trigger}
    on:mouseenter={() => { showPopup(ApplicationsPopup, {value}, trigger) }}
    on:mouseleave={() => { closePopup() }}
  >
    <div class="icon"><IconFile size={'small'} /></div>
    {value.applications}
  </div>
{/if}


<style lang="scss">
  .apps-container {
    position: relative;
    display: flex;
    align-items: center;
    color: var(--theme-content-color);
    cursor: pointer;

    .icon {
      margin-right: .25rem;
      transform-origin: center center;
      transform: scale(.75);
      opacity: .6;
    }
    &:hover {
      color: var(--theme-caption-color);
      .icon { opacity: 1; }
      // &::after { content: ''; }
    }
    // &::after {
    //   position: absolute;
    //   top: 0;
    //   left: 0;
    //   right: 0;
    //   bottom: -2rem;
    //   background-color: rgba(255, 255, 0, .2);
    // }
  }
</style>
