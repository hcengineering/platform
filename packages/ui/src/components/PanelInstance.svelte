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
  import { afterUpdate } from 'svelte'
  import { AnySvelteComponent, Spinner } from '..'
  import { closePanel, PanelProps, panelstore as modal } from '../panelup'
  import { popupstore } from '../popups'

  let modalHTML: HTMLElement
  let componentInstance: any
  let show: boolean = false

  let component: AnySvelteComponent

  let props: PanelProps | undefined
  function _close () {
    closePanel()
  }

  $: props = $modal.panel

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
      if (!componentInstance.canClose()) return
    }
    _close()
  }

  const fitPopup = (props: PanelProps): void => {
    if (modalHTML) {
      if (props.element) {
        show = false
        modalHTML.style.left = modalHTML.style.right = modalHTML.style.top = modalHTML.style.bottom = ''
        modalHTML.style.maxHeight = modalHTML.style.height = ''
        if (typeof props.element !== 'string') {
          const el = props.element as HTMLElement
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
        } else if (props.element === 'right') {
          modalHTML.style.top = '0'
          modalHTML.style.bottom = '0'
          modalHTML.style.right = '0'
        } else if (props.element === 'float') {
          modalHTML.style.top = '4rem'
          modalHTML.style.bottom = '4rem'
          modalHTML.style.right = '4rem'
        } else if (props.element === 'account') {
          modalHTML.style.bottom = '2.75rem'
          modalHTML.style.left = '5rem'
        } else if (props.element === 'full') {
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
    if (ev.key === 'Escape') {
      escapeClose()
    }
  }
  afterUpdate(() => {
    if (props) fitPopup(props)
  })
</script>

<svelte:window
  on:resize={() => {
    if (props) fitPopup(props)
  }}
  on:keydown={(evt) => {
    if (props) handleKeydown(evt)
  }}
/>
{#if props}
  {#if !component}
    <Spinner />
  {:else}
    <div class="popup" bind:this={modalHTML} style={'z-index: 401'}>
      <svelte:component
        this={component}
        bind:this={componentInstance}
        _id={props._id}
        _class={props._class}
        rightSection={props.rightSection}
        on:update={fitPopup}
        on:close={_close}
      />
    </div>
    <div class="modal-overlay" class:show style={'z-index: 400'} on:click={() => escapeClose()} />
  {/if}
{/if}

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
    &.show {
      background: rgba(0, 0, 0, 0.5);
    }
  }
</style>
