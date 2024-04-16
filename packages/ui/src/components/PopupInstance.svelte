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
  import { deviceOptionsStore as deviceInfo, resizeObserver, testing } from '..'
  import { CompAndProps, fitPopupElement } from '../popups'
  import type { AnySvelteComponent, DeviceOptions, PopupAlignment, PopupOptions, PopupPositionElement } from '../types'

  export let is: AnySvelteComponent
  export let props: Record<string, any>
  export let element: PopupAlignment | undefined
  export let onClose: ((result: any) => void) | undefined
  export let onUpdate: ((result: any) => void) | undefined
  export let overlay: boolean
  export let zIndex: number
  export let top: boolean
  export let close: () => void
  export let contentPanel: HTMLElement | undefined
  export let popup: CompAndProps

  // We should not update props after popup is created using standard mechanism,
  // since they could be used, and any show will update them
  // So special update callback should be used.
  let initialProps: Record<string, any> = props

  $: popup.update = (props) => {
    initialProps = Object.assign(initialProps, props)
  }
  const WINDOW_PADDING = 1

  interface PopupParams {
    x: number
    y: number
    width: number
    height: number
  }

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

  $: document.body.style.cursor = drag ? 'all-scroll' : 'default'

  function _update (result: any): void {
    if (onUpdate !== undefined) onUpdate(result)
  }

  function _close (result: any): void {
    if (onClose !== undefined) onClose(result)
    overlay = false
    close()
  }

  function escapeClose (): void {
    if (componentInstance?.canClose) {
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
      if (element !== 'movable' || options?.props?.top === undefined || options?.props?.top === '') {
        options = fitPopupElement(modalHTML, device, element, contentPanel, clientWidth, clientHeight)
      }
      if (modalHTML.classList.contains('fullsize')) modalHTML.classList.remove('fullsize')
    }
    options.fullSize = fullSize
  }

  function handleKeydown (ev: KeyboardEvent) {
    if (ev.key === 'Escape' && is && top) {
      ev.preventDefault()
      ev.stopPropagation()
      escapeClose()
    }
  }

  const handleOutsideClick = (): void => {
    if (componentInstance?.onOutsideClick) {
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
    clientWidth = modalHTML.clientWidth
    clientHeight = modalHTML.clientHeight
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

  let drag: boolean = false
  let notFit: number = 0
  let locked: boolean = false

  const windowSize: { width: number, height: number } = { width: 0, height: 0 }
  const dragParams: { offsetX: number, offsetY: number } = { offsetX: 0, offsetY: 0 }
  let popupParams: PopupParams = { x: 0, y: 0, width: 0, height: 0 }

  const updatedPopupParams = (pp: { x: number, y: number, width: number, height: number }): void => {
    if (pp.width === 0 || pp.height === 0 || element !== 'movable') return
    options.props.left = `${pp.x}px`
    options.props.right = ''
    options.props.top = `${pp.y}px`
    options.props.maxHeight = `${pp.height}px`
  }
  $: updatedPopupParams(popupParams)

  function mouseDown (e: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
    if (element !== 'movable') return
    const rect = e.currentTarget.getBoundingClientRect()
    popupParams = { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
    dragParams.offsetX = e.clientX - rect.left
    dragParams.offsetY = e.clientY - rect.top
    drag = true
    window.addEventListener('mousemove', mouseMove)
    window.addEventListener('mouseup', mouseUp)
  }

  function mouseMove (e: MouseEvent): void {
    if (element !== 'movable' && !drag) return
    let newTop = e.clientY - dragParams.offsetY
    let newLeft = e.clientX - dragParams.offsetX
    if (newTop < WINDOW_PADDING) newTop = WINDOW_PADDING
    if (newTop + popupParams.height > $deviceInfo.docHeight - WINDOW_PADDING) {
      newTop = $deviceInfo.docHeight - popupParams.height - WINDOW_PADDING
    }
    if (newLeft < WINDOW_PADDING) newLeft = WINDOW_PADDING
    if (newLeft + popupParams.width > $deviceInfo.docWidth - WINDOW_PADDING) {
      newLeft = $deviceInfo.docWidth - popupParams.width - WINDOW_PADDING
    }
    popupParams = { ...popupParams, x: newLeft, y: newTop }
  }

  function mouseUp (): void {
    drag = false
    window.removeEventListener('mousemove', mouseMove)
    window.removeEventListener('mouseup', mouseUp)
  }

  function checkSize (): void {
    const rect = modalHTML.getBoundingClientRect()
    const newParams: PopupParams = { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
    if (popupParams.width === 0 && popupParams.height === 0) popupParams = newParams
    newParams.x =
      popupParams.x < WINDOW_PADDING
        ? WINDOW_PADDING
        : popupParams.x + popupParams.width > windowSize.width - WINDOW_PADDING * 2
          ? $deviceInfo.docWidth - WINDOW_PADDING - popupParams.width
          : popupParams.x
    newParams.y =
      popupParams.y < WINDOW_PADDING
        ? WINDOW_PADDING
        : popupParams.y + popupParams.height > $deviceInfo.docHeight - WINDOW_PADDING
          ? $deviceInfo.docHeight - WINDOW_PADDING - popupParams.height
          : popupParams.y
    if (newParams.y < WINDOW_PADDING) {
      newParams.height -= WINDOW_PADDING - newParams.y
      newParams.y = WINDOW_PADDING
    }
    if (newParams.height > windowSize.height - WINDOW_PADDING * 2) {
      newParams.height = windowSize.height - WINDOW_PADDING * 2
      newParams.y = WINDOW_PADDING
    }
    const bottomFree: number = $deviceInfo.docHeight - WINDOW_PADDING - popupParams.y - popupParams.height
    const topFree: number = popupParams.y - WINDOW_PADDING
    if (notFit && bottomFree > 0) {
      const dFit: number = bottomFree - notFit
      newParams.height += dFit >= 0 ? notFit : bottomFree
      notFit -= dFit >= 0 ? notFit : bottomFree
    }
    if (notFit && topFree > 0) {
      const dFit: number = topFree - notFit
      newParams.y -= dFit < 0 ? topFree : notFit
      newParams.height += dFit < 0 ? topFree : notFit
      notFit -= dFit < 0 ? topFree : notFit
    }
    popupParams = newParams
    locked = false
  }

  export function fitPopupInstance (): void {
    if (modalHTML) {
      fitPopup(modalHTML, element, contentPanel)
    }
  }

  $: if ($deviceInfo.docWidth <= 900 && !docSize) docSize = true
  $: if ($deviceInfo.docWidth > 900 && docSize) docSize = false

  onMount(() => {
    windowSize.width = $deviceInfo.docWidth
    windowSize.height = $deviceInfo.docHeight
  })
</script>

<svelte:window
  on:resize={() => {
    if (modalHTML) fitPopup(modalHTML, element, contentPanel)
    if (element === 'movable' && !locked) {
      locked = true
      if (options.props.right !== '') {
        const rect = modalHTML.getBoundingClientRect()
        popupParams = { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
      }
      checkSize()
      windowSize.width = $deviceInfo.docWidth
      windowSize.height = $deviceInfo.docHeight
    }
  }}
  on:keydown={handleKeydown}
/>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  id={popup.options.refId}
  class="popup {testing ? 'endShow' : showing === undefined ? 'endShow' : !showing ? 'preShow' : 'startShow'}"
  class:testing
  class:anim={(element === 'float' || element === 'centered') && !testing && !drag}
  bind:this={modalHTML}
  style={`z-index: ${zIndex + 1};`}
  style:top={options?.props?.top}
  style:bottom={options?.props?.bottom}
  style:left={options?.props?.left}
  style:right={options?.props?.right}
  style:width={options?.props?.width}
  style:height={options?.props?.height}
  style:max-width={options?.props?.maxWidth}
  style:max-height={options?.props?.maxHeight}
  style:min-width={options?.props?.minWidth}
  style:min-height={options?.props?.minHeight}
  style:transform={options?.props?.transform}
  use:resizeObserver={(element) => {
    clientWidth = element.clientWidth
    clientHeight = element.clientHeight
    fitPopupInstance()
  }}
  on:mousedown={mouseDown}
>
  <svelte:component
    this={is}
    bind:this={componentInstance}
    {...initialProps}
    bind:popupOptions={options}
    on:update={(ev) => {
      _update(ev.detail)
    }}
    on:close={(ev) => {
      _close(ev?.detail)
    }}
    on:fullsize={() => {
      fullSize = !fullSize
      fitPopup(modalHTML, element, contentPanel)
    }}
    on:changeContent={(ev) => {
      fitPopup(modalHTML, element, contentPanel)
      if (ev.detail?.notFit !== undefined) notFit = ev.detail.notFit
      if (element === 'movable' && showing !== false) checkSize()
    }}
  />
</div>

{#if overlay || drag}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="modal-overlay"
    class:testing
    class:antiOverlay={options?.showOverlay && !drag}
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
    &.testing {
      transition: background-color 0 ease;
    }
  }
</style>
