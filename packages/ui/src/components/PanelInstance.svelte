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
  import { getResourceC } from '@hcengineering/platform'
  import { afterUpdate, onMount } from 'svelte'

  import { deviceOptionsStore as deviceInfo, resizeObserver } from '..'
  import { closePanel, PanelProps, panelstore } from '../panelup'
  import { fitPopupElement, popupstore } from '../popups'
  import type { AnySvelteComponent, DeviceOptions, PopupOptions } from '../types'
  import Spinner from './Spinner.svelte'

  export let contentPanel: HTMLElement | undefined
  export let embedded: boolean = false
  export let readonly: boolean = false

  let modalHTML: HTMLElement
  let oldPanel: HTMLElement | undefined
  let componentInstance: any

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
      minWidth: ''
    },
    showOverlay: false,
    direction: 'bottom'
  }

  let component: AnySvelteComponent | undefined
  let keepSize: boolean = false

  let props: PanelProps | undefined
  function _close (): void {
    closePanel()
  }

  $: if ($panelstore.panel !== undefined) {
    if ($panelstore.panel.component === undefined) {
      props = $panelstore.panel
    } else {
      getResourceC($panelstore.panel.component, (r) => {
        component = r
        props = $panelstore.panel
      })
    }
    $panelstore.panel.refit = fitPopupInstance
  } else {
    props = undefined
  }

  function escapeClose (): void {
    // Check if there is popup visible, then ignore
    if ($popupstore.length > 0) {
      return
    }

    if (componentInstance?.canClose !== undefined) {
      if (!(componentInstance as { canClose: () => boolean }).canClose()) {
        return
      }
    }
    _close()
  }

  const fitPopup = (props: PanelProps, contentPanel: HTMLElement): void => {
    if (modalHTML != null) {
      const device: DeviceOptions = $deviceInfo
      options =
        device.isMobile && device.docWidth <= 480
          ? {
              props: {
                top: 'var(--status-bar-height)',
                bottom: '4.25rem',
                left: '0',
                right: '0',
                width: '100%',
                height: 'calc(100dvh - var(--status-bar-height) - 4.25rem)',
                maxWidth: '100%',
                maxHeight: '100%',
                minWidth: '0'
              },
              showOverlay: true,
              direction: 'bottom'
            }
          : fitPopupElement(modalHTML, device, props.element, contentPanel)
    }
  }

  function handleKeydown (ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      escapeClose()
    }
  }

  function _open (): void {
    if (modalHTML != null && props != null) {
      if (props.element === 'content') {
        modalHTML.classList.add('bg')
      } else {
        modalHTML.classList.remove('bg')
      }
    }
  }

  const _update = (): void => {
    if (props != null && contentPanel != null) {
      fitPopup(props, contentPanel)
    }
  }

  const checkResize = (): void => {
    if (props != null && contentPanel != null) fitPopup(props, contentPanel)
  }

  onMount(() => {
    if (props != null && contentPanel != null) fitPopup(props, contentPanel)
  })

  afterUpdate(() => {
    if (props != null && contentPanel != null) fitPopup(props, contentPanel)
  })

  $: if (contentPanel !== oldPanel) {
    oldPanel = contentPanel
    keepSize = false
  }
  $: if (props != null && contentPanel !== undefined) {
    fitPopup(props, contentPanel)
    if (!keepSize && props?.element === 'content') {
      keepSize = true
      resizeObserver(contentPanel, checkResize)
      if (!contentPanel.hasAttribute('data-id')) contentPanel.setAttribute('data-id', 'contentPanel')
    }
  }

  export function fitPopupInstance (): void {
    if (props != null && contentPanel != null) fitPopup(props, contentPanel)
  }
</script>

<svelte:window
  on:resize={() => {
    if (props != null && contentPanel != null) fitPopup(props, contentPanel)
  }}
  on:keydown={(evt) => {
    if (props != null) handleKeydown(evt)
  }}
  on:beforeprint={() => {
    if (props != null && contentPanel != null) fitPopup(props, contentPanel)
  }}
  on:afterprint={() => {
    if (props != null && contentPanel != null) fitPopup(props, contentPanel)
  }}
/>
{#if props}
  {#if !(component != null)}
    <Spinner />
  {:else}
    <slot name="panel-header" />
    <div
      class="panel-instance"
      bind:this={modalHTML}
      style:top={options?.props?.top}
      style:bottom={options?.props?.bottom}
      style:left={options?.props?.left}
      style:right={options?.props?.right}
      style:width={options?.props?.width}
      style:height={options?.props?.height}
      style:max-width={options?.props?.maxWidth}
      style:max-height={options?.props?.maxHeight}
      style:min-width={options?.props?.minWidth}
      style:transform={options?.props?.transform}
    >
      <svelte:component
        this={component}
        bind:this={componentInstance}
        _id={props._id}
        _class={props._class}
        rightSection={props.rightSection}
        position={props.element}
        {readonly}
        {embedded}
        bind:popupOptions={options}
        on:open={_open}
        on:close={_close}
        on:update={_update}
      />
    </div>
    {#if props.element !== 'content'}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="modal-overlay"
        class:show={options.showOverlay}
        on:click={() => {
          escapeClose()
        }}
        on:keydown={() => {}}
        on:keyup={() => {}}
      />
    {/if}
  {/if}
{/if}

<style lang="scss">
  .panel-instance {
    z-index: 401;
    position: fixed;
    background-color: transparent;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;

    @media print {
      position: static;
      z-index: initial;
      width: auto !important;
      height: auto !important;
    }
  }

  .modal-overlay {
    z-index: 400;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    touch-action: none;

    &.show {
      background: rgba(0, 0, 0, 0.5);
    }
  }
</style>
