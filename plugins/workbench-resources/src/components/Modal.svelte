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
  import { store as modal } from '@anticrm/ui'
  import Component from '@anticrm/ui/src/components/Component.svelte'

  let modalHTML: HTMLElement
  let modalOHTML: HTMLElement

  function close () {
    modalHTML.style.animationDirection = modalOHTML.style.animationDirection = 'reverse'
    modalHTML.style.animationDuration = modalOHTML.style.animationDuration = '.2s'
    modal.set({ is: undefined, props: {}, element: undefined })
  }

  function handleKeydown (ev: KeyboardEvent) {
    if (ev.key === 'Escape' && $modal.is) {
      close()
    }
  }
  
  function getStyle (element: HTMLElement | undefined) {
    if (element) {
      const rect = element.getBoundingClientRect()
      return `top: ${rect.top + rect.height + 2}px; left: ${rect.left}px;`
    } else {
      return 'top: 50%; left: 50%; transform: translate(-50%, -50%);'
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $modal.is}
  <div class="modal" class:top-arrow={$modal.element} bind:this={modalHTML} style={getStyle($modal.element)}>
    {#if typeof($modal.is) === 'string'}
      <Component is={$modal.is} props={$modal.props} on:close={close}/>
    {:else}
      <svelte:component this={$modal.is} {...$modal.props} on:close={close} />
    {/if}
  </div>
  <div bind:this={modalOHTML} class="modal-overlay" />
{/if}

<style lang="scss">
  @keyframes show {
    from { opacity: 0; filter: blur(3px); }
    99% { opacity: 1; filter: blur(0px); }
    to { filter: none; }
  }
  @keyframes showOverlay {
    from { backdrop-filter: blur(0px); }
    to { backdrop-filter: blur(3px); }
  }
  .modal {
    position: fixed;
    background: transparent;
    z-index: 1001;
    animation: show .2s ease-in-out forwards;
  }
  .modal-overlay {
    z-index: 1000;
    background: rgba(0, 0, 0, 0.2);
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    animation: showOverlay .2s ease-in-out forwards;
  }
</style>