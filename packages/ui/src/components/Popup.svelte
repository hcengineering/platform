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
  import { popupstore as modal } from '../popups'
  import PopupInstance from './PopupInstance.svelte'

  export let contentPanel: HTMLElement | undefined = undefined

  const instances: PopupInstance[] = []

  export function fitPopupInstance (): void {
    instances.forEach((p) => p.fitPopupInstance())
  }

  $: instances.length = $modal.length
</script>

{#if $modal.length > 0}
  <slot name="popup-header" />
{/if}
{#each $modal as popup, i}
  {#key popup.id}
    <PopupInstance
      bind:this={instances[i]}
      is={popup.is}
      props={popup.props}
      element={popup.element}
      onClose={popup.onClose}
      onUpdate={popup.onUpdate}
      zIndex={(i + 1) * 500}
      top={$modal.length - 1 === i}
      close={popup.close}
      {contentPanel}
      overlay={popup.options.overlay}
    />
  {/key}
{/each}
