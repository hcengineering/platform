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
import Component from './Component.svelte'
import type { AnySvelteComponent, AnyComponent, PopupAlignment } from '../types'
import { closePopup } from '..'

export let is: AnyComponent | AnySvelteComponent
export let props: object
export let element: PopupAlignment | undefined
export let onClose: (result: any) => void | undefined
export let zIndex: number

let modalHTML: HTMLElement
let modalOHTML: HTMLElement

function close(result: any) {
  console.log('popup close result', result)
  if (onClose !== undefined) onClose(result)
  closePopup()
}

$: {
  if (modalHTML) {
    if (element) {
      if (typeof element !== 'string') {
        const rect = element.getBoundingClientRect()
        if (rect.top > document.body.clientHeight - rect.bottom) {
          modalHTML.style.bottom = `calc(${document.body.clientHeight - rect.top}px + .75rem)`
        } else {
          modalHTML.style.top = `calc(${rect.bottom}px + .75rem)`
        }
        if (rect.left > document.body.clientWidth - rect.right) {
          modalHTML.style.right = document.body.clientWidth - rect.right + 'px'
        } else {
          modalHTML.style.left = rect.left + 'px'
        }
      } else if (element === 'right') {
        modalHTML.style.top = '4rem'
        modalHTML.style.bottom = '4rem'
        modalHTML.style.right = '4rem'
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
  {#if typeof(is) === 'string'}
    <Component is={is} props={props} on:close={ (ev) => close(ev.detail) }/>
  {:else}
    <svelte:component this={is} {...props} on:close={ (ev) => close(ev.detail) } />
  {/if}
</div>
<div bind:this={modalOHTML} class="modal-overlay" style={`z-index: ${zIndex};`} on:click={() => close(undefined)} />

<style lang="scss">
  .popup {
    position: fixed;
    background-color: transparent;
    filter: drop-shadow(0 1.5rem 4rem rgba(0, 0, 0, .6));
  }
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.25);
  }
</style>
