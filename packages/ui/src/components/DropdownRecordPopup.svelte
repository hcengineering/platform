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
  import { IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import { resizeObserver } from '..'
  import CheckBox from './CheckBox.svelte'
  import Label from './Label.svelte'
  import ListView from './ListView.svelte'

  export let items: Record<any, IntlString>
  export let selected: any | undefined = undefined

  const dispatch = createEventDispatcher()

  let selection = 0
  let list: ListView
  $: objects = Object.entries(items)

  async function handleSelection (evt: Event | undefined, selection: number): Promise<void> {
    const item = items[selection]

    dispatch('close', item)
  }

  function onKeydown (key: KeyboardEvent): void {
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection - 1)
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection + 1)
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      handleSelection(key, selection)
    }
  }
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')} on:keydown={onKeydown}>
  <div class="menu-space" />
  <div class="scroll">
    <div class="box">
      <ListView bind:this={list} count={objects.length} bind:selection>
        <svelte:fragment slot="item" let:item={idx}>
          {@const item = objects[idx]}

          <button
            class="menu-item flex-between w-full"
            on:click={() => {
              dispatch('close', item[0])
            }}
          >
            <div class="flex-grow caption-color lines-limit-2"><Label label={item[1]} /></div>
            {#if item[0] === selected}
              <div class="check"><CheckBox checked kind={'accented'} /></div>
            {/if}
          </button>
        </svelte:fragment>
      </ListView>
    </div>
  </div>
  <div class="menu-space" />
</div>
