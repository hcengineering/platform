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
  import { createEventDispatcher } from 'svelte'
  import type { IntlString } from '@hcengineering/platform'
  import ThemeButton from './ThemeButton.svelte'
  import { Label } from '../..'

  export let themes: Array<{ id: string, label: IntlString, size: number }>
  export let selected: string = ''

  const dispatch = createEventDispatcher()

  const select = (size: string): void => {
    if (selected === size) return
    selected = size
    dispatch('close', size)
  }
</script>

<div class="antiPopup" style:flex-direction={'row'} style:padding={'12px'}>
  {#each themes as theme}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="statusPopup-option"
      class:selected={selected === theme.id}
      on:click={() => {
        select(theme.id)
      }}
    >
      <ThemeButton size={theme.id} focused={selected} />
      <span class="label overflow-label">
        <Label label={theme.label} />
      </span>
    </div>
  {/each}
</div>
