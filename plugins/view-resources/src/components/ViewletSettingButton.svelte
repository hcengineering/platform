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
  import { ViewOptionModel, ViewOptions, Viewlet, type ViewOptionsModel, BuildModelKey } from '@hcengineering/view'
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
  export let defaultViewOptions: ViewOptions | undefined = undefined
  export let defaultConfig: (BuildModelKey | string)[] | undefined = undefined
  // v121.12/v121.16/v121.18 — the previously-exported `showViewOptions` prop
  // was removed in v121.18 (audit-cleanup) after v121.16 reverted v121.12 §B's
  // sole caller. Both child buttons (ViewOptionsButton + Configure ButtonIcon)
  // now always render whenever the viewlet defines them.

  let btn: HTMLButtonElement
  let pressed: boolean = false

  function clickHandler () {
    pressed = true
    closeTooltip()
    showPopup(ViewletSetting, { viewlet, defaultConfig }, btn, () => {
      pressed = false
    })
  }

  function getDefaults (viewOptions: ViewOptionsModel): ViewOptions {
    const res: ViewOptions = {
      groupBy: [viewOptions.groupBy[0] ?? defaultOptions.groupBy[0]],
      orderBy: viewOptions.orderBy?.[0] ?? defaultOptions.orderBy
    }
    for (const opt of viewOptions.other) {
      res[opt.key] = opt.defaultValue
    }
    return res
  }

  function getDefaultOptions (): ViewOptions {
    if (defaultViewOptions != null) return defaultViewOptions

    return viewlet?.viewOptions != null ? getDefaults(viewlet.viewOptions) : defaultOptions
  }

  $: viewOptions = getViewOptions(viewlet, $viewOptionStore, getDefaultOptions())

  $: disabled = $restrictionStore.readonly
</script>

{#if viewlet}
  {#if viewOptions}
    <ViewOptionsButton {viewlet} {kind} {viewOptions} {viewOptionsConfig} />
  {/if}
  <!-- v121.12 / Refactor B — Configure-columns button gets its own
       IntlString so the tooltip differs from the sibling ViewOptionsButton
       (which keeps "Customize view"). Before v121.12 both buttons rendered
       the same tooltip "Customize view" with no way for the user to tell
       them apart. -->
  <ButtonIcon
    icon={view.icon.Configure}
    {disabled}
    {kind}
    size={'small'}
    {pressed}
    tooltip={{ label: view.string.ConfigureColumns, direction: 'bottom' }}
    dataId={'btn-viewSetting'}
    bind:element={btn}
    on:click={clickHandler}
  />
{/if}
