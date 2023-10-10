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
  import { getResource } from '@hcengineering/platform'
  import { afterUpdate, onMount } from 'svelte'

  import { closePanel, PanelProps, panelstore } from '../panelup'
  import { fitPopupElement, popupstore } from '../popups'
  import { deviceOptionsStore as deviceInfo, resizeObserver } from '..'
  import type { AnySvelteComponent, PopupOptions, DeviceOptions } from '../types'
  import Spinner from './Spinner.svelte'

  export let contentPanel: HTMLElement

  let modalHTML: HTMLElement
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
  function _close () {
    closePanel()
  }

  $: if ($panelstore.panel !== undefined) {
    if ($panelstore.panel.component === undefined) {
      props = $panelstore.panel
    } else {
      getResource($panelstore.panel.component).then((r) => {
        component = r
        props = $panelstore.panel
      })
    }
  } else {
    props = undefined
  }

  function escapeClose () {
    // Check if there is popup visible, then ignore
    if ($popupstore.length > 0) {
      return
    }

    if (componentInstance && componentInstance.canClose) {
      if (!componentInstance.canClose()) {
        return
      }
    }
    _close()
  }

  const fitPopup = (props: PanelProps, contentPanel: HTMLElement): void => {
    if (modalHTML) {
      const device: DeviceOptions = $deviceInfo
      options = fitPopupElement(modalHTML, device, props.element, contentPanel)
    }
  }

  function handleKeydown (ev: KeyboardEvent) {
    if (ev.key === 'Escape') {
      escapeClose()
    }
  }

  function _open (): void {
    if (modalHTML && props) {
      if (props.element === 'content') {
        modalHTML.classList.add('bg')
      } else {
        modalHTML.classList.remove('bg')
      }
    }
  }

  const _update = (): void => {
    if (props) {
      fitPopup(props, contentPanel)
    }
  }

  const checkResize = (el: Element) => {
    if (props) fitPopup(props, contentPanel)
  }

  afterUpdate(() => {
    if (props) fitPopup(props, contentPanel)
    if (!keepSize && props?.element === 'content' && contentPanel !== undefined) {
      keepSize = true
      resizeObserver(contentPanel, checkResize)
    }
  })
  export function fitPopupInstance (): void {
    if (props) fitPopup(props, contentPanel)
  }

  onMount(() => {
    if (props) fitPopup(props, contentPanel)
  })
</script>

<svelte:window
  on:resize={() => {
    if (props) fitPopup(props, contentPanel)
  }}
  on:keydown={(evt) => {
    if (props) handleKeydown(evt)
  }}
/>
{#if props}
  {#if !component}
    <Spinner />
  {:else}
    <slot name="panel-header" />
    <div
      class="panel-instance"
      class:bg={false}
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
      <div class="panel-container" class:padding={props.element === 'content'}>
        <svelte:component
          this={component}
          bind:this={componentInstance}
          _id={props._id}
          _class={props._class}
          rightSection={props.rightSection}
          position={props.element}
          bind:popupOptions={options}
          on:open={_open}
          on:close={_close}
          on:update={_update}
        />
      </div>
    </div>
    {#if props.element !== 'content'}
      <div
        class="modal-overlay"
        class:show={options.showOverlay}
        on:click={() => escapeClose()}
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

    &.bg {
      background-color: var(--theme-back-color);
    }
    .panel-container {
      padding: 0.5rem;
      width: 100%;
      height: 100%;

      &.padding {
        padding: 0.75rem;
      }
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
