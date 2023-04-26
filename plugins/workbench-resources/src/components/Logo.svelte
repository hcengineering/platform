<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { tooltip } from '@hcengineering/ui'
  import Arrows from './icons/Arrows.svelte'

  export let bundle: 'platform' | 'ezthera' = 'platform'
  export let label: IntlString
  export let selected: boolean
</script>

<button class="antiLogo {bundle}" class:selected tabindex="0" use:tooltip={{ label }} on:click>
  <span class="logo">{bundle === 'ezthera' ? 'E' : 'P'}</span>
  <div class="arrows"><Arrows size={'small'} /></div>
</button>

<style lang="scss">
  .antiLogo {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    font-weight: 500;
    color: var(--primary-button-color);
    border-radius: 0.25rem;
    outline: none;
    perspective: 16px;
    transform-style: preserve-3d;

    &.platform {
      background-color: #c93030;
    }
    &.ezthera {
      background-color: #2b5190;
    }

    &:focus {
      box-shadow: 0 0 0 2px var(--primary-button-focused-border);
    }

    .logo,
    .arrows {
      position: absolute;
      top: 50%;
      left: 50%;
      transition: all 0.15s ease-in-out;
    }
    .logo {
      transform: translate(-50%, -50%);
      opacity: 1;
    }
    .arrows {
      transform: translate(0, -50%) rotateY(0deg);
      opacity: 0;
    }
    &:hover {
      .logo {
        transform: translate(-100%, -50%);
        opacity: 0;
      }
      .arrows {
        transform: translate(-50%, -50%) rotateY(0deg);
        opacity: 1;
      }
    }
    &.selected:hover {
      .arrows {
        transform: translate(-50%, -50%) rotateY(180deg);
        opacity: 1;
      }
    }
  }
</style>
