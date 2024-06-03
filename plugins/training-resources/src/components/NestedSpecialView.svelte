<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
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
//
-->

<script lang="ts">
  import { Class, type Doc, type DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { Component, SearchEdit } from '@hcengineering/ui'
  import { Viewlet, ViewletDescriptor, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import { FilterBar, FilterButton, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'

  // TODO: Move to Platform?

  type T = $$Generic<Doc>

  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>
  export let baseQuery: DocumentQuery<T>
  export let descriptors: Array<Ref<ViewletDescriptor>> | undefined = undefined

  let viewlet: WithLookup<Viewlet> | undefined
  let viewOptions: ViewOptions | undefined
  let preference: ViewletPreference | undefined

  let query: DocumentQuery<T> = baseQuery ?? {}
  $: query = { ...(baseQuery ?? {}), ...(viewlet?.baseQuery ?? {}) }

  let search = ''
  let searchQuery: DocumentQuery<T> = query
  $: searchQuery = search === '' ? query : { ...query, $search: search }

  let resultQuery: DocumentQuery<T> = query
  $: resultQuery = searchQuery
</script>

<div class="antiComponent">
  <div class="ac-header full divide search-start">
    <div class="ac-header-full small-gap">
      <SearchEdit bind:value={search} />
      <div class="buttons-divider" />
      <FilterButton {_class} />
      <ViewletSelector
        bind:viewlet
        bind:preference
        viewletQuery={{
          attachTo: _class,
          variant: { $exists: false },
          descriptor: { $in: descriptors }
        }}
      />
    </div>
    <div class="ac-header-full medium-gap">
      <ViewletSettingButton bind:viewOptions {viewlet} />
    </div>
  </div>

  {#if viewlet?.$lookup?.descriptor !== undefined}
    <FilterBar
      {_class}
      {space}
      query={searchQuery}
      hideSaveButtons
      {viewOptions}
      on:change={(e) => {
        resultQuery = { ...query, ...e.detail }
      }}
    />
    <Component
      is={viewlet.$lookup.descriptor.component}
      props={{
        _class,
        space,
        options: viewlet.options,
        config: preference?.config ?? viewlet.config,
        viewlet,
        viewOptions,
        viewOptionsConfig: viewlet.viewOptions?.other,
        createItemDialog: undefined,
        createItemLabel: undefined,
        query: resultQuery,
        totalQuery: query
      }}
    />
  {/if}
</div>
