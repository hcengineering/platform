<!--
//
// Copyright © 2026 TraceX SAS.
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
  import type { WorkspaceAuditEvent, WorkspaceAuditPage, WorkspaceAuditQuery } from '@hcengineering/account-client'
  import { AccountRole, getCurrentAccount } from '@hcengineering/core'
  import platform, { PlatformError } from '@hcengineering/platform'
  import {
    Breadcrumb,
    Button,
    DateTimePresenter,
    DatePresenter,
    DropdownLabelsIntl,
    FilterButton,
    Header,
    IconHistory,
    Label,
    InteractiveListView,
    Loading,
    Notice,
    RangeDatePopup,
    Scroller,
    SectionEmpty,
    StateTag,
    showPopup,
    type ActiveFilter,
    type FilterCategory,
    type DropdownIntlItem
  } from '@hcengineering/ui'
  import ui from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { onDestroy, onMount } from 'svelte'
  import {
    AUDIT_EVENT_ITEMS,
    AUDIT_OUTCOME_LABELS,
    AUDIT_OUTCOME_TYPES,
    getAuditEventLabel,
    getAuditTarget
  } from '../../audit'
  import setting from '../../plugin'
  import { clearSettingsStore, settingsStore } from '../../store'
  import { getAccountClient } from '../../utils'
  import AuditEventDetails from './AuditEventDetails.svelte'
  import AuditIdentity from './AuditIdentity.svelte'

  const periodItems: DropdownIntlItem[] = [
    { id: '1', label: ui.string.Today },
    { id: '7', label: setting.string.Last7Days },
    { id: '30', label: setting.string.Last30Days },
    { id: 'custom', label: setting.string.CustomPeriod }
  ]
  const filterCategories: FilterCategory[] = [
    {
      id: 'event',
      label: setting.string.Event,
      searchable: true,
      options: AUDIT_EVENT_ITEMS.map((item) => ({
        id: String(item.id),
        label: item.label
      }))
    },
    {
      id: 'outcome',
      label: setting.string.Result,
      options: Object.entries(AUDIT_OUTCOME_LABELS).map(([id, label]) => ({ id, label }))
    }
  ]
  const owner = getCurrentAccount().role === AccountRole.Owner

  let events: WorkspaceAuditEvent[] = []
  let nextCursor: WorkspaceAuditPage['nextCursor']
  let period = '7'
  let filters: ActiveFilter[] = []
  let startDate: Date | null = null
  let endDate: Date | null = null
  let loading = owner
  let loadingMore = false
  let failed = false
  let denied = !owner
  let generation = 0
  let query: WorkspaceAuditQuery

  $: canClearFilters = period !== '7' || filters.length > 0

  function makeQuery (): WorkspaceAuditQuery {
    const now = new Date()
    const from = period === 'custom' && startDate !== null ? new Date(startDate) : new Date(now)
    from.setHours(0, 0, 0, 0)
    if (period !== 'custom') from.setDate(from.getDate() - (Number(period) - 1))
    const to = period === 'custom' && startDate !== null ? new Date(endDate ?? startDate) : new Date(now)
    to.setDate(to.getDate() + 1)
    to.setHours(0, 0, 0, 0)
    const event = filters.find((filter) => filter.categoryId === 'event')?.optionId
    const outcome = filters.find((filter) => filter.categoryId === 'outcome')?.optionId
    return {
      from: from.getTime(),
      to: to.getTime(),
      limit: 50,
      event,
      outcome: outcome === 'succeeded' || outcome === 'denied' || outcome === 'failed' ? outcome : undefined
    }
  }

  async function load (more = false): Promise<void> {
    if (!owner || denied || (more && (loading || loadingMore || nextCursor === undefined))) {
      return
    }
    const request = ++generation
    if (more) {
      loadingMore = true
    } else {
      loading = true
      loadingMore = false
      events = []
      nextCursor = undefined
      query = makeQuery()
      clearSettingsStore()
    }
    failed = false
    try {
      const page = await getAccountClient().getWorkspaceAuditEvents({ ...query, cursor: more ? nextCursor : undefined })
      if (request !== generation) return
      const seen = new Set(events.map((event) => event.eventId))
      events = more ? [...events, ...page.events.filter((event) => !seen.has(event.eventId))] : page.events
      nextCursor = page.nextCursor
    } catch (error) {
      if (request !== generation) return
      failed = true
      if (error instanceof PlatformError && error.status.code === platform.status.Forbidden) {
        denied = true
        events = []
        nextCursor = undefined
        clearSettingsStore()
      }
    } finally {
      if (request === generation) {
        loading = false
        loadingMore = false
      }
    }
  }

  function selectPeriod (value: string): void {
    if (value !== 'custom') {
      period = value
      void load()
      return
    }
    const previous = period
    period = 'custom'
    showPopup(
      RangeDatePopup,
      { startDate, endDate, label: setting.string.Period },
      'top',
      (result?: { startDate?: Date | null, endDate?: Date | null }) => {
        if (result?.startDate != null) {
          startDate = result.startDate
          endDate = result.endDate ?? null
          period = 'custom'
          void load()
        } else {
          period = previous
        }
      }
    )
  }

  function handlePeriodSelected (event: CustomEvent<unknown>): void {
    selectPeriod(String(event.detail))
  }

  function handleFiltersChanged (event: CustomEvent<ActiveFilter[]>): void {
    filters = event.detail
    void load()
  }

  function openEvent (event: WorkspaceAuditEvent): void {
    settingsStore.set({ id: event.eventId, component: AuditEventDetails, props: { event } })
  }

  function handleRowClick (event: CustomEvent<number>): void {
    const record = events[event.detail]
    if (record !== undefined) openEvent(record)
  }

  function refresh (): void {
    void load()
  }
  function retry (): void {
    void load(events.length > 0)
  }
  function loadNext (): void {
    void load(true)
  }
  function eventKey (index: number): string {
    return events[index].eventId
  }

  function clearFilters (): void {
    period = '7'
    filters = []
    startDate = null
    endDate = null
    void load()
  }

  onMount(() => {
    void load()
  })
  onDestroy(() => {
    generation++
    clearSettingsStore()
  })
</script>

<div class="hulyComponent audit-log" data-id="workspace-audit-log">
  <Header adaptive="disabled">
    <Breadcrumb icon={IconHistory} label={setting.string.AuditLog} size="large" isCurrent />
  </Header>
  <div class="hulyComponent-content__column">
    {#if denied}
      <div class="p-4"><Notice kind="warning" label={setting.string.AuditOwnerOnly} /></div>
    {:else}
      <div class="flex-col flex-gap-2 p-4">
        <div class="flex-row-center flex-wrap flex-gap-2">
          <DropdownLabelsIntl
            items={periodItems}
            selected={period}
            label={setting.string.Period}
            dataId="audit-period"
            on:selected={handlePeriodSelected}
          />
          <FilterButton
            categories={filterCategories}
            activeFilters={filters}
            size="small"
            on:change={handleFiltersChanged}
          />
          <div class="ml-auto">
            <Button
              icon={setting.icon.Reset}
              label={ui.string.Refresh}
              size="small"
              disabled={loading || loadingMore}
              dataId="audit-refresh"
              on:click={refresh}
            />
          </div>
        </div>
        {#if period === 'custom' && startDate !== null}
          <div class="text-sm content-dark-color flex-row-center flex-wrap flex-gap-2">
            <DatePresenter value={startDate.getTime()} />
            {#if endDate !== null}<span>–</span><DatePresenter value={endDate.getTime()} />{/if}
          </div>
        {/if}
      </div>
      <Scroller padding="0 var(--spacing-2)" bottomPadding="var(--spacing-2)">
        {#if loading}
          <Loading />
        {:else}
          {#if failed}
            <div class="flex-col flex-gap-2 p-4">
              <Notice kind="error" label={setting.string.AuditLoadFailed} />
              <Button label={ui.string.Retry} dataId="audit-retry" on:click={retry} />
            </div>
          {/if}
          {#if events.length > 0}
            <div class="audit-list">
              <InteractiveListView
                count={events.length}
                noScroll
                kind="full-size"
                updateOnMouse={false}
                selection={-1}
                getKey={eventKey}
                on:click={handleRowClick}
              >
                <svelte:fragment slot="header">
                  <div class="audit-columns audit-head">
                    <span class="audit-event"><Label label={setting.string.Event} /></span>
                    <span class="audit-identity"><Label label={setting.string.Actor} /></span>
                    <span class="audit-time"><Label label={setting.string.Time} /></span>
                    <span class="audit-result"><Label label={setting.string.Result} /></span>
                  </div>
                </svelte:fragment>
                <svelte:fragment slot="item" let:item>
                  {@const event = events[item]}
                  {@const target = getAuditTarget(event)}
                  <div class="audit-columns audit-row" class:selected={$settingsStore.id === event.eventId}>
                    <div class="audit-event flex-col flex-gap-1 min-w-0">
                      <button type="button" class="audit-title overflow-label" data-id="audit-event-details">
                        <Label label={getAuditEventLabel(event.event)} />
                        {#if getAuditEventLabel(event.event) === setting.string.UnknownEvent}
                          ({event.event}){/if}
                      </button>
                      {#if target}<span class="audit-target text-sm content-dark-color"
                          ><AuditIdentity account={target} /></span
                        >{/if}
                    </div>
                    <span class="audit-identity"
                      ><AuditIdentity account={event.actorAccountUuid} service={event.actorService} /></span
                    >
                    <span class="text-sm audit-time"><DateTimePresenter value={event.occurredAt} /></span>
                    <span class="audit-result"
                      ><StateTag
                        type={AUDIT_OUTCOME_TYPES[event.outcome]}
                        label={AUDIT_OUTCOME_LABELS[event.outcome]}
                      /></span
                    >
                  </div>
                </svelte:fragment>
              </InteractiveListView>
            </div>
            <div class="flex-col flex-gap-2 pt-4">
              {#if loadingMore}<Loading />
              {:else if nextCursor !== undefined}
                <Button label={ui.string.LoadMore} dataId="audit-load-more" on:click={loadNext} />
              {/if}
              <span class="text-sm content-dark-color"><Label label={setting.string.AuditEventsMayBeDelayed} /></span>
            </div>
          {:else if !failed}
            <SectionEmpty icon={IconHistory} label={setting.string.NoAuditEvents}>
              {#if canClearFilters}
                <div class="mt-2">
                  <Button label={view.string.ClearFilters} dataId="audit-clear-filters" on:click={clearFilters} />
                </div>
              {/if}
            </SectionEmpty>
          {/if}
        {/if}
      </Scroller>
    {/if}
  </div>
</div>

<style lang="scss">
  .audit-log {
    container-type: inline-size;
  }
  .audit-list {
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--medium-BorderRadius);
    overflow: hidden;
  }
  .audit-columns {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) 11rem 8rem;
    grid-template-areas: 'event actor time result';
    align-items: center;
    gap: var(--spacing-1_5);
  }
  .audit-head {
    padding: var(--spacing-1) var(--spacing-1_5);
    min-height: 2.5rem;
    color: var(--theme-caption-color);
    font-size: 0.6875rem;
    font-weight: 400;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    background-color: var(--theme-comp-header-color);
  }
  .audit-row {
    padding: var(--spacing-1) var(--spacing-1_5);
    border-top: 1px solid var(--theme-divider-color);
    cursor: pointer;

    &:hover,
    &:focus-within {
      background-color: var(--theme-button-hovered);
    }
    &.selected {
      background-color: var(--theme-popup-hover);
    }
  }
  .audit-time {
    grid-area: time;
    min-width: 0;
  }
  .audit-event {
    grid-area: event;
    min-width: 0;
  }
  .audit-title {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    text-align: left;
    cursor: inherit;
  }
  .audit-identity {
    grid-area: actor;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .audit-result {
    grid-area: result;
  }
  @container (max-width: 52rem) {
    .audit-columns {
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) 11rem;
      grid-template-areas: 'event actor time';
    }
    .audit-result {
      display: none;
    }
  }
  @container (max-width: 40rem) {
    .audit-columns {
      grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
      grid-template-areas: 'event actor';
    }
    .audit-time,
    .audit-target {
      display: none;
    }
  }
</style>
