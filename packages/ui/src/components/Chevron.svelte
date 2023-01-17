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
  import IconDownOutline from './icons/DownOutline.svelte'

  export let size: 'small' | 'medium' = 'medium'
  export let fill = 'var(--dark-color)'
  export let expanded: boolean = false
  export let direction: 'left' | 'right' = 'right'
  export let outline: boolean = false
  export let marginRight: string | undefined = undefined
  export let marginLeft: string | undefined = undefined
  export let margin: string | undefined = undefined
</script>

<div
  class="chevron {size} {direction}"
  class:outline
  class:expanded
  style:margin-right={marginRight}
  style:margin-left={marginLeft}
  style:margin
>
  {#if outline}
    <IconDownOutline {size} {fill} />
  {:else}
    <svg {fill} viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,0L6,3L0,6Z" />
    </svg>
  {/if}
</div>

<style lang="scss">
  .chevron {
    flex-shrink: 0;
    transition: transform 0.15s var(--timing-main);

    &.outline {
      transform-origin: center;
      &.right {
        transform: rotate(-90deg);
      }
      &.left {
        transform: rotate(90deg);
      }
      &.expanded {
        transform: rotate(0deg);
      }
    }
    &:not(.outline) {
      transform-origin: 35% center;
      transform: rotate(0deg);

      &.small {
        width: 0.325rem;
        height: 0.325rem;
      }
      &.medium {
        width: 0.375rem;
        height: 0.375rem;
      }
      &.right {
        transform: rotate(0deg);
      }
      &.left {
        transform: rotate(180deg);
      }
      &.expanded {
        transform: rotate(90deg);
      }
    }
  }
</style>
