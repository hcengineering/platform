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
  import { fitPopupElement } from '../popups'
  import type { AnyComponent, AnySvelteComponent, PopupAlignment } from '../types'

  export let is: AnyComponent | AnySvelteComponent
  export let props: object
  export let element: PopupAlignment | undefined
  export let onClose: ((result: any) => void) | undefined
  export let onUpdate: ((result: any) => void) | undefined
  export let zIndex: number
  export let top: boolean
  export let close: () => void

  let modalHTML: HTMLElement
  let componentInstance: any
  let show: boolean = false
  let height: number

  function _update (result: any): void {
    if (onUpdate !== undefined) onUpdate(result)
    fitPopup()
  }

  function _close (result: any): void {
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
      show = fitPopupElement(modalHTML, element)
    }
  }

  function handleKeydown (ev: KeyboardEvent) {
    if (ev.key === 'Escape' && is && top) {
      escapeClose()
    }
  }
  afterUpdate(() => fitPopup())
  $: if (height) fitPopup()
</script>

<svelte:window on:resize={fitPopup} on:keydown={handleKeydown} />

<div class="popup" bind:this={modalHTML} bind:clientHeight={height} style={`z-index: ${zIndex + 1};`}>
  <svelte:component bind:this={componentInstance} this={is} {...props} on:update={(ev) => _update(ev.detail)} on:close={(ev) => _close(ev.detail)} />
</div>
<div class="modal-overlay" class:antiOverlay={show} style={`z-index: ${zIndex};`} on:click={() => escapeClose()} />

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
    height: 100vh;
    transition: background-color .5s ease;
  }
</style>
