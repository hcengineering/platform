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
  import { createEventDispatcher } from 'svelte'
  import { ButtonIcon, showPopup, closeTooltip } from '@hcengineering/ui'
  import view, { ViewOptionModel, ViewOptions, Viewlet } from '@hcengineering/view'
  import { getViewOptions, viewOptionStore, defaultOptions } from '@hcengineering/view-resources'
  import ViewOptionsButton from './ViewOptionsButton.svelte'
  import ViewletSetting from './ViewSetting.svelte'

  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'
  export let viewOptions: ViewOptions | undefined = undefined
  export let viewlet: Viewlet | undefined = undefined
  export let disabled: boolean = false
  export let viewOptionsConfig: ViewOptionModel[] | undefined = undefined

  const dispatch = createEventDispatcher()

  let btn: HTMLButtonElement
  let pressed: boolean = false

  function clickHandler () {
    pressed = true
    closeTooltip()
    showPopup(
      ViewletSetting,
      { viewlet },
      btn,
      () => {
        pressed = false
      },
      (result) => {
        console.log('result', result)
        dispatch('save', result)
      }
    )
  }

  $: viewOptions = viewlet?.viewOptions
</script>

{#if viewlet}
  {#if viewOptions !== undefined}
    <ViewOptionsButton {viewlet} {kind} />
  {/if}
  <ButtonIcon
    icon={view.icon.Configure}
    {disabled}
    {kind}
    size={'small'}
    {pressed}
    tooltip={{ label: view.string.CustomizeView, direction: 'bottom' }}
    dataId={'btn-viewSetting'}
    bind:element={btn}
    on:click={clickHandler}
  />
{/if}
