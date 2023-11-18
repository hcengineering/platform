<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { onMount } from 'svelte'
  import FontSize from './icons/FontSize.svelte'
  import CheckCircled from './icons/CheckCircled.svelte'

  export let size: string
  export let focused: string

  let btn: HTMLButtonElement

  onMount(() => {
    if (focused === size) btn.focus()
  })
</script>

<button
  bind:this={btn}
  class="antiButton regular sh-no-shape jf-center bs-none no-focus statusPopupThemeButton"
  class:focused={focused === size}
  class:both={size === 'theme-system'}
>
  {#if size === 'theme-light' || size === 'theme-system'}
    <div class="light-container">
      <div class="paper"><FontSize /></div>
    </div>
  {/if}
  {#if size === 'theme-dark' || size === 'theme-system'}
    <div class="dark-container">
      <div class="paper"><FontSize /></div>
    </div>
  {/if}
  {#if focused === size}
    <CheckCircled />
  {/if}
</button>

<style lang="scss">
  :global(.statusPopupThemeButton svg.check) {
    position: absolute;
    bottom: 3px;
    right: 3px;
    width: 16px;
    height: 16px;
  }
  .statusPopupThemeButton {
    position: relative;
    flex-shrink: 0;
    width: 76px;
    height: 56px;
    border-radius: 6px;

    .light-container {
      background-color: #f5f5f5;
      border: 1px solid rgba(0, 0, 0, 0.1);

      .paper {
        color: #000000cc;
        background-color: #fff;
        border-top: 1px solid rgba(0, 0, 0, 0.2);
        border-left: 1px solid rgba(0, 0, 0, 0.2);
      }
    }
    .dark-container {
      background-color: #3f3f3f;

      .paper {
        color: #ffffffcc;
        background-color: #161516;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        border-left: 1px solid rgba(255, 255, 255, 0.2);
      }
    }
    .light-container,
    .dark-container {
      overflow: hidden;
      height: 100%;

      .paper {
        padding: 6px 0 0 6px;
        width: 100%;
        height: 100%;
        border-radius: 4px 0px 5.5px 0px;
      }
    }
    &.both {
      .light-container {
        border-right: none;
        border-radius: 5.75px 0 0 5.75px;
      }
      .dark-container {
        border-radius: 0 5.75px 5.75px 0;
      }
      .light-container,
      .dark-container {
        width: 50%;

        .paper {
          margin: 16px 0 0 8px;
        }
      }
    }
    &:not(.both) {
      .dark-container {
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .light-container,
      .dark-container {
        width: 100%;
        border-radius: 5.75px;

        .paper {
          margin: 16px 0 0 16px;
        }
      }
    }

    &:hover:not(:focus) {
      .light-container .paper {
        color: #000;
        background-color: #f2f2f2;
      }
      .dark-container .paper {
        color: #fff;
        background-color: #222222;
      }
    }
    &.focused::before,
    &:focus::before {
      position: absolute;
      content: '';
      inset: -3px;
      border: 1px solid var(--primary-button-default);
      border-radius: 8.5px;
      cursor: default;
    }
  }
</style>
