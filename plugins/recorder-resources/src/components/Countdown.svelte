<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { onMount, createEventDispatcher } from 'svelte'
  import { Label } from '@hcengineering/ui'
  import plugin from '../plugin'

  export let count = 3
  const dispatch = createEventDispatcher()

  onMount(() => {
    const ticker = setInterval(() => {
      if (count > 1) {
        count--
      } else {
        clearInterval(ticker)
        dispatch('close', true)
      }
    }, 1000)
  })
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="countdown-container"
  on:click={() => {
    dispatch('close', true)
  }}
>
  <div class="countdown-animation"></div>
  <div class="countdown">
    {count}
    <span class="countdown-info-text">
      <Label label={plugin.string.ClickToSkip} />
    </span>
  </div>
</div>

<style lang="scss">
  @keyframes gradient {
    0% {
      background-position: 0% 50%;
      transform: scale(1);
    }
    50% {
      background-position: 100% 50%;
      transform: scale(1.01);
    }
    100% {
      background-position: 0% 50%;
      transform: scale(1);
    }
  }
  .countdown-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .countdown {
    width: 12.5rem;
    height: 12.5rem;
    background: var(--theme-bg-color);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 7rem;
    text-align: center;
    position: relative;
    z-index: 2;
  }
  .countdown-info-text {
    font-size: 0.75rem;
  }
  .countdown-animation {
    position: absolute;
    width: 17.5em;
    height: 17.5rem;
    border-radius: 50%;
    background: linear-gradient(-45deg, #ff8c0099 70%, #3088c2b3 30%);
    filter: blur(1.5rem);
    animation: gradient 1s infinite ease;
    z-index: 1;
  }
</style>
