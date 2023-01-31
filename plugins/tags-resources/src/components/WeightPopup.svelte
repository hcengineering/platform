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
  import { Button, resizeObserver } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tags from '../plugin'
  import { tagLevel } from '../utils'

  export let value: number | undefined
  export let schema: '3' | '9' = '9'

  const dispatch = createEventDispatcher()

  const labels = [tags.string.Initial, tags.string.Meaningfull, tags.string.Expert]
</script>

<div class="selectPopup max-width-40" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="header no-border p-3">
    {#each labels as l, i}
      <div class="flex gap-2 p-1">
        {#if schema === '9'}
          {#each Object.entries(tagLevel) as k, j}
            {@const valueK = i * 3 + j}
            <Button
              label={l}
              icon={k[1]}
              size={'small'}
              justify={'left'}
              selected={value === valueK}
              on:click={() => dispatch('close', valueK)}
              width={'8rem'}
            />
          {/each}
        {:else}
          {@const valueK = i * 3}
          <Button
            label={l}
            size={'small'}
            justify={'left'}
            selected={value === valueK}
            on:click={() => dispatch('close', valueK)}
            width={'8rem'}
          />
        {/if}
      </div>
    {/each}
  </div>
</div>
