<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { RecurringRule } from '@hcengineering/calendar'
  import {
    Button,
    CheckBox,
    Icon,
    Label,
    TimeZone,
    TimeZonesPopup,
    convertTimeZone,
    eventToHTMLElement,
    getUserTimezone,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'
  import RRulePresenter from './RRulePresenter.svelte'
  import TimeZoneSelector from './TimeZoneSelector.svelte'

  export let allDay: boolean
  export let rules: RecurringRule[] = []
  export let noRepeat: boolean = false
  export let timeZone: string
  export let readOnly: boolean = false

  const myTimezone = getUserTimezone()

  const dispatch = createEventDispatcher()

  function showTimezoneSelector (e: MouseEvent) {
    const timeZones: TimeZone[] = []
    const tzs: string[] = []
    if (!Intl.supportedValuesOf) console.log('Your browser does not support Intl.supportedValuesOf().')
    else for (const timeZone of Intl.supportedValuesOf('timeZone')) tzs.push(timeZone)

    if (tzs.length > 0) tzs.forEach((tz) => timeZones.push(convertTimeZone(tz)))
    showPopup(
      TimeZonesPopup,
      {
        timeZones,
        withAdd: false,
        selected: timeZone,
        count: 1,
        reset: null
      },
      eventToHTMLElement(e),
      (result) => {
        if (result !== undefined) {
          timeZone = result
        }
      }
    )
  }
</script>

{#if !allDay && rules.length === 0 && myTimezone === timeZone}
  <div class="antiButton ghost x-small sh-no-shape text-11px pl-2 pr-2 pt-1 pb-1 mt-1 ml-5-5 gap-3 w-min">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="overflow-label cursor-pointer" on:click={() => (allDay = true)}>
      <Label label={calendar.string.AllDay} />
    </div>
    <div class="overflow-label cursor-default" on:click={showTimezoneSelector}>
      <Label label={calendar.string.TimeZone} />
    </div>
    {#if !noRepeat}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="overflow-label cursor-pointer" on:click={() => dispatch('repeat')}>
        <Label label={calendar.string.Repeat} />
      </div>
    {/if}
  </div>
{:else}
  <div class="flex-row-center gap-1-5 mt-1">
    <CheckBox bind:checked={allDay} kind={'primary'} on:value={() => dispatch('allday')} />
    <Button
      label={calendar.string.AllDay}
      kind={'ghost'}
      padding={'0 .5rem'}
      justify={'left'}
      disabled={readOnly}
      on:click={() => {
        allDay = !allDay
        dispatch('allday')
      }}
    />
  </div>
  <div class="flex-row-center gap-1-5 mt-1">
    <Icon icon={calendar.icon.Globe} size={'small'} fill={'var(--theme-dark-color)'} />
    <TimeZoneSelector bind:timeZone disabled={readOnly} />
  </div>
  {#if !noRepeat}
    <div class="flex-row-center gap-1-5 mt-1">
      <Icon icon={calendar.icon.Repeat} size={'small'} fill={'var(--theme-dark-color)'} />
      <Button
        label={rules.length > 0 ? undefined : calendar.string.Repeat}
        kind={'ghost'}
        padding={'0 .5rem'}
        justify={'left'}
        disabled={readOnly}
        on:click={() => dispatch('repeat')}
      >
        <svelte:fragment slot="content">
          {#if rules.length > 0}
            <RRulePresenter {rules} />
          {/if}
        </svelte:fragment>
      </Button>
    </div>
  {/if}
{/if}
