<!--
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
-->
<script lang="ts">
  import { Class, Doc, DocumentQuery, Ref, WithLookup } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { themeStore } from '@hcengineering/ui'
  import { Viewlet, ViewOptions } from '@hcengineering/view'
  import { FilterBar, SpaceHeader, ViewletContentView, ViewletSettingButton } from '@hcengineering/view-resources'
  import { Project, DocumentSpace } from '@hcengineering/controlled-documents'

  export let space: Ref<DocumentSpace>
  export let _class: Ref<Class<Project>>
  export let query: DocumentQuery<Project> = {}
  export let title: IntlString | undefined = undefined
  export let label: string = ''

  let viewlet: WithLookup<Viewlet> | undefined = undefined
  const viewlets: WithLookup<Viewlet>[] = []
  let viewOptions: ViewOptions | undefined

  let search = ''
  let searchQuery: DocumentQuery<Doc> = { ...query }
  let resultQuery: DocumentQuery<Doc> = { ...searchQuery }

  $: if (query !== undefined) updateSearchQuery(search)
  $: resultQuery = { ...searchQuery }

  function updateSearchQuery (search: string): void {
    searchQuery = search === '' ? { ...query } : { ...query, $search: search }
  }

  $: if (!label && title) {
    void translate(title, {}, $themeStore.language).then((res) => {
      label = res
    })
  }
</script>

<SpaceHeader bind:viewlet bind:search {_class} {viewlets} {space} {label}>
  <svelte:fragment slot="extra">
    <ViewletSettingButton bind:viewOptions bind:viewlet />
  </svelte:fragment>
</SpaceHeader>

{#if viewlet !== undefined && viewOptions}
  <FilterBar {_class} {space} query={searchQuery} {viewOptions} on:change={(e) => (resultQuery = e.detail)} />
  <div class="popupPanel rowContent">
    {#if viewlet}
      <ViewletContentView {_class} {viewlet} query={resultQuery} {space} {viewOptions} />
    {/if}
  </div>
{/if}
