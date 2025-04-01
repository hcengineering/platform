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
  import { getClient } from '@hcengineering/presentation'
  import { ButtonIcon, closeTooltip, IconOptions, showPopup } from '@hcengineering/ui'
  import { Viewlet, ViewOptionModel, ViewOptions } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../plugin'
  import { focusStore } from '../selection'
  import { setViewOptions } from '../viewOptions'
  import ViewOptionsEditor from './ViewOptions.svelte'

  export let viewlet: Viewlet | undefined
  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'
  export let viewOptions: ViewOptions
  export let disabled: boolean = false
  export let viewOptionsConfig: ViewOptionModel[] | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()

  let btn: HTMLButtonElement
  let pressed: boolean = false

  async function clickHandler (): Promise<void> {
    if (viewlet === undefined) {
      return
    }
    pressed = true
    closeTooltip()
    const h = client.getHierarchy()
    const config = viewlet.viewOptions !== undefined ? h.clone(viewlet.viewOptions) : undefined
    if (viewOptionsConfig !== undefined && config !== undefined) {
      config.other = viewOptionsConfig
    }

    showPopup(
      ViewOptionsEditor,
      { viewlet, config, viewOptions: h.clone(viewOptions) },
      btn,
      () => {
        pressed = false
      },
      (result) => {
        if (result?.key === undefined) return
        if (viewlet) {
          viewOptions = { ...viewOptions, [result.key]: result.value }

          // Clear selection on view settings change.
          focusStore.set({})

          setViewOptions(viewlet, viewOptions)
          dispatch('viewOptions', viewOptions)
        }
      }
    )
  }
</script>

{#if viewlet?.viewOptions !== undefined}
  <ButtonIcon
    icon={IconOptions}
    {disabled}
    {kind}
    size={'small'}
    hasMenu
    {pressed}
    tooltip={{ label: view.string.CustomizeView, direction: 'bottom' }}
    dataId={'btn-viewOptions'}
    bind:element={btn}
    on:click={clickHandler}
  />
{/if}
