<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { popupstore as modal } from '..'
  import Component from './Component.svelte'

  let modalHTML: HTMLElement
  let arrowHTML: HTMLElement
  let modalOHTML: HTMLElement

  function close () {
    modal.set({ is: undefined, props: {}, element: undefined })
  }

  function handleKeydown (ev: KeyboardEvent) {
    if (ev.key === 'Escape' && $modal.is) {
      close()
    }
  }

  $: {
    if (modalHTML) {
      if ($modal.element) {
        const rect = $modal.element.getBoundingClientRect()
        let style: string = 'popup-'
        if (rect.top > document.body.clientHeight - rect.bottom) {
          // style += 'top-'
          modalHTML.style.bottom = `calc(${document.body.clientHeight - rect.top}px + .75rem)`
          // arrowHTML.style.top = rect.top - convertRemToPx(.75) + 'px'
          // arrowHTML.style.left = rect.left + rect.width / 2 + 'px'
          // arrowHTML.classList.add('popup-top')
        } else {
          // style += 'bottom-'
          modalHTML.style.top = `calc(${rect.bottom}px + .75rem)`
          // arrowHTML.style.top = '0px'
        }
        if (rect.left > document.body.clientWidth - rect.right) {
          // style += 'left'
          modalHTML.style.right = document.body.clientWidth - rect.right + 'px'
        } else {
          // style += 'right'
          modalHTML.style.left = rect.left + 'px'
        }
        // modalHTML.classList.add(style)
      } else {
        modalHTML.style.top = '16px'
        modalHTML.style.bottom = '16px'
        modalHTML.style.right = '16px'
        // modalHTML.style.transform = 'translateY(-50%)'
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $modal.is}
  <div class="popup" bind:this={modalHTML}>
    {#if typeof($modal.is) === 'string'}
      <Component is={$modal.is} props={$modal.props} on:close={close}/>
    {:else}
      <svelte:component this={$modal.is} {...$modal.props} on:close={close} />
    {/if}
  </div>
  <div bind:this={modalOHTML} class="modal-overlay" on:click={close} />
{/if}

<style lang="scss">
  .popup {
    position: fixed;
    background-color: transparent;
    filter: drop-shadow(0 1.5rem 4rem rgba(0, 0, 0, .35));
    z-index: 501;
  }
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    z-index: 500;
  }
</style>