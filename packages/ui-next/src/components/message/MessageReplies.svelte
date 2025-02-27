<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { ticker, DAY, HOUR, MINUTE, languageStore } from '@hcengineering/ui'
  import { translateCB } from '@hcengineering/platform'

  import uiNext from '../../plugin'
  import Label from '../Label.svelte'

  export let count: number
  export let lastReply: Date

  let displayDate: string = ''

  $: formatDate($ticker, lastReply, $languageStore)

  function formatDate (now: number, date: Date, lang: string): void {
    const nowDate = new Date(now)
    let diff = now - date.getTime()
    if (diff < 0) diff = 0

    if (diff < MINUTE) {
      translateCB(uiNext.string.JustNow, {}, lang, (res) => {
        displayDate = res
      })
      return
    }

    if (diff < HOUR) {
      translateCB(uiNext.string.MinutesAgo, { minutes: Math.floor(diff / MINUTE) }, lang, (res) => {
        displayDate = res
      })
      return
    }

    if (diff < DAY) {
      translateCB(uiNext.string.HoursAgo, { hours: Math.floor(diff / HOUR) }, lang, (res) => {
        displayDate = res
      })
      return
    }

    const yesterday = new Date()
    yesterday.setDate(nowDate.getDate() - 1)

    if (date.toDateString() === yesterday.toDateString()) {
      const time = date.toLocaleString('default', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      })
      translateCB(uiNext.string.YesterdayAt, { time }, lang, (res) => {
        displayDate = res
      })
      return
    }

    const startOfWeek = new Date()
    startOfWeek.setDate(nowDate.getDate() - nowDate.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    if (date >= startOfWeek) {
      const weekday = date.toLocaleString('default', {
        weekday: 'long'
      })
      const time = date.toLocaleString('default', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      })

      translateCB(uiNext.string.WeekdayAt, { weekday, time }, lang, (res) => {
        displayDate = res
      })
    }

    const startOfYear = new Date(nowDate.getFullYear(), 0, 1, 0, 0, 0, 0)

    // Текущий год
    if (date >= startOfYear) {
      const month = date.toLocaleString('default', {
        month: 'short',
        day: '2-digit'
      })
      const time = date.toLocaleString('default', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      })

      translateCB(uiNext.string.MonthAt, { month, time }, lang, (res) => {
        displayDate = res
      })
    }

    const year = date.toLocaleString('default', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    })
    const time = date.toLocaleString('default', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    })

    translateCB(uiNext.string.YearAt, { year, time }, lang, (res) => {
      displayDate = res
    })
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="replies" on:click>
  <div class="replies__count">
    <Label label={uiNext.string.RepliesCount} params={{ replies: count }} />
  </div>

  <div class="replies__last-reply">
    <Label label={uiNext.string.LastReply} />
    {displayDate}
  </div>
</div>

<style lang="scss">
  .replies {
    display: flex;
    padding: 8px 4px;
    align-items: center;
    gap: 8px;
    flex: 1 0 0;
    border-radius: 8px;
    cursor: pointer;

    &:hover {
      background: var(--color-huly-off-white-5);
    }
  }

  .replies__count {
    color: var(--next-text-color-secondary);
    font-size: 12px;
    font-weight: 500;
  }

  .replies__last-reply {
    color: var(--next-text-color-tertiary);
    font-size: 12px;
    font-weight: 500;
  }
</style>
