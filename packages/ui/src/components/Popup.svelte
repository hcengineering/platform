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
<script context="module" lang="ts">
  let fullScreenMode: boolean = false

  export function getFullScreenMode (): boolean {
    return fullScreenMode
  }
  function setFullScreenMode (value: boolean): void {
    fullScreenMode = value
  }
</script>

<script lang="ts">
  import { popupstore as popups } from '../popups'
  import { modalStore as modals } from '../modals'

  import PopupInstance from './PopupInstance.svelte'
  import { onDestroy, onMount } from 'svelte'

  export let contentPanel: HTMLElement | undefined = undefined
  export let fullScreen: boolean = false

  const instances: PopupInstance[] = []

  export function fitPopupInstance (): void {
    instances.forEach((p) => p.fitPopupInstance())
  }

  onMount(() => {
    if (fullScreen) setFullScreenMode(true)
  })
  onDestroy(() => {
    if (fullScreen) setFullScreenMode(false)
  })

  const shouldDisplayPopup = (popup: any): boolean => {
    return (
      (fullScreen && fullScreenMode && popup.element !== 'full-centered') ||
      (!fullScreen && fullScreenMode && popup.element === 'full-centered') ||
      (!fullScreen && !fullScreenMode)
    )
  }

  $: instances.length = $popups.filter((p) => p.dock !== true && shouldDisplayPopup(p)).length
</script>

{#if $popups.length > 0}
  <slot name="popup-header" />
{/if}
{#each $popups.filter((p) => p.dock !== true && shouldDisplayPopup(p)) as popup, i (popup.id)}
  <PopupInstance
    bind:this={instances[i]}
    is={popup.is}
    props={popup.props}
    element={popup.element}
    onClose={popup.onClose}
    onUpdate={popup.onUpdate}
    zIndex={($modals.findIndex((modal) => modal.type === 'popup' && modal.id === popup.id) ?? i) + 10000}
    top={$popups.length - 1 === i}
    close={popup.close}
    {contentPanel}
    overlay={popup.options.overlay}
    {popup}
  />
{/each}
