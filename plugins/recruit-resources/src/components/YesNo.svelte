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
  import type { IntlString } from '@hcengineering/platform'
  import type { ButtonKind, ButtonSize, TooltipAlignment } from '@hcengineering/ui'
  import { Button, Label } from '@hcengineering/ui'

  export let label: IntlString
  export let tooltip: IntlString
  export let value: boolean | undefined
  export let disabled: boolean = false
  export let labelDirection: TooltipAlignment | undefined = undefined

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'fit-content'

  export let focusIndex = -1
</script>

<Button
  {focusIndex}
  {kind}
  {size}
  {justify}
  {width}
  {disabled}
  notSelected={value === undefined}
  showTooltip={{ label: tooltip, direction: labelDirection }}
  on:click={() => {
    if (value === true) value = false
    else if (value === false) value = undefined
    else value = true
  }}
>
  <svelte:fragment slot="content">
    <div class="flex-row-center flex-no-wrap pointer-events-none">
      <span class="label overflow-label">
        <Label {label} />
      </span>
      <div class="btn-icon ml-1">
        <svg class="yesno-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
          <circle class="circle" class:yes={value === true} class:no={value === false} cx="8" cy="8" r="6" />
          {#if value === true}
            <polygon fill="#fff" points="7.4,10.9 4.9,8.4 5.7,7.6 7.3,9.1 10.2,5.6 11.1,6.4 " />
          {:else if value === false}
            <polygon
              fill="#fff"
              points="10.7,6 10,5.3 8,7.3 6,5.3 5.3,6 7.3,8 5.3,10 6,10.7 8,8.7 10,10.7 10.7,10 8.7,8 "
            />
          {:else}
            <path
              fill="#fff"
              d="M7.3,9.3h1.3V9c0.1-0.5,0.6-0.9,1.1-1.4c0.4-0.4,0.8-0.9,0.8-1.6c0-1.1-0.8-1.8-2.2-1.8c-1.4,0-2.4,0.8-2.5,2.2 h1.4c0.1-0.6,0.4-1,1-1C8.8,5.4,9,5.7,9,6.2c0,0.4-0.3,0.7-0.7,1.1c-0.5,0.5-1,0.9-1,1.7V9.3z M8,11.6c0.5,0,0.9-0.4,0.9-0.9 c0-0.5-0.4-0.9-0.9-0.9c-0.5,0-0.9,0.4-0.9,0.9C7.1,11.2,7.5,11.6,8,11.6z"
            />
          {/if}
        </svg>
      </div>
    </div>
  </svelte:fragment>
</Button>

<style lang="scss">
  .btn-icon {
    color: var(--theme-content-color);
    transition: color 0.15s;
    pointer-events: none;
    &:hover {
      color: var(--theme-caption-color);
    }
    &:disabled:hover {
      color: var(--theme-content-color);
    }
  }

  .yesno-svg {
    width: 1rem;
    height: 1rem;

    .circle {
      fill: var(--grayscale-grey-03);
      &.yes {
        fill: #60b96e;
      }
      &.no {
        fill: #f06c63;
      }
    }
  }
</style>
