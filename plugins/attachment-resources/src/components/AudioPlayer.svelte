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
  import type { Attachment } from '@hcengineering/attachment'
  import { getBlobHref, getFileUrl } from '@hcengineering/presentation'
  import { CircleButton, Progress } from '@hcengineering/ui'
  import Play from './icons/Play.svelte'
  import Pause from './icons/Pause.svelte'
  import type { WithLookup } from '@hcengineering/core'

  export let value: WithLookup<Attachment>
  export let fullSize = false

  let time = 0
  let duration = Number.POSITIVE_INFINITY
  let paused = true

  function buttonClick (): void {
    paused = !paused
  }

  $: icon = !paused ? Pause : Play
</script>

<div class="container flex-between" class:fullSize>
  <div>
    <CircleButton size="x-large" on:click={buttonClick} {icon} />
  </div>
  <div class="w-full ml-4">
    <Progress
      value={time}
      max={Number.isFinite(duration) ? duration : 100}
      editable
      on:change={(e) => (time = e.detail)}
    />
  </div>
</div>
<audio bind:duration bind:currentTime={time} bind:paused>
  {#await getBlobHref(value.$lookup?.file, value.file, value.name) then href}
    <source src={href} type={value.type} />
  {/await}
</audio>

<style lang="scss">
  .container {
    padding: 0.5rem;
    width: 20rem;
    background-color: var(--accent-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.75rem;

    &.fullSize {
      width: 100%;
    }
  }
</style>
