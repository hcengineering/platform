<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import Avatar from './icons/Avatar.svelte'

  import { getFileUrl } from '../utils'

  export let avatar: string | undefined = undefined
  export let size: 'x-small' | 'small' | 'medium' | 'large' | 'x-large'

  const url = avatar ? getFileUrl(avatar) : undefined
</script>

<div class="{size} flex-center container" class:no-img={!url}>
  {#if url}
    {#if size === 'large' || size === 'x-large'}
      <img class="{size} blur" src={url} alt={''}/>
    {/if}
    <img class="{size} mask" src={url} alt={''}/>
  {:else}
    <Avatar {size}/>
  {/if}
</div>

<style lang="scss">
  @import '../../../../packages/theme/styles/mixins.scss';

  .container {
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
    border-radius: 50%;
    pointer-events: none;

    img { object-fit: cover; }

    &.no-img {
      border: 2px solid var(--theme-avatar-border);

      &::after {
        content: '';
        @include bg-layer(var(--theme-avatar-hover), .5);
      }
      &::before {
        content: '';
        @include bg-layer(var(--theme-avatar-bg), .1);
      }
    }
  }

  .x-small {
    width: 1.5rem;   // 24
    height: 1.5rem;
    .mask, &.no-img { border-style: none; }
  }
  .small {
    width: 2rem;     // 32
    height: 2rem;
    .mask, &.no-img { border-style: none; }
  }
  .medium {
    width: 2.25rem;  // 36
    height: 2.25rem;
    .mask, &.no-img { border-style: none; }
  }
  .large {
    width: 4.5rem;   // 72
    height: 4.5rem;
  }
  .x-large {
    width: 7.5rem;   // 120
    height: 7.5rem;
  }

  .blur {
    position: absolute;
    filter: blur(32px);
  }
  .mask {
    position: absolute;
    border: 2px solid var(--theme-avatar-border);
    border-radius: 50%;
  }
  // .shadow { filter: drop-shadow(0px 14px 44px rgba(74, 67, 64, .8)); }
</style>