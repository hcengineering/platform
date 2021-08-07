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

import { Editor } from '@tiptap/core'
import { onMount } from 'svelte'
import type { FindResult, Doc, Ref } from '@anticrm/core'
import type { Person } from '@anticrm/contact'
import contact from '@anticrm/contact'
import { getClient, UserInfo } from '@anticrm/presentation'
import { EditStylish, IconSearch } from '@anticrm/ui'

export let items: Person[]
export let editor: Editor
export let query: string
export let clientRect: () => ClientRect
export let command: (props: any) => void

let popup: HTMLDivElement
let selected = 0

export function onKeyDown(ev: KeyboardEvent) {
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
      command({id: person._id, label: person.firstName + ' ' + person.lastName})
      return true
    } else
      return false
  }
  return false
}

export function done() {
  console.log('done')
}

let persons: Person[] = []

let style = 'visibility: hidden'
$: {
  if (popup) {
    const x = clientRect().left
    let height = popup.getBoundingClientRect().height
    let y = clientRect().top - height - 16
    style = `left: ${x}px; top: ${y}px;`
  }
}


//$: items(query).then(result => persons = result)

</script>

<div>
  <div bind:this={popup} class='completion' {style}>
    <!-- <EditStylish icon={IconSearch} placeholder={'Type to search...'} value={query}/> -->
    <div class="caption">SUGGESTED</div>
    <div class="scroll">
      {#each items as item, i}
        <div class:selected={i === selected}>
          <UserInfo size={36} value={item} />
        </div>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">

.selected {
  background-color: red;
}

.completion {
  position: absolute;
  z-index: 1010;
  padding: 16px;
  background-color: var(--theme-button-bg-hovered);
  border: 1px solid var(--theme-bg-accent-hover);
  border-radius: 12px;
  box-shadow: 0 20px 20px 0 rgba(0, 0, 0, .1);

  .caption {
    margin: 8px 0;
    font-weight: 600;
    font-size: 12px;
    letter-spacing: .5px;
    color: var(--theme-content-trans-color);
  }
  .scroll {
    display: grid;
    grid-auto-flow: row;
    gap: 12px;
    height: calc(100% - 71px);
    overflow-y: auto;
  }
}

</style>