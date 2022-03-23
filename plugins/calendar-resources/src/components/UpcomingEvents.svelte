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
  import { Event } from '@anticrm/calendar'
  import { EmployeeAccount } from '@anticrm/contact'
  import { Class, DocumentQuery, FindOptions, getCurrentAccount, Ref } from '@anticrm/core'
  import { Asset, IntlString } from '@anticrm/platform'
  import { AnySvelteComponent, Icon, Label, SearchEdit, Tooltip } from '@anticrm/ui'
  import { Table } from '@anticrm/view-resources'
  import view from '@anticrm/view'
  import calendar from '../plugin'
  import CalendarView from './CalendarView.svelte'

  export let _class: Ref<Class<Event>>
  export let query: DocumentQuery<Event> = {}
  export let options: FindOptions<Event> | undefined = undefined
  export let baseMenuClass: Ref<Class<Event>> | undefined = undefined
  export let config: string[]

  const currentUser = getCurrentAccount() as EmployeeAccount

  let search = ''
  let resultQuery: DocumentQuery<Event> = {}

  function updateResultQuery (search: string): void {
    resultQuery = search === '' ? { ...query } : { ...query, $search: search }

    resultQuery.participants = currentUser.employee
  }

  $: updateResultQuery(search)

  interface CalendarViewlet {
    component: AnySvelteComponent
    props: Record<string, any>
    label: IntlString
    icon: Asset
  }

  $: viewlets = [{
    component: CalendarView,
    icon: calendar.icon.Calendar,
    label: calendar.string.Calendar,
    props: {
      _class,
      space: undefined,
      query: resultQuery,
      options,
      baseMenuClass,
      config,
      search
    }
  },
  {
    component: Table,
    icon: view.icon.Table,
    label: calendar.string.TableView,
    props: {
      _class,
      query: resultQuery,
      options,
      baseMenuClass,
      config,
      search
    }
  }] as CalendarViewlet[]
  let selectedViewlet = 0
</script>

<div class="ac-header full">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={calendar.icon.Calendar} size={'small'} /></div>
    <span class="ac-header__title"><Label label={calendar.string.UpcomingEvents} /></span>
  </div>

  {#if viewlets.length > 1}
    <div class="flex">
      {#each viewlets as viewlet, i}
        <Tooltip label={viewlet.label} direction={'top'}>
          <button
            class="ac-header__icon-button"
            class:selected={selectedViewlet === i}
            on:click={() => {
              selectedViewlet = i
            }}
          >
            <Icon icon={viewlet.icon} size={'small'} />
          </button>
        </Tooltip>
      {/each}
    </div>
  {/if}

  <SearchEdit
    bind:value={search}
    on:change={() => {
      updateResultQuery(search)
    }}
  />
</div>

{#if viewlets[selectedViewlet]}
  <svelte:component this={viewlets[selectedViewlet].component} {...(viewlets[selectedViewlet].props)} />
{/if}
