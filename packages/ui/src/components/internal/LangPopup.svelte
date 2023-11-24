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
  import { createEventDispatcher } from 'svelte'
  import Label from '../Label.svelte'
  import IconCheck from '../icons/Check.svelte'

  export let langs: any
  export let selected: string

  const dispatch = createEventDispatcher()
</script>

<div class="antiPopup" style:min-width={'200px'}>
  <div class="ap-space x2" />
  {#each langs as lang}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="ap-menuItem hoverable flex-row-center leading-16px"
      on:click={() => {
        dispatch('close', lang.id)
      }}
    >
      <div class="svg-16px flex-no-shrink text-16px mr-2">{@html lang.logo}</div>
      <span class="overflow-label flex-grow"><Label label={lang.label} /></span>
      <div class="ap-check">
        {#if lang.id === selected}
          <IconCheck size={'small'} fill={'var(--primary-button-default)'} />
        {/if}
      </div>
    </div>
  {/each}
  <div class="ap-space x2" />
</div>
