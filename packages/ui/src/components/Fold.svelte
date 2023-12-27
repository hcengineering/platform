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
  export let isOpen: boolean
  export let empty: boolean = false
  export let level: number = 1
</script>

<div class="hulyFold-container" class:opened={isOpen && !empty} style:margin-left={`${(level - 1) * 1.5}rem`}>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {#if empty}
      <path
        d="M8 8.99988C8.55228 8.99988 9 8.55216 9 7.99988C9 7.44759 8.55228 6.99988 8 6.99988C7.44772 6.99988 7 7.44759 7 7.99988C7 8.55216 7.44772 8.99988 8 8.99988Z"
      />
    {:else}
      <path d="M11 8L5.99995 3L5.29285 3.70711L9.58574 8L5.29285 12.2929L5.99995 13L11 8Z" />
    {/if}
  </svg>
</div>

<style lang="scss">
  .hulyFold-container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    padding: 0.25rem;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.25rem;
    color: var(--button-disabled-IconColor);
    transform-origin: center;
    transform: rotate(0deg);
    transition: transform 0.15s ease-in-out;

    &.opened {
      transform: rotate(90deg);
    }
  }
</style>
