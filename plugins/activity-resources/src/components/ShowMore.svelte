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
  import { Label } from '@anticrm/ui'
  import activity from '@anticrm/activity'

  export let limit: number = 240
  export let ignore: boolean = false

  let cHeight: number
  let bigger: boolean = false
  let crop: boolean = false

  const toggle = (): void => { crop = !crop }

  $: if (cHeight > limit && !bigger) bigger = true
  $: if (bigger && !ignore) crop = true
</script>

<div class="relative">
  <div
    bind:clientHeight={cHeight}
    class="showMore-content"
    class:crop={!ignore && crop}
  ><slot /></div>

  {#if !ignore && bigger}
    <div class="showMore" class:outter={cHeight > limit} on:click={toggle}>
      <Label label={(cHeight > limit) ? activity.string.ShowLess : activity.string.ShowMore} />
    </div>
  {/if}
</div>

<style lang="scss">
  .showMore-content {
    max-height: max-content;

    &.crop {
      overflow: hidden;
      max-height: 15rem;
      mask: linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 75%);
    }
  }

  .showMore {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0 auto;
    padding: .5rem 1rem;
    width: fit-content;

    font-size: .75rem;
    color: var(--theme-caption-color);
    background: var(--theme-card-bg);
    border: .5px solid var(--theme-card-divider);
    box-shadow: 0px 8px 15px rgba(0, 0, 0, .1);
    backdrop-filter: blur(120px);
    border-radius: 2.5rem;
    cursor: pointer;

    opacity: .3;
    transform: scale(.9);
    transition: opacity .1s ease-in-out, transform .1s ease-in-out;
    &:hover {
      opacity: 1;
      transform: scale(1);
    }
    &:active {
      opacity: .9;
      transform: scale(.95);
    }

    &.outter { bottom: -2.25rem; }
  }
</style>
