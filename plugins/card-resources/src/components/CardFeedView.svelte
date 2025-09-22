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
  import { Card, type MasterTag } from '@hcengineering/card'
  import core, { DocumentQuery, type Ref, SortingOrder } from '@hcengineering/core'
  import ui, { Label, Scroller, Loading } from '@hcengineering/ui'
  import card from '@hcengineering/card'

  import HomeCardPresenter from './FeedCardPresenter.svelte'
  import NewCardForm from './NewCardForm.svelte'

  const cardsQuery = createQuery()
  const limitStep = 50
  const client = getClient()

  export let _class: Ref<MasterTag> | undefined = undefined
  export let query: DocumentQuery<Card>

  let divScroll: HTMLDivElement
  let limit = limitStep
  let cards: Card[] = []
  let total = -1
  let isLoading = true
  let classQuery: Record<string, unknown> = {}

  // Get descendants for _class using model hierarchy
  $: if (_class !== undefined) {
    const hierarchy = client.getHierarchy()
    const descendants = hierarchy.getDescendants(_class)
    const allClasses = [_class, ...descendants]
    classQuery = allClasses.length > 1 ? { _class: { $in: allClasses } } : { _class }
  } else {
    classQuery = {}
  }

  $: resultQuery = { ...query, ...classQuery }
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
</script>

<Scroller bind:divScroll {onScroll} padding="2rem 4rem">
  <div class="home">
    <NewCardForm type={_class} />
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
