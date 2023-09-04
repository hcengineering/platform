<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Class, Doc, Ref, Space, WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { AnyComponent, Component, Loading } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import { FilterBar } from '@hcengineering/view-resources'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space>
  export let search: string = ''
  export let viewlet: WithLookup<Viewlet> | undefined
  export let createItemDialog: AnyComponent | undefined
  export let createItemLabel: IntlString | undefined
  export let viewOptions: ViewOptions

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined
  let loading = true

  $: query = viewlet?.baseQuery ?? {}

  $: searchQuery = search === '' ? { space, ...query } : { $search: search, space, ...query }
  $: resultQuery = searchQuery

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
</script>

{#if viewlet}
  {#key space}
    {#if viewlet.$lookup?.descriptor?.component}
      {#if loading}
        <Loading />
      {:else}
        <FilterBar
          {_class}
          {space}
          query={searchQuery}
          {viewOptions}
          on:change={(e) => (resultQuery = { ...e.detail, ...query })}
        />
        <Component
          is={viewlet.$lookup?.descriptor?.component}
          props={{
            _class,
            space,
            options: viewlet.options,
            config: preference?.config ?? viewlet.config,
            viewlet,
            viewOptions,
            viewOptionsConfig: viewlet.viewOptions?.other,
            createItemDialog,
            createItemLabel,
            query: resultQuery
          }}
        />
      {/if}
    {/if}
  {/key}
{/if}
