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

  export let size: string
  export let focused: string

  let btn: HTMLButtonElement

  onMount(() => {
    if (focused === size) btn.focus()
  })
</script>

<button
  bind:this={btn}
  class="antiButton regular sh-no-shape jf-center bs-solid no-focus statusPopupButton"
  class:focused={focused === size}
>
  <FontSize size={size === 'small-font' ? '20px' : '28px'} />
</button>

<style lang="scss">
  .statusPopupButton {
    position: relative;
    flex-shrink: 0;
    width: 52px;
    height: 52px;
    border-radius: 6px;

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
