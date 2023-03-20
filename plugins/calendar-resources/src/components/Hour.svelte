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
  import { Event } from '@hcengineering/calendar'
  import { Ref } from '@hcengineering/core'
  import { areDatesEqual, getPlatformColorForText, showPanel, tooltip } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import EventPresenter from './EventPresenter.svelte'

  export let events: Event[]
  export let date: Date
  export let indexes: Map<Ref<Event>, number>
  export let wide: boolean = false

  const dispatch = createEventDispatcher()
  const padding = 0.25
  const width = wide ? 5 : 1

  function startCell (eDate: number, date: Date): boolean {
    const event = new Date(eDate)
    return areDatesEqual(event, date) && event.getHours() === date.getHours()
  }

  function endCell (eDate: number, date: Date): boolean {
    const event = new Date(eDate)
    return (
      areDatesEqual(event, date) &&
      (event.getHours() === date.getHours() || (event.getHours() === date.getHours() + 1 && event.getMinutes() === 0))
    )
  }

  function getTop (e: Event): string {
    return `${(new Date(e.date).getMinutes() / 60) * 100}%`
  }

  function getHeight (e: Event, date: Date): string {
    if (e.dueDate !== undefined && new Date(e.dueDate).getHours() === date.getHours()) {
      return `${(new Date(e.dueDate).getMinutes() / 60) * 100}%`
    }
    return '100%'
  }

  function getIndex (events: Event[], i: number): number {
    let targetIndex = indexes.get(events[i]._id) ?? 0
    for (let j = 0; j < i; j++) {
      const prev = indexes.get(events[j]._id)
      if (targetIndex === prev) {
        targetIndex++
      }
    }
    indexes.set(events[i]._id, targetIndex)
    indexes = indexes
    return targetIndex
  }

  function getShift (events: Event[], i: number): number {
    const index = getIndex(events, i)
    let total = 0
    for (let j = 0; j < index; j++) {
      total += width + padding
    }
    return total
  }

  function getStyle (events: Event[], i: number, date: Date): string {
    const e = events[i]
    let res = `background-color: ${getPlatformColorForText(e._class)};`
    res += `left: ${getShift(events, i)}rem;`
    if (startCell(e.date, date)) {
      res += ` top: ${getTop(e)};`
    }
    if (endCell(e.dueDate ?? e.date, date)) {
      res += ` height: ${getHeight(e, date)};`
    }
    return res
  }
</script>

<div
  class="cursor-pointer w-full h-full"
  on:click={() => {
    dispatch('create', date)
  }}
>
  {#if events.length > 0}
    <div class="flex flex-col h-full flex-grow relative">
      {#each events as e, i}
        <div
          use:tooltip={{
            component: EventPresenter,
            props: {
              value: e
            }
          }}
          class="overflow-label event"
          class:isStart={startCell(e.date, date)}
          class:isEnd={endCell(e.dueDate ?? e.date, date)}
          class:wide
          style={getStyle(events, i, date)}
          on:click|stopPropagation={() => {
            showPanel(view.component.EditDoc, e._id, e._class, 'content')
          }}
        >
          <div class="title">
            {e.title}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .event {
    position: absolute;
    padding: 0 0.5rem;
    height: 100%;
    border: 1px solid #00000033;
    width: 1rem;
    &.wide {
      width: 5rem;
      &.isStart {
        .title {
          visibility: visible;
        }
      }
    }

    .title {
      visibility: hidden;
    }

    &.isStart {
      border-top-left-radius: 0.5rem;
      border-top-right-radius: 0.5rem;
    }
    &.isEnd {
      border-bottom-left-radius: 0.5rem;
      border-bottom-right-radius: 0.5rem;
    }
  }
</style>
