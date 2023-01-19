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
  import { Label } from '@hcengineering/ui'
  import { getBooleanLabel } from '../utils'

  export let value: any
</script>

<div
  class="flex-row-center yesno-container"
  class:yes={value === true}
  class:no={value === false}
  class:unknown={value === undefined}
>
  <svg class="svg-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
    <circle class:yes={value === true} class:no={value === false} cx="8" cy="8" r="6" />
    {#if value === true}
      <polygon fill="#fff" points="7.4,10.9 4.9,8.4 5.7,7.6 7.3,9.1 10.2,5.6 11.1,6.4 " />
    {:else if value === false}
      <polygon fill="#fff" points="10.7,6 10,5.3 8,7.3 6,5.3 5.3,6 7.3,8 5.3,10 6,10.7 8,8.7 10,10.7 10.7,10 8.7,8 " />
    {:else}
      <path
        fill="#fff"
        d="M7.3,9.3h1.3V9c0.1-0.5,0.6-0.9,1.1-1.4c0.4-0.4,0.8-0.9,0.8-1.6c0-1.1-0.8-1.8-2.2-1.8c-1.4,0-2.4,0.8-2.5,2.2 h1.4c0.1-0.6,0.4-1,1-1C8.8,5.4,9,5.7,9,6.2c0,0.4-0.3,0.7-0.7,1.1c-0.5,0.5-1,0.9-1,1.7V9.3z M8,11.6c0.5,0,0.9-0.4,0.9-0.9 c0-0.5-0.4-0.9-0.9-0.9c-0.5,0-0.9,0.4-0.9,0.9C7.1,11.2,7.5,11.6,8,11.6z"
      />
    {/if}
  </svg>
  <span><Label label={getBooleanLabel(value)} /></span>
</div>

<style lang="scss">
  .yesno-container {
    max-width: fit-content;
    user-select: none;

    fill: #77818e;
    &.yes {
      fill: #77c07b;
    }
    &.no {
      fill: #f96e50;
    }

    span {
      margin-left: 0.25rem;
      width: 1.6rem;
      white-space: nowrap;
      text-transform: capitalize;
      font-weight: 500;
      color: var(--theme-caption-color);
    }
  }
</style>
