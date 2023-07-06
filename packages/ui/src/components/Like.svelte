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
  import Like from './icons/Like.svelte'

  export let value: number = Math.round(Math.random() * 100)
  export let voted: boolean = !!Math.round(Math.random())

  const vote = () => {
    voted = !voted
    value++
  }
</script>

<div class="like-container" class:voted>
  {#if value > 0}<span>{value}</span>{/if}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="icon" on:click={vote}>
    <Like size={'small'} />
  </div>
</div>

<style lang="scss">
  .like-container {
    display: flex;
    align-items: center;
    // line-height: 100%;

    span {
      text-align: right;
      font-size: 0.8125rem;
      color: var(--caption-color);
    }
    .icon {
      margin-left: 0.25rem;
      color: var(--theme-trans-color);
      cursor: pointer;

      &:hover {
        color: var(--dark-color);
      }
      &:active {
        color: var(--theme-darker-color);
      }
    }

    &.voted {
      .icon {
        color: var(--accented-button-default);

        &:hover {
          color: var(--accented-button-hovered);
        }
        &:active {
          color: var(--accented-button-pressed);
        }
      }
    }
  }
</style>
