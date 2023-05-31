<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { Component } from '@hcengineering/tracker'
  import { Loading, Component as ViewComponent } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import tracker from '../../plugin'
  import CreateComponent from './NewComponent.svelte'
  import { createQuery } from '@hcengineering/presentation'

  export let viewlet: WithLookup<Viewlet>
  export let viewOptions: ViewOptions
  export let query: DocumentQuery<Component> = {}
  export let space: Ref<Space> | undefined

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined
  let loading = true

  $: viewlet &&
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        attachedTo: viewlet._id
      },
      (res) => {
        preference = res[0]
        loading = false
      },
      { limit: 1 }
    )

  const createItemDialog = CreateComponent
  const createItemLabel = tracker.string.Component
</script>

{#if viewlet?.$lookup?.descriptor?.component}
  {#if loading}
    <Loading />
  {:else}
    <ViewComponent
      is={viewlet.$lookup.descriptor.component}
      props={{
        _class: tracker.class.Component,
        config: preference?.config ?? viewlet.config,
        options: viewlet.options,
        createItemDialog,
        createItemLabel,
        viewOptions,
        viewOptionsConfig: viewlet.viewOptions?.other,
        viewlet,
        space,
        query
      }}
    />
  {/if}
{/if}
