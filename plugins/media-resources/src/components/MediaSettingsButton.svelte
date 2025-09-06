<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { IconMoreH, StatusBarButton, showPopup } from '@hcengineering/ui'

  import { sessions } from '../stores'

  import IconCamOn from './icons/CamOn.svelte'
  import MediaPopup from './MediaPopup.svelte'

  export let disabled = false
  export let anchor: HTMLElement

  $: active = $sessions.length > 0

  let pressed = false

  async function openPopup (): Promise<void> {
    pressed = true
    showPopup(MediaPopup, {}, anchor, () => {
      pressed = false
    })
  }
</script>

{#if active}
  <button class="options-button" class:pressed {disabled} on:click={openPopup}>
    <IconMoreH size={'small'} />
  </button>
{:else}
  <StatusBarButton icon={IconCamOn} {pressed} on:click={openPopup} />
{/if}

<style lang="scss">
  .options-button {
    margin: 0;
    padding: 0.375rem;
    height: 1.75rem;
    color: var(--theme-state-positive-color);
    background-color: var(--theme-state-positive-background-color);
    border: none;
    border-radius: 0 0.375rem 0.375rem 0;
    outline: none;

    &.pressed,
    &:hover {
      color: var(--theme-state-positive-hover);
      background-color: var(--theme-state-positive-background-hover);
    }
  }
</style>
