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
  import core, { DocumentQuery, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { ButtonIcon, showPopup, closeTooltip } from '@hcengineering/ui'
  import { ViewOptions, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../plugin'
  import { getViewOptions, viewOptionStore } from '../viewOptions'
  import ViewOptionsButton from './ViewOptionsButton.svelte'
  import ViewletSetting from './ViewletSetting.svelte'
  import { restrictionStore } from '../utils'

  export let viewletQuery: DocumentQuery<Viewlet> = {}
  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'
  export let viewOptions: ViewOptions | undefined = undefined

  export let viewlet: Viewlet | undefined = undefined
  export let viewlets: Array<WithLookup<Viewlet>> = []
  export let preference: ViewletPreference | undefined = undefined
  export let loading = true
  export let disabled: boolean = false

  const dispatch = createEventDispatcher()

  let btn: HTMLButtonElement
  let pressed: boolean = false

  function clickHandler (event: MouseEvent) {
    pressed = true
    closeTooltip()
    showPopup(ViewletSetting, { viewlet }, btn, () => {
      pressed = false
    })
  }

  $: viewOptions = getViewOptions(viewlet, $viewOptionStore)

  const query = createQuery()

  $: query.query(
    view.class.Viewlet,
    viewletQuery,
    (res) => {
      viewlets = res
      viewlet = viewlets[0]
      dispatch('viewlets', viewlets)
    },
    {
      lookup: {
        descriptor: view.class.ViewletDescriptor
      }
    }
  )

  const preferenceQuery = createQuery()

  $: if (viewlet != null) {
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        space: core.space.Workspace,
        attachedTo: viewlet._id
      },
      (res) => {
        preference = res[0]
        loading = false
      },
      { limit: 1 }
    )
  } else {
    preferenceQuery.unsubscribe()
  }

  $: disabled = $restrictionStore.readonly
</script>

{#if viewlet}
  <div class="flex-row-center gap-2 reverse">
    {#if viewOptions}
      <ViewOptionsButton {viewlet} {kind} {viewOptions} {disabled} />
    {/if}
    <ButtonIcon
      icon={view.icon.Configure}
      {kind}
      size={'small'}
      iconSize={'small'}
      {disabled}
      {pressed}
      tooltip={{ label: view.string.CustomizeView, direction: 'bottom' }}
      bind:element={btn}
      on:click={clickHandler}
    />
  </div>
{/if}
