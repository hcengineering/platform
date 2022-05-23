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
  import { getResource } from '@anticrm/platform'
  import { afterUpdate, onMount } from 'svelte'
  import { Spinner } from '..'
  import type { AnySvelteComponent, PopupOptions } from '..'
  import { closePanel, PanelProps, panelstore } from '../panelup'
  import { fitPopupElement, popupstore } from '../popups'

  export let contentPanel: HTMLElement

  let modalHTML: HTMLElement
  let componentInstance: any
  let docWidth: number
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
      minWidth: ''
    },
    showOverlay: false,
    direction: 'bottom'
  }

  let component: AnySvelteComponent

  let props: PanelProps | undefined
  function _close () {
    closePanel()
  }

  $: props = $panelstore.panel

  $: if (props !== undefined) {
    getResource(props.component).then((r) => {
      component = r
    })
  }

  function escapeClose () {
    // Check if there is popup visible, then ignore
    if ($popupstore.length > 0) {
      return
    }

    if (componentInstance && componentInstance.canClose) {
      if (!componentInstance.canClose()) {
        console.log('CANT CLOSE')
        return
      }
    }
    _close()
  }

  const fitPopup = (props: PanelProps, contentPanel: HTMLElement): void => {
    if (modalHTML) {
      if ((fullSize || docSize) && (props.element === 'float' || props.element === 'content')) {
        options = fitPopupElement(modalHTML, 'full')
        options.props.width = '100vw'
        options.props.maxHeight = '100vh'
        options.showOverlay = false
        modalHTML.classList.add('fullsize')
      } else {
        options = fitPopupElement(modalHTML, props.element, contentPanel)
        modalHTML.classList.remove('fullsize')
      }
      options.fullSize = fullSize
    }
  }

  function handleKeydown (ev: KeyboardEvent) {
    if (ev.key === 'Escape') {
      escapeClose()
    }
  }

  const _update = (): void => {
    if (props) fitPopup(props, contentPanel)
  }

  afterUpdate(() => {
    if (props) fitPopup(props, contentPanel)
  })
  export function fitPopupInstance (): void {
    if (props) fitPopup(props, contentPanel)
  }

  onMount(() => {
    if (props) fitPopup(props, contentPanel)
  })
  $: if (docWidth <= 900 && !docSize) docSize = true
  $: if (docWidth > 900 && docSize) docSize = false
</script>

<svelte:window
  bind:innerWidth={docWidth}
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
      class:bg={props.element === 'content'}
      bind:this={modalHTML}
      style:top={options.props.top}
      style:bottom={options.props.bottom}
      style:left={options.props.left}
      style:right={options.props.right}
      style:width={options.props.width}
      style:height={options.props.height}
      style:max-width={options.props.maxWidth}
      style:max-height={options.props.maxHeight}
      style:min-width={options.props.minWidth}
      style:transform={options.props.transform}
    >
      <div class="panel-container" class:padding={props.element === 'content'}>
        <svelte:component
          this={component}
          bind:this={componentInstance}
          _id={props._id}
          _class={props._class}
          rightSection={props.rightSection}
          position={props.element}
          bind:options
          on:close={_close}
          on:update={_update}
          on:fullsize={() => {
            fullSize = !fullSize
          }}
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
    will-change: top, bottom, left, right;
    transition-property: top, bottom, left, right, width, height;
    transition-duration: 0.15s;
    transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);

    &.bg {
      background-color: var(--body-color);
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

    &.show {
      background: rgba(0, 0, 0, 0.5);
    }
  }
  :global(.panel-instance.fullsize) {
    transition-timing-function: cubic-bezier(0.19, 1, 0.22, 1) !important;
  }
</style>
