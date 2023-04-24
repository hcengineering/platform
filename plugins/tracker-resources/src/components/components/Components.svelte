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
  import { DocumentQuery, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Component } from '@hcengineering/tracker'
  import {
    closePopup,
    closeTooltip,
    getCurrentResolvedLocation,
    navigate,
    resolvedLocationStore
  } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import tracker from '../../plugin'
  import { ComponentsViewMode } from '../../utils'
  import ComponentBrowser from './ComponentBrowser.svelte'
  import EditComponent from './EditComponent.svelte'

  export let label: IntlString = tracker.string.Components
  export let query: DocumentQuery<Component> = {}
  export let search: string = ''
  export let mode: ComponentsViewMode = 'all'

  let componentId: Ref<Component> | undefined
  let component: Component | undefined

  onDestroy(
    resolvedLocationStore.subscribe(async (loc) => {
      closeTooltip()
      closePopup()

      componentId = loc.path[5] as Ref<Component>
    })
  )

  const componentQuery = createQuery()
  $: if (componentId !== undefined) {
    componentQuery.query(tracker.class.Component, { _id: componentId }, (result) => {
      component = result.shift()
    })
  } else {
    componentQuery.unsubscribe()
    component = undefined
  }
</script>

{#if component}
  <EditComponent
    {component}
    on:component={(evt) => {
      const loc = getCurrentResolvedLocation()
      loc.path[5] = evt.detail
      navigate(loc)
    }}
  />
{:else}
  <ComponentBrowser {label} {query} {search} {mode} />
{/if}
