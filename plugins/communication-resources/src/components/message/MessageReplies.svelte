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
  import { ticker, DAY, HOUR, MINUTE, languageStore, Label } from '@hcengineering/ui'
  import { getCommunicationClient, getClient } from '@hcengineering/presentation'
  import { translateCB } from '@hcengineering/platform'
  import { Collaborator, CardID } from '@hcengineering/communication-types'
  import contact, { Person } from '@hcengineering/contact'
  import { Avatar } from '@hcengineering/contact-resources'

  import communication from '../../plugin'

  export let threadId: CardID
  export let count: number
  export let lastReply: Date

  const displayPersonsNumber = 4
  const communicationClient = getCommunicationClient()
  const client = getClient()

  let displayDate: string = ''
  let collaborators: Collaborator[] = []
  let persons: Person[] = []

  $: communicationClient.findCollaborators({ card: threadId }).then((res) => {
    collaborators = res
  })
  $: client
    .findAll(contact.class.Person, {
      personUuid: {
        $in: collaborators.map((it) => it.account).slice(0, displayPersonsNumber)
      }
    })
    .then((res) => {
      persons = res
    })

  $: formatDate($ticker, lastReply, $languageStore)

  function formatDate (now: number, date: Date, lang: string): void {
    const nowDate = new Date(now)
    let diff = now - date.getTime()
    if (diff < 0) diff = 0

    if (diff < MINUTE) {
      translateCB(communication.string.JustNow, {}, lang, (res) => {
        displayDate = res
      })
      return
    }

    if (diff < HOUR) {
      translateCB(communication.string.MinutesAgo, { minutes: Math.floor(diff / MINUTE) }, lang, (res) => {
        displayDate = res
      })
      return
    }

    if (diff < DAY) {
      translateCB(communication.string.HoursAgo, { hours: Math.floor(diff / HOUR) }, lang, (res) => {
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
      translateCB(communication.string.YesterdayAt, { time }, lang, (res) => {
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

      translateCB(communication.string.WeekdayAt, { weekday, time }, lang, (res) => {
        displayDate = res
      })
      return
    }

    const startOfYear = new Date(nowDate.getFullYear(), 0, 1, 0, 0, 0, 0)

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

      translateCB(communication.string.MonthAt, { month, time }, lang, (res) => {
        displayDate = res
      })
      return
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

    translateCB(communication.string.YearAt, { year, time }, lang, (res) => {
      displayDate = res
    })
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="replies" on:click>
  <div class="avatars">
    {#each persons as person}
      <Avatar size="card" {person} name={person.name} />
    {/each}
  </div>

  {#if collaborators.length > displayPersonsNumber}
    <div class="plus">
      +{collaborators.length - displayPersonsNumber}
    </div>
  {/if}

  <span class="text overflow-label">
    <span class="replies__count">
      <Label label={communication.string.RepliesCount} params={{ count }} />
    </span>
    {#if count > 0}
      <span class="replies__last-reply">
        <Label label={communication.string.LastReply} />
        <span class="lower">
          {displayDate}
        </span>
      </span>
    {/if}
  </span>
</div>

<style lang="scss">
  .replies {
    display: flex;
    padding: 0.5rem 0.5rem;
    align-items: center;
    gap: 0.5rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
    min-width: 0;

    &:hover {
      background-color: var(--theme-bg-color);
    }
  }

  .replies__count {
    color: var(--global-secondary-TextColor);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .text {
    flex: 1 1 auto;
  }

  .replies__last-reply {
    color: var(--global-tertiary-TextColor);
    font-size: 0.75rem;
    font-weight: 400;
  }

  .avatars {
    display: flex;
    gap: 0.25rem;
  }
</style>
