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
  import { formatName, Person } from '@anticrm/contact'
  import { UserInfo } from '@anticrm/presentation'
import { createEventDispatcher } from 'svelte';

  export let items: Person[]
  export let query: string
  export let clientRect: () => ClientRect
  export let command: (props: any) => void
  export let close: () => void

  let popup: HTMLDivElement
  let selected = 0

  export function onKeyDown (ev: KeyboardEvent) {
    if (ev.key === 'ArrowDown') {
      if (selected < items.length - 1) selected++
      return true
    }
    if (ev.key === 'ArrowUp') {
      if (selected > 0) selected--
      return true
    }
    if (ev.key === 'Enter') {
      const person = items[selected]
      if (person) {
        command({ id: person._id, label: formatName(person.name), objectclass: person._class })
        return true
      } else {
        return false
      }
    }
    // TODO: How to prevent Esc, it should hide popup instead of closing editor.
    // if (ev.key === 'Esc') {
    //   return true
    // }
    return false
  }

  export function done () {
    console.log('done')
  }

  let style = 'visibility: hidden'
  $: {
    if (popup) {
      const x = clientRect().left
      const height = popup.getBoundingClientRect().height
      const y = clientRect().top - height - 16
      style = `left: ${x}px; top: ${y}px;`
    }
  }
</script>

<div
  class="overlay"
  on:click={() => {
    close()
  }}
/>
<div>
  <div bind:this={popup} class="completion" {style}>
    <div class="caption">Contacts</div>
    <div class="scroll">
      {#each items as item, i}
        <div
          class="item"
          class:selected={i === selected}
          on:click={() => {
            command({ id: item._id, label: formatName(item.name), objectclass: item._class })
          }}
          on:focus={() => {
            selected = i
          }}
          on:mouseover={() => {
            selected = i
          }}
        >
          <UserInfo size={'medium'} value={item} />
        </div>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    z-index: 2000;
  }

  .selected {
    background-color: var(--theme-button-bg-focused);
  }

  .completion {
    position: absolute;
    z-index: 2010;
    padding: 16px;
    background-color: var(--theme-button-bg-hovered);
    border: 1px solid var(--theme-bg-accent-hover);
    border-radius: 0.75rem;
    box-shadow: 0 20px 20px 0 rgba(0, 0, 0, 0.1);

    .caption {
      margin: 8px 0;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.5px;
      color: var(--theme-content-trans-color);
    }
    .scroll {
      max-height: 200px;
      display: grid;
      grid-auto-flow: row;
      gap: 12px;
      height: calc(100% - 71px);
      overflow-y: auto;
    }
  }
</style>
