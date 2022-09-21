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
  import { ObjectSearchPopup, ObjectSearchResult } from '@hcengineering/presentation'
  import { showPopup } from '@hcengineering/ui'
  import { onDestroy, onMount } from 'svelte'
  import DummyPopup from './DummyPopup.svelte'

  export let query: string = ''
  export let clientRect: () => ClientRect
  export let command: (props: any) => void
  export let close: () => void

  let popup: HTMLDivElement
  let popupClose: () => void

  onMount(() => {
    popupClose = showPopup(DummyPopup, {}, undefined, () => {
      close()
    })
  })

  onDestroy(() => {
    popupClose()
  })

  function dispatchItem (item: ObjectSearchResult): void {
    if (item == null) {
      close()
    } else {
      command({ id: item.doc._id, label: item.title, objectclass: item.doc._class })
    }
  }

  let searchPopup: ObjectSearchPopup

  export function onKeyDown (ev: KeyboardEvent): boolean {
    return searchPopup?.onKeyDown(ev)
  }

  export function done () {}

  function updateStyle (): void {
    const rect = clientRect()
    const docW = document.body.clientWidth
    let tempStyle = ''
    if (rect.top < 292) {
      // 20rem - 1.75rem
      tempStyle = `top: calc(${rect.bottom}px + .75rem); max-heigth: calc(115vh - ${rect.bottom}px - 1.75rem); `
    } else {
      tempStyle = `bottom: calc(115vh - ${rect.top}px + .75rem); max-heigth: calc(${rect.top}px - 1.75rem); `
    }
    if (docW - rect.left > 452) {
      // 30rem - 1.75rem
      tempStyle += `left: ${rect.left}px;`
    } else {
      tempStyle += `right: calc(115vh - ${rect.right}px);`
    }
    style = tempStyle
  }

  let style = 'visibility: hidden'
  $: if (popup) updateStyle()
</script>

<svelte:window on:resize={() => updateStyle()} />
<div
  class="overlay"
  on:click={() => {
    close()
  }}
/>
<div bind:this={popup} class="antiPopup antiPopup-withHeader antiPopup-withCategory completion" {style}>
  <div class="completion">
    <ObjectSearchPopup bind:this={searchPopup} {query} on:close={(evt) => dispatchItem(evt.detail)} />
  </div>
</div>

<style lang="scss">
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    z-index: 1999;
  }

  .completion {
    position: absolute;
    min-width: 20rem;
    max-width: 30rem;
    min-height: 0;
    height: 20rem;
    z-index: 2000;
  }
</style>
