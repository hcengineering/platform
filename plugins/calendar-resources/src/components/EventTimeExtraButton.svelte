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
  import { Button, CheckBox, Icon, Label, MILLISECONDS_IN_MINUTE } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'
  import RRulePresenter from './RRulePresenter.svelte'

  export let allDay: boolean
  export let rules: RecurringRule[] = []
  export let noRepeat: boolean = false

  const dispatch = createEventDispatcher()

  const offsetTZ = new Date().getTimezoneOffset() * 60 * 1000
</script>

{#if !allDay && rules.length === 0}
  <div class="antiButton ghost x-small sh-round-sm text-11px pl-2 pr-2 pt-1 pb-1 mt-1 ml-5-5 gap-3 w-min">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="overflow-label cursor-pointer" on:click={() => (allDay = true)}>
      <Label label={calendar.string.AllDay} />
    </div>
    <div class="overflow-label cursor-default">
      <Label label={calendar.string.TimeZone} />
    </div>
    {#if !noRepeat}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="overflow-label cursor-pointer" on:click={() => dispatch('repeat')}>
        <Label label={calendar.string.Repeat} />
      </div>
    {/if}
  </div>
{:else}
  <div class="flex-row-center gap-1-5 mt-1">
    <CheckBox bind:checked={allDay} kind={'accented'} on:value={() => dispatch('allday')} />
    <Button
      label={calendar.string.AllDay}
      kind={'ghost'}
      padding={'0 .5rem'}
      shape={'round-sm'}
      justify={'left'}
      on:click={() => {
        allDay = !allDay
        dispatch('allday')
      }}
    />
  </div>
  <div class="flex-row-center gap-1-5 mt-1">
    <Icon icon={calendar.icon.Globe} size={'small'} fill={'var(--theme-dark-color)'} />
    <Button label={calendar.string.TimeZone} kind={'ghost'} padding={'0 .5rem'} shape={'round-sm'} justify={'left'}>
      <svelte:fragment slot="content">
        <span class="ml-2 content-darker-color">
          GMT{(offsetTZ > 0 ? '-' : '+') + Math.abs(offsetTZ / MILLISECONDS_IN_MINUTE / 60)}
        </span>
      </svelte:fragment>
    </Button>
  </div>
  {#if !noRepeat}
    <div class="flex-row-center gap-1-5 mt-1">
      <Icon icon={calendar.icon.Repeat} size={'small'} fill={'var(--theme-dark-color)'} />
      <Button
        label={rules.length > 0 ? undefined : calendar.string.Repeat}
        kind={'ghost'}
        padding={'0 .5rem'}
        shape={'round-sm'}
        justify={'left'}
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
