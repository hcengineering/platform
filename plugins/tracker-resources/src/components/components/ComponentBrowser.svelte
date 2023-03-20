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
  import contact from '@hcengineering/contact'
  import { DocumentQuery, FindOptions, SortingOrder } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Component } from '@hcengineering/tracker'
  import { Button, IconAdd, Label, showPopup, TabList } from '@hcengineering/ui'
  import type { TabItem } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import view from '@hcengineering/view'
  import { getIncludedComponentStatuses, componentsTitleMap, ComponentsViewMode } from '../../utils'
  import NewComponent from './NewComponent.svelte'
  import ComponentsListBrowser from './ComponentsListBrowser.svelte'

  export let label: IntlString
  export let query: DocumentQuery<Component> = {}
  export let search: string = ''
  export let mode: ComponentsViewMode = 'all'
  export let viewMode: 'list' | 'timeline' = 'list'

  const ENTRIES_LIMIT = 200
  const resultComponentsQuery = createQuery()

  const componentOptions: FindOptions<Component> = {
    sort: { modifiedOn: SortingOrder.Descending },
    limit: ENTRIES_LIMIT,
    lookup: { lead: contact.class.Employee, members: contact.class.Employee }
  }

  let resultComponents: Component[] = []

  $: includedComponentStatuses = getIncludedComponentStatuses(mode)
  $: title = componentsTitleMap[mode]
  $: includedComponentsQuery = { status: { $in: includedComponentStatuses } }

  $: baseQuery = {
    ...includedComponentsQuery,
    ...query
  }

  $: resultQuery = search === '' ? baseQuery : { $search: search, ...baseQuery }

  $: resultComponentsQuery.query<Component>(
    tracker.class.Component,
    { ...resultQuery },
    (result) => {
      resultComponents = result
    },
    componentOptions
  )

  const space = typeof query.space === 'string' ? query.space : tracker.project.DefaultProject
  const showCreateDialog = async () => {
    showPopup(NewComponent, { space, targetElement: null }, 'top')
  }

  const handleViewModeChanged = (newMode: ComponentsViewMode) => {
    if (newMode === undefined || newMode === mode) {
      return
    }

    mode = newMode
  }

  const modeList: TabItem[] = [
    { id: 'all', labelIntl: tracker.string.AllComponents, action: () => handleViewModeChanged('all') },
    { id: 'backlog', labelIntl: tracker.string.BacklogComponents, action: () => handleViewModeChanged('backlog') },
    { id: 'active', labelIntl: tracker.string.ActiveComponents, action: () => handleViewModeChanged('active') },
    { id: 'closed', labelIntl: tracker.string.ClosedComponents, action: () => handleViewModeChanged('closed') }
  ]
  const viewList: TabItem[] = [
    { id: 'list', icon: view.icon.List, tooltip: view.string.List },
    { id: 'timeline', icon: view.icon.Timeline, tooltip: view.string.Timeline }
  ]

  const retrieveMembers = (p: Component) => p.members
</script>

<div class="fs-title flex-between header">
  <div class="flex-center">
    <Label {label} />
    <div class="componentTitle">
      › <Label label={title} />
    </div>
  </div>
  <Button size="small" icon={IconAdd} label={tracker.string.Component} kind={'primary'} on:click={showCreateDialog} />
</div>
<div class="itemsContainer">
  <div class="flex-row-center">
    <TabList
      items={modeList}
      selected={mode}
      kind={'normal'}
      on:select={(result) => {
        if (result.detail !== undefined && result.detail.action) result.detail.action()
      }}
    />
    <!-- <div class="ml-3 filterButton">
      <BuComponet      size="small"
        icon={IconAdd}
        kind={'link-bordered'}
        borderStyle={'dashed'}
        label={tracker.string.Filter}
        on:click={() => {}}
      />
    </div> -->
  </div>
  <TabList
    items={viewList}
    selected={viewMode}
    kind={'secondary'}
    size={'small'}
    on:select={(result) => {
      if (result.detail !== undefined && result.detail.id !== viewMode) viewMode = result.detail.id
    }}
  />
</div>
<ComponentsListBrowser
  _class={tracker.class.Component}
  itemsConfig={[
    { key: '', presenter: tracker.component.IconPresenter },
    { key: '', presenter: tracker.component.ComponentPresenter, props: { kind: 'list', withIcon: false } },
    {
      key: '$lookup.lead',
      presenter: tracker.component.LeadPresenter,
      props: { _class: tracker.class.Component, defaultClass: contact.class.Employee, shouldShowLabel: false }
    },
    {
      key: '',
      presenter: contact.component.MembersPresenter,
      props: {
        kind: 'link',
        intlTitle: tracker.string.ComponentMembersTitle,
        intlSearchPh: tracker.string.ComponentMembersSearchPlaceholder,
        retrieveMembers
      }
    },
    { key: '', presenter: tracker.component.TargetDatePresenter },
    { key: '', presenter: tracker.component.ComponentStatusPresenter },
    { key: '', presenter: tracker.component.DeleteComponentPresenter, props: { space } }
  ]}
  components={resultComponents}
  {viewMode}
/>

<style lang="scss">
  .header {
    padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  }

  .componentTitle {
    display: flex;
    margin-left: 0.25rem;
    color: var(--content-color);
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .itemsContainer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.65rem 0.75rem 0.65rem 2.25rem;
    background-color: var(--board-bg-color);
    border-top: 1px solid var(--divider-color);
    border-bottom: 1px solid var(--divider-color);
  }
</style>
