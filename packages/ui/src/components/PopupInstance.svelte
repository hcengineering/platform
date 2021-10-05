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
import type { AnySvelteComponent, AnyComponent, PopupAlignment } from '../types'
import { closePopup } from '..'

export let is: AnyComponent | AnySvelteComponent
export let props: object
export let element: PopupAlignment | undefined
export let onClose: ((result: any) => void) | undefined
export let zIndex: number

let modalHTML: HTMLElement
let modalOHTML: HTMLElement
let maxHeight: number = 0

function close(result: any) {
  console.log('popup close result', result)
  if (onClose !== undefined) onClose(result)
  closePopup()
}

$: {
  if (modalHTML) {
    if (element) {
      maxHeight = 0
      if (typeof element !== 'string') {
        const rect = element.getBoundingClientRect()
        const rectPopup = modalHTML.getBoundingClientRect()
        if (rect.bottom + rectPopup.height + 28 < document.body.clientHeight) {
          modalHTML.style.top = `calc(${rect.bottom}px + .75rem)`
          maxHeight = document.body.clientHeight - rect.bottom - 28
        } else if (rect.top > document.body.clientHeight - rect.bottom) {
          modalHTML.style.bottom = `calc(${document.body.clientHeight - rect.y}px + .75rem)`
          maxHeight = rect.top - 28
        } else {
          modalHTML.style.top = `calc(${rect.bottom}px + .75rem)`
          maxHeight = document.body.clientHeight - rect.bottom - 28
        }
        if (rect.left + rectPopup.width + 16 > document.body.clientWidth) {
          modalHTML.style.left = ''
          modalHTML.style.right = document.body.clientWidth - rect.right + 'px'
        } else {
          modalHTML.style.left = rect.left + 'px'
          modalHTML.style.right = ''
        }
      } else if (element === 'right') {
        modalHTML.style.top = '0'
        modalHTML.style.bottom = '0'
        modalHTML.style.right = '0'
      } else if (element === 'float') {
        modalHTML.style.top = '4rem'
        modalHTML.style.bottom = '4rem'
        modalHTML.style.right = '4rem'
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
    }
  }
}
</script>

<div class="popup" bind:this={modalHTML} style={`z-index: ${zIndex + 1};`}>
  <svelte:component this={is} {...props} {maxHeight} on:close={ (ev) => close(ev.detail) } />
</div>
<div bind:this={modalOHTML} class="modal-overlay" style={`z-index: ${zIndex};`} on:click={() => close(undefined)} />

<style lang="scss">
  .popup {
    position: fixed;
    background-color: transparent;
  }
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    // background: rgba(0, 0, 0, 0.25);
  }
</style>
