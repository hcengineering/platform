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
  import { afterUpdate } from 'svelte'
  import type { AnySvelteComponent } from '../../types'
  import { dpstore } from '../../popups'

  let component: AnySvelteComponent | undefined
  let anchor: HTMLElement

  let modalHTML: HTMLElement
  let frendlyFocus: HTMLElement[] | undefined
  let componentInstance: any

  $: frendlyFocus = $dpstore.frendlyFocus
  $: if ($dpstore.anchor) {
    anchor = $dpstore.anchor
    if (modalHTML) $dpstore.popup = modalHTML
  }
  $: component = $dpstore.component
  $: shift = $dpstore.shift
  $: mode = $dpstore.mode

  function _update (result: any): void {
    fitPopup()
  }

  function _change (result: any): void {
    if ($dpstore.onChange !== undefined) $dpstore.onChange(result)
  }

  function _close (result: any): void {
    if ($dpstore.onClose !== undefined) $dpstore.onClose(result)
  }

  function escapeClose () {
    if (componentInstance && componentInstance.canClose) {
      if (!componentInstance.canClose()) return
    }
    _close(null)
  }

  const fitPopup = (): void => {
    if (modalHTML && component) {
      if (componentInstance) {
        modalHTML.style.left = modalHTML.style.right = modalHTML.style.top = modalHTML.style.bottom = ''
        modalHTML.style.maxHeight = modalHTML.style.height = ''

        const rect = anchor.getBoundingClientRect()
        const rectPopup = modalHTML.getBoundingClientRect()
        let isMiddle = false
        // Vertical
        if (rect.bottom + rectPopup.height + 28 <= document.body.clientHeight) {
          modalHTML.style.top = `calc(${rect.bottom}px + 1px)`
        } else if (rectPopup.height + 28 < rect.top) {
          modalHTML.style.bottom = `calc(${document.body.clientHeight - rect.y}px + 1px)`
        } else {
          modalHTML.style.top = `calc(${rect.top}px - ${rectPopup.height / 2}px)`
          isMiddle = true
        }

        // Horizontal
        if (rect.left + rectPopup.width + 16 > document.body.clientWidth) {
          modalHTML.style.right = document.body.clientWidth - rect.right + 'px'
        } else if (rect.left - rectPopup.width < 0) {
          modalHTML.style.left = rect.left + rectPopup.width + 28 + 'px'
        } else if (rect.left - rectPopup.width < document.body.clientWidth && isMiddle) {
          modalHTML.style.left = rect.left - rectPopup.width + 'px'
        } else {
          modalHTML.style.left = rect.left + 'px'
        }
      }
    }
  }

  function handleKeydown (ev: KeyboardEvent) {
    if (ev.key === 'Escape' && component) {
      escapeClose()
    }
  }
  afterUpdate(() => fitPopup())
  $: component && fitPopup()

  const unfocus = (ev: FocusEvent): void => {
    const target = ev.relatedTarget as HTMLElement
    let kl: boolean = false
    frendlyFocus?.forEach((edit) => {
      if (edit === target) kl = true
    })
    if (target === modalHTML) kl = true
    if (!kl || target === null) _close(null)
  }
</script>

<svelte:window on:resize={fitPopup} on:keydown={handleKeydown} />
<div
  class="popup"
  class:visibility={component !== undefined}
  bind:this={modalHTML}
  tabindex="0"
  on:blur={(ev) => unfocus(ev)}
>
  {#if component}
    <svelte:component
      this={component}
      bind:mode
      bind:shift
      bind:this={componentInstance}
      on:update={(ev) => _update(ev.detail)}
      on:change={(ev) => _change(ev.detail)}
      on:close={(ev) => _close(ev.detail)}
    />
  {/if}
</div>

<style lang="scss">
  .popup {
    visibility: hidden;
    position: fixed;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-height: calc(100vh - 2rem);
    background-color: transparent;
    outline: none;
    z-index: 11000;
    &.visibility {
      visibility: visible;
    }
  }
</style>
