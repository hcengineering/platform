<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->
<script lang="ts">
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Card } from '@hcengineering/card'
  import core, { SortingOrder } from '@hcengineering/core'
  import ui, {
    eventToHTMLElement,
    IconSettings,
    Label,
    ModernButton,
    ModernEditbox,
    Scroller,
    SearchInput,
    Loading,
    showPopup
  } from '@hcengineering/ui'
  import { FilterBar, FilterButton } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  import HomeCardPresenter from './HomeCardPresenter.svelte'
  import HomeSettings from './HomeSettings.svelte'
  import CreateCardPopup from './CreateCardPopup.svelte'
  import CardInput from './CardInput.svelte'
  import card from '../plugin'

  const cardsQuery = createQuery()
  const limitStep = 50

  const dispatch = createEventDispatcher()

  let divScroll: HTMLDivElement
  let limit = limitStep
  let cards: Card[] = []
  let total = -1
  let isLoading = true
  let search: string = ''

  $: searchQuery = search != null && search.trim() !== '' ? { $search: search } : {}
  $: resultQuery = { ...searchQuery }
  $: cardsQuery.query(
    card.class.Card,
    resultQuery,
    (res) => {
      cards = res
      total = res.total
      isLoading = false
    },
    {
      sort: { modifiedOn: SortingOrder.Descending },
      limit,
      total: true,
      lookup: {
        space: core.class.Space
      }
    }
  )

  $: hasNextPage = total > cards.length

  function onScroll (): void {
    if (divScroll != null && hasNextPage && !isLoading) {
      const isAtBottom = divScroll.scrollTop + divScroll.clientHeight >= divScroll.scrollHeight - 400
      if (isAtBottom) {
        isLoading = true
        limit += limitStep
      }
    }
  }

  function getFormatDateId (timestamp: number): string {
    const now = new Date()
    const date = new Date(timestamp)

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000

    const thisWeekStart = new Date(now)
    const day = thisWeekStart.getDay() === 0 ? 7 : thisWeekStart.getDay()

    thisWeekStart.setDate(thisWeekStart.getDate() - (day - 1))
    thisWeekStart.setHours(0, 0, 0, 0)

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const thisYearStart = new Date(now.getFullYear(), 0, 1).getTime()

    if (date.getTime() >= todayStart) {
      return 'today'
    } else if (date.getTime() >= yesterdayStart) {
      return 'yesterday'
    } else if (date.getTime() >= thisWeekStart.getTime()) {
      return 'thisWeek'
    } else if (date.getTime() >= thisMonthStart) {
      return 'thisMonth'
    } else if (date.getTime() >= thisYearStart) {
      return 'thisYear'
    } else {
      return date.getFullYear().toString()
    }
  }

  function onSettings (e: MouseEvent): void {
    showPopup(HomeSettings, {}, eventToHTMLElement(e))
  }

  function onShare (): void {
    showPopup(CreateCardPopup, { title, changeType: true }, 'center', async (result) => {
      if (result !== undefined) {
        const doc = await getClient().findOne(card.class.Card, { _id: result })
        if (doc === undefined) return
        dispatch('selectCard', doc)
      }
    })
    title = ''
  }

  let title: string = ''
</script>

<Scroller bind:divScroll {onScroll} padding="2rem 4rem">
  <div class="home">
    <div class="header flex-gap-2">
      <div class="header__title">
        <Label label={card.string.Home} />
      </div>
      <div class="flex flex-gap-2">
        <SearchInput bind:value={search} collapsed />
        <FilterButton _class={card.class.Card} />
        <div class="hulyHeader-divider" />
        <ModernButton icon={IconSettings} on:click={onSettings} size="small" iconSize="small" kind="tertiary" />
      </div>
    </div>
    <FilterBar
      _class={card.class.Card}
      query={searchQuery}
      space={undefined}
      on:change={({ detail }) => (resultQuery = detail)}
    />
    <CardInput />
    <div class="body flex-gap-2">
      {#each cards as card, index}
        {@const previousCard = cards[index - 1]}
        {@const currentDate = card.modifiedOn}
        {@const previousDate = previousCard?.modifiedOn}
        {@const currentDateId = getFormatDateId(currentDate)}
        {@const previousDateId = previousDate != null ? getFormatDateId(previousDate) : undefined}
        {#if currentDateId !== previousDateId}
          <div class="date">
            {#if currentDateId === 'today'}
              <Label label={ui.string.Today} />
            {:else if currentDateId === 'yesterday'}
              <Label label={ui.string.Yesterday} />
            {:else if currentDateId === 'thisWeek'}
              <Label label={ui.string.ThisWeek} />
            {:else if currentDateId === 'thisMonth'}
              <Label label={ui.string.ThisMonth} />
            {:else if currentDateId === 'thisYear'}
              <Label label={ui.string.ThisYear} />
            {:else}
              {currentDateId}
            {/if}
          </div>
        {/if}
        <HomeCardPresenter {card} />
      {/each}
      {#if isLoading}
        <div class="flex-center pb-2">
          <Loading />
        </div>
      {/if}
    </div>
  </div>
</Scroller>

<style lang="scss">
  .home {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
  }

  .create-card {
    display: flex;
    width: 100%;
    margin: 1rem 0;
  }

  .header {
    display: flex;
    width: 100%;
    padding: 1rem 0;
    justify-content: space-between;

    &__title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--global-primary-TextColor);
    }
  }

  .body {
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    flex: 1;
    width: 100%;
  }

  .date {
    display: flex;
    text-transform: uppercase;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--global-secondary-TextColor);
  }
</style>
