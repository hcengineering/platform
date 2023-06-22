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
  import { deviceOptionsStore as deviceInfo, resizeObserver } from '..'
  import { fitPopupElement } from '../popups'
  import type { AnySvelteComponent, PopupAlignment, PopupOptions, PopupPositionElement, DeviceOptions } from '../types'

  export let is: AnySvelteComponent
  export let props: object
  export let element: PopupAlignment | undefined
  export let onClose: ((result: any) => void) | undefined
  export let onUpdate: ((result: any) => void) | undefined
  export let overlay: boolean
  export let zIndex: number
  export let top: boolean
  export let close: () => void
  export let contentPanel: HTMLElement | undefined

  let modalHTML: HTMLElement
  let componentInstance: any
  let docSize: boolean = false
  let fullSize: boolean = false

  let clientWidth = -1
  let clientHeight = -1

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
  }

  function _close (result: any): void {
    if (onClose !== undefined) onClose(result)
    overlay = false
    close()
  }

  function escapeClose () {
    if (componentInstance && componentInstance.canClose) {
      if (!componentInstance.canClose()) return
    }
    _close(undefined)
  }

  const fitPopup = (
    modalHTML: HTMLElement,
    element: PopupAlignment | undefined,
    contentPanel: HTMLElement | undefined
  ): void => {
    const device: DeviceOptions = $deviceInfo
    if ((fullSize || docSize) && (element === 'float' || element === 'centered')) {
      options = fitPopupElement(modalHTML, device, 'full', contentPanel, clientWidth, clientHeight)
      options.props.maxHeight = '100vh'
      if (!modalHTML.classList.contains('fullsize')) modalHTML.classList.add('fullsize')
    } else {
      options = fitPopupElement(modalHTML, device, element, contentPanel, clientWidth, clientHeight)
      if (modalHTML.classList.contains('fullsize')) modalHTML.classList.remove('fullsize')
    }
    options.fullSize = fullSize
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

  const alignment: PopupPositionElement = element as PopupPositionElement
  let showing: boolean | undefined = alignment?.kind === 'submenu' ? undefined : false

  let oldModalHTML: HTMLElement | undefined = undefined

  $: if (modalHTML !== undefined && oldModalHTML !== modalHTML) {
    clientWidth = -1
    clientHeight = -1
    oldModalHTML = modalHTML
    fitPopup(modalHTML, element, contentPanel)
    showing = true
    modalHTML.addEventListener(
      'transitionend',
      () => {
        showing = undefined
      },
      { once: true }
    )
  }

  export function fitPopupInstance (): void {
    if (modalHTML) fitPopup(modalHTML, element, contentPanel)
  }

  $: if ($deviceInfo.docWidth <= 900 && !docSize) docSize = true
  $: if ($deviceInfo.docWidth > 900 && docSize) docSize = false
</script>

<svelte:window
  on:resize={() => {
    if (modalHTML) {
      fitPopup(modalHTML, element, contentPanel)
    }
  }}
  on:keydown={handleKeydown}
/>

<div
  class="popup {showing === undefined ? 'endShow' : showing === false ? 'preShow' : 'startShow'}"
  class:anim={element === 'float' || element === 'centered'}
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
  use:resizeObserver={(element) => {
    clientWidth = element.clientWidth
    clientHeight = element.clientHeight
    fitPopupInstance()
  }}
>
  <svelte:component
    this={is}
    bind:this={componentInstance}
    {...props}
    bind:popupOptions={options}
    on:update={(ev) => {
      _update(ev.detail)
    }}
    on:close={(ev) => _close(ev?.detail)}
    on:fullsize={() => {
      fullSize = !fullSize
      fitPopup(modalHTML, element, contentPanel)
    }}
    on:changeContent={() => {
      fitPopup(modalHTML, element, contentPanel)
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
    min-width: 0;
    min-height: 0;
    max-height: calc(100vh - 32px);
    background-color: transparent;
    transform-origin: center;
    opacity: 0;

    &.preShow {
      transform: scale(0.9);
    }
    &.endShow {
      opacity: 1;
    }
    &.startShow {
      transform: scale(1);
      opacity: 1;
      transition-property: transform, opacity;
      transition-timing-function: cubic-bezier(0, 1.59, 0.26, 1.01), ease-in-out;
      transition-duration: 0.3s;
    }

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
