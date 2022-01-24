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
  import type { AnySvelteComponent, AnyComponent, PopupAlignment } from '../types'

  export let is: AnyComponent | AnySvelteComponent
  export let props: object
  export let element: PopupAlignment | undefined
  export let onClose: ((result: any) => void) | undefined
  export let zIndex: number
  export let top: boolean
  export let close: () => void

  let modalHTML: HTMLElement
  let componentInstance: any
  let show: boolean = false

  function _close (result: any) {
    if (onClose !== undefined) onClose(result)
    close()
  }

  function escapeClose () {
    if (componentInstance && componentInstance.canClose) {
      if (!componentInstance.canClose()) return
    }
    _close(undefined)
  }

  const fitPopup = (): void => {
    if (modalHTML) {
      if (element) {
        show = false
        modalHTML.style.left = modalHTML.style.right = modalHTML.style.top = modalHTML.style.bottom = ''
        modalHTML.style.maxHeight = modalHTML.style.height = ''
        if (typeof element !== 'string') {
          const el = element as HTMLElement
          const rect = el.getBoundingClientRect()
          const rectPopup = modalHTML.getBoundingClientRect()
          // Vertical
          if (rect.bottom + rectPopup.height + 28 <= document.body.clientHeight) {
            modalHTML.style.top = `calc(${rect.bottom}px + .75rem)`
          } else if (rectPopup.height + 28 < rect.top) {
            modalHTML.style.bottom = `calc(${document.body.clientHeight - rect.y}px + .75rem)`
          } else {
            modalHTML.style.top = modalHTML.style.bottom = '1rem'
          }

          // Horizontal
          if (rect.left + rectPopup.width + 16 > document.body.clientWidth) {
            modalHTML.style.right = document.body.clientWidth - rect.right + 'px'
          } else {
            modalHTML.style.left = rect.left + 'px'
          }
        } else if (element === 'right') {
          modalHTML.style.top = '0'
          modalHTML.style.bottom = '0'
          modalHTML.style.right = '0'
        } else if (element === 'float') {
          modalHTML.style.top = '4rem'
          modalHTML.style.bottom = '4rem'
          modalHTML.style.right = '4rem'
        } else if (element === 'account') {
          modalHTML.style.bottom = '2.75rem'
          modalHTML.style.left = '5rem'
        } else if (element === 'full') {
          modalHTML.style.top = '0'
          modalHTML.style.bottom = '0'
          modalHTML.style.left = '0'
          modalHTML.style.right = '0'
        }
      } else {
        modalHTML.style.top = '50%'
        modalHTML.style.left = '50%'
        modalHTML.style.transform = 'translate(-50%, -50%)'
        show = true
      }
    }
  }

  function handleKeydown (ev: KeyboardEvent) {
    if (ev.key === 'Escape' && is && top) {
      escapeClose()
    }
  }
  afterUpdate(() => fitPopup())
</script>

<svelte:window on:resize={fitPopup} on:keydown={handleKeydown} />

<div class="popup" bind:this={modalHTML} style={`z-index: ${zIndex + 1};`}>
  <svelte:component bind:this={componentInstance} this={is} {...props} on:update={fitPopup} on:close={ (ev) => _close(ev.detail) } />
</div>
<div class="modal-overlay" class:show style={`z-index: ${zIndex};`} on:click={() => escapeClose()} />

<style lang="scss">
  .popup {
    position: fixed;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-height: calc(100vh - 2rem);
    background-color: transparent;
  }
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    &.show { background: rgba(0, 0, 0, .5); }
  }
</style>
