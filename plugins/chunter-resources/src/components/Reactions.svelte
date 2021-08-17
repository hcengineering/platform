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
  import type { AnySvelteComponent } from '@anticrm/ui'
  import Check from './icons/Check.svelte'
  import Heart from './icons/Heart.svelte'

  interface Reaction {
    icon: AnySvelteComponent
    count: number
  }

  export let reactions: Reaction[] = [{ icon: Check, count: 3}, { icon: Heart, count: 10}]
</script>

<div class="container">
  {#each reactions as reaction}
    <div class="flex-row-center reaction">
      <svelte:component this={reaction.icon} size={'medium'}/>
      <div class="caption-color counter">{reaction.count}</div>
    </div>
  {/each}
</div>

<style lang="scss">
  .container {
    display: flex;
    user-select: none;

    .counter { margin-left: .25rem; }
    .reaction + .reaction { margin-left: 1rem; }
  }
</style>