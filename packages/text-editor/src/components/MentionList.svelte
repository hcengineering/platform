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
  import { showPopup, resizeObserver, deviceOptionsStore as deviceInfo, PopupResult } from '@hcengineering/ui'
  import { onDestroy, onMount } from 'svelte'
  import DummyPopup from './DummyPopup.svelte'

  export let query: string = ''
  export let clientRect: () => ClientRect
  export let command: (props: any) => void
  export let close: () => void

  let popup: HTMLDivElement
  let dummyPopup: PopupResult

  onMount(() => {
    dummyPopup = showPopup(
      DummyPopup,
      {},
      undefined,
      () => close(),
      () => {},
      { overlay: false, category: '' }
    )
  })

  onDestroy(() => {
    dummyPopup.close()
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
    const wDoc = $deviceInfo.docWidth
    const hDoc = $deviceInfo.docHeight
    let tempStyle = ''
    if (rect.top < hDoc - rect.bottom) {
      // 20rem - 1.75rem
      const maxH: number = hDoc - rect.bottom - 40 >= 480 ? 480 : hDoc - rect.bottom - 40
      tempStyle = `top: calc(${rect.bottom}px + .75rem); max-height: ${maxH}px; `
    } else {
      const maxH: number = rect.top - 40 >= 480 ? 480 : rect.top - 40
      tempStyle = `bottom: calc(${hDoc - rect.top}px + .75rem); max-height: ${maxH}px; `
    }
    if (rect.left + wPopup > wDoc - 16) {
      // 30rem - 1.75rem
      tempStyle += 'right: 1rem;'
    } else {
      tempStyle += `left: ${rect.left}px;`
    }
    style = tempStyle
  }

  let style = 'visibility: hidden'
  $: if (popup) updateStyle()
  let wPopup: number = 0
</script>

<svelte:window on:resize={() => updateStyle()} />
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="overlay" on:click={() => close()} />
<div
  bind:this={popup}
  class="completion"
  {style}
  use:resizeObserver={(element) => {
    wPopup = element.clientWidth
    updateStyle()
  }}
>
  <ObjectSearchPopup bind:this={searchPopup} {query} on:close={(evt) => dispatchItem(evt.detail)} />
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
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    z-index: 10001;
  }
</style>
