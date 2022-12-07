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
  import { onMount } from 'svelte'
  import { fitPopupElement } from '../popups'
  import type { AnyComponent, AnySvelteComponent, PopupAlignment, PopupOptions } from '../types'
  import { deviceOptionsStore as deviceInfo } from '..'

  export let is: AnyComponent | AnySvelteComponent
  export let props: object
  export let element: PopupAlignment | undefined
  export let onClose: ((result: any) => void) | undefined
  export let onUpdate: ((result: any) => void) | undefined
  export let overlay: boolean
  export let zIndex: number
  export let top: boolean
  export let close: () => void

  let modalHTML: HTMLElement
  let componentInstance: any
  let docSize: boolean = false
  let fullSize: boolean = false

  let options: PopupOptions = {
    props: {
      top: '',
      bottom: '',
      left: '',
      right: '',
      width: '',
      height: '',
      maxWidth: '',
      maxHeight: '',
      minWidth: '',
      minHeight: '',
      transform: ''
    },
    showOverlay: false,
    direction: 'bottom'
  }

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
      if ((fullSize || docSize) && element === 'float') {
        options = fitPopupElement(modalHTML, 'full')
        options.props.maxHeight = '100vh'
        if (!modalHTML.classList.contains('fullsize')) modalHTML.classList.add('fullsize')
      } else {
        options = fitPopupElement(modalHTML, element)
        if (modalHTML.classList.contains('fullsize')) modalHTML.classList.remove('fullsize')
      }
      options.fullSize = fullSize
    }
  }

  function handleKeydown (ev: KeyboardEvent) {
    if (ev.key === 'Escape' && is && top) {
      escapeClose()
    }
  }

  const handleOutsideClick = (): void => {
    if (componentInstance && componentInstance.onOutsideClick) {
      componentInstance.onOutsideClick()
    }
  }

  const handleOverlayClick = (): void => {
    handleOutsideClick()
    escapeClose()
  }

  onMount(() => fitPopup())
  $: if ($deviceInfo.docWidth <= 900 && !docSize) docSize = true
  $: if ($deviceInfo.docWidth > 900 && docSize) docSize = false
</script>

<svelte:window on:resize={fitPopup} on:keydown={handleKeydown} />

<div
  class="popup"
  class:anim={element === 'float'}
  bind:this={modalHTML}
  style={`z-index: ${zIndex + 1};`}
  style:top={options.props.top}
  style:bottom={options.props.bottom}
  style:left={options.props.left}
  style:right={options.props.right}
  style:width={options.props.width}
  style:height={options.props.height}
  style:max-width={options.props.maxWidth}
  style:max-height={options.props.maxHeight}
  style:min-width={options.props.minWidth}
  style:min-height={options.props.minHeight}
  style:transform={options.props.transform}
>
  <svelte:component
    this={is}
    bind:this={componentInstance}
    {...props}
    bind:options
    on:update={(ev) => {
      _update(ev.detail)
    }}
    on:close={(ev) => _close(ev?.detail)}
    on:fullsize={() => {
      fullSize = !fullSize
      fitPopup()
    }}
    on:changeContent={() => {
      fitPopup()
    }}
  />
</div>

{#if overlay}
  <div
    class="modal-overlay"
    class:antiOverlay={options.showOverlay}
    style={`z-index: ${zIndex};`}
    on:click={handleOverlayClick}
    on:keydown|stopPropagation|preventDefault={() => {}}
  />
{/if}

<style lang="scss">
  .popup {
    position: fixed;
    display: flex;
    flex-direction: column;
    // justify-content: center;
    max-height: calc(100vh - 32px);
    background-color: transparent;

    &.anim {
      transition-property: top, bottom, left, right, width, height;
      transition-duration: 0.15s;
      transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    }
  }
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    transition: background-color 0.5s ease;
    touch-action: none;
  }
</style>
