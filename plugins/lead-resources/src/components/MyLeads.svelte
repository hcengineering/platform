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
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { AttachedDoc, Class, DocumentQuery, getCurrentAccount, Ref } from '@hcengineering/core'
  import { Lead } from '@hcengineering/lead'
  import { IntlString, Asset } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import task from '@hcengineering/task'
  import {
    IModeSelector,
    Breadcrumb,
    Loading,
    ModeSelector,
    resolvedLocationStore,
    SearchInput,
    Header
  } from '@hcengineering/ui'
  import { Viewlet, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import {
    FilterBar,
    FilterButton,
    TableBrowser,
    ViewletSelector,
    ViewletSettingButton
  } from '@hcengineering/view-resources'
  import { socialIdsByPersonRefStore } from '@hcengineering/contact-resources'
  import { createEventDispatcher } from 'svelte'
  import lead from '../plugin'

  export let _class: Ref<Class<Lead>> = lead.class.Lead
  export let labelTasks: IntlString = lead.string.MyLeads
  export let icon: Asset = lead.icon.Lead
  export let config: [string, IntlString, object][] = []

  let search = ''
  const dispatch = createEventDispatcher()
  const me = getCurrentEmployee()
  $: mySocialStrings = ($socialIdsByPersonRefStore.get(me) ?? []).map((si) => si.key)
  const assigned = { assignee: me }
  $: created = { createdBy: { $in: mySocialStrings } }
  let subscribed = { _id: { $in: [] as Ref<Lead>[] } }
  let mode: string | undefined = undefined
  let baseQuery: DocumentQuery<Lead> | undefined = undefined
  let modeSelectorProps: IModeSelector | undefined = undefined

  $: queries = { assigned, created, subscribed }
  $: mode = $resolvedLocationStore.query?.mode ?? undefined

  let searchQuery: DocumentQuery<Lead> = { ...(baseQuery ?? {}) }
  function updateSearchQuery (search: string): void {
    searchQuery = search === '' ? { ...baseQuery } : { ...baseQuery, $search: search }
  }
  $: if (baseQuery) updateSearchQuery(search)
  $: resultQuery = { ...searchQuery }

  const subscribedQuery = createQuery()
  function getSubscribed () {
    subscribedQuery.query(
      _class,
      { 'notification:mixin:Collaborators.collaborators': { $in: getCurrentAccount().socialIds } },
      (result) => {
        const newSub = result.map((p) => p._id as Ref<AttachedDoc> as Ref<Lead>)
        const curSub = subscribed._id.$in
        if (curSub.length !== newSub.length || curSub.some((id, i) => newSub[i] !== id)) {
          subscribed = { _id: { $in: newSub } }
        }
      },
      { sort: { _id: 1 } }
    )
  }
  $: if (mode === 'subscribed') getSubscribed()
  $: if (mode === undefined || (queries as any)[mode] === undefined) {
    ;[[mode]] = config
  }
  $: if (mode !== undefined) {
    baseQuery = { ...((queries as any)[mode] ?? {}) }
    modeSelectorProps = {
      config,
      mode,
      onChange: (newMode: string) => dispatch('action', { mode: newMode })
    }
  }

  let viewlet: Viewlet | undefined
  let loading = true
  let preference: ViewletPreference | undefined = undefined

  let viewOptions: ViewOptions | undefined = undefined
</script>

<Header adaptive={'freezeActions'} hideActions={modeSelectorProps === undefined}>
  <svelte:fragment slot="beforeTitle">
    <ViewletSelector
      hidden
      bind:viewlet
      bind:preference
      bind:loading
      viewletQuery={{
        attachTo: _class,
        descriptor: task.viewlet.StatusTable
      }}
    />
    <ViewletSettingButton bind:viewOptions bind:viewlet />
  </svelte:fragment>

  <Breadcrumb {icon} label={labelTasks} size={'large'} isCurrent />

  <svelte:fragment slot="search">
    <SearchInput bind:value={search} collapsed on:change={(e) => (search = e.detail)} />
    <FilterButton {_class} />
  </svelte:fragment>
  <svelte:fragment slot="actions">
    {#if modeSelectorProps !== undefined}
      <ModeSelector kind={'subtle'} props={modeSelectorProps} />
    {/if}
  </svelte:fragment>
</Header>
<FilterBar {_class} query={searchQuery} {viewOptions} space={undefined} on:change={(e) => (resultQuery = e.detail)} />

{#if viewlet}
  {#if loading}
    <Loading />
  {:else}
    <TableBrowser
      {_class}
      config={preference?.config ?? viewlet.config}
      options={viewlet.options}
      query={resultQuery}
      totalQuery={baseQuery}
      showNotification
    />
  {/if}
{/if}
