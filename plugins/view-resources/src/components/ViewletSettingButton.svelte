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
  import { DocumentQuery, Ref, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, ButtonKind, resolvedLocationStore, showPopup } from '@hcengineering/ui'
  import { ViewOptions, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import view from '../plugin'
  import { activeViewlet, makeViewletKey, setActiveViewletId } from '../utils'
  import { getViewOptions, viewOptionStore } from '../viewOptions'
  import ViewOptionsButton from './ViewOptionsButton.svelte'
  import ViewletSetting from './ViewletSetting.svelte'

  export let viewletQuery: DocumentQuery<Viewlet> = {}
  export let kind: ButtonKind = 'regular'
  export let viewOptions: ViewOptions | undefined = undefined

  export let loading = true

  export let viewlet: Viewlet | undefined = undefined
  export let viewlets: WithLookup<Viewlet>[] = []
  export let preference: ViewletPreference | undefined = undefined

  const dispatch = createEventDispatcher()

  let btn: HTMLButtonElement

  function clickHandler (event: MouseEvent) {
    showPopup(ViewletSetting, { viewlet }, btn)
  }

  $: viewOptions = getViewOptions(viewlet, $viewOptionStore)

  const query = createQuery()

  $: query.query(
    view.class.Viewlet,
    viewletQuery,
    (res) => {
      viewlets = res
      dispatch('viewlets', viewlets)
    },
    {
      lookup: {
        descriptor: view.class.ViewletDescriptor
      }
    }
  )

  let key = makeViewletKey()

  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      key = makeViewletKey(loc)
    })
  )

  $: getActiveViewlet(viewlets, $activeViewlet, key)

  function getActiveViewlet (
    viewlets: WithLookup<Viewlet>[],
    activeViewlet: Record<string, Ref<Viewlet> | null>,
    key: string
  ) {
    if (viewlets.length === 0) return
    const newViewlet = viewlets.find((viewlet) => viewlet?._id === activeViewlet[key]) ?? viewlets[0]
    if (viewlet?._id !== newViewlet?._id) {
      preference = undefined
      viewlet = newViewlet
      setActiveViewletId(newViewlet._id)
      dispatch('viewlet', viewlet)
    }
  }

  const preferenceQuery = createQuery()

  $: if (viewlet != null) {
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        attachedTo: viewlet._id
      },
      (res) => {
        preference = res[0]
        loading = false
        dispatch('loading', loading)
        dispatch('preference', preference)
      },
      { limit: 1 }
    )
  } else {
    preferenceQuery.unsubscribe()
  }
</script>

{#if viewlet}
  <div class="flex-row-center gap-2 reverse">
    {#if viewOptions}
      <ViewOptionsButton {viewlet} {kind} {viewOptions} />
    {/if}
    <Button
      icon={view.icon.Configure}
      label={view.string.Show}
      {kind}
      shrink={1}
      adaptiveShrink={'sm'}
      showTooltip={{ label: view.string.CustomizeView, direction: 'bottom' }}
      bind:input={btn}
      on:click={clickHandler}
    />
  </div>
{/if}
