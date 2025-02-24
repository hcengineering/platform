<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { ButtonIcon, showPopup, closeTooltip } from '@hcengineering/ui'
  import { ViewOptionModel, ViewOptions, Viewlet } from '@hcengineering/view'
  import view from '../plugin'
  import { getViewOptions, viewOptionStore, defaultOptions } from '../viewOptions'
  import ViewOptionsButton from './ViewOptionsButton.svelte'
  import ViewletSetting from './ViewletSetting.svelte'
  import { restrictionStore } from '../utils'

  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'
  export let viewOptions: ViewOptions | undefined = undefined
  export let viewlet: Viewlet | undefined = undefined
  export let disabled: boolean = false
  export let viewOptionsConfig: ViewOptionModel[] | undefined = undefined

  let btn: HTMLButtonElement
  let pressed: boolean = false

  function clickHandler () {
    pressed = true
    closeTooltip()
    showPopup(ViewletSetting, { viewlet }, btn, () => {
      pressed = false
    })
  }

  $: viewOptions = getViewOptions(viewlet, $viewOptionStore, defaultOptions)

  $: disabled = $restrictionStore.readonly
</script>

{#if viewlet}
  {#if viewOptions}
    <ViewOptionsButton {viewlet} {kind} {viewOptions} {viewOptionsConfig} />
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
