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
  import { DropdownIntlItem, DropdownLabelsIntl, Label } from '@hcengineering/ui'
  import calendar from '../plugin'
  import { SetPosRules } from '../types'

  export let setPos: SetPosRules
  export let disabled: boolean

  const setPosItems: DropdownIntlItem[] = [
    {
      id: 1,
      label: calendar.string.First
    },
    {
      id: 2,
      label: calendar.string.Second
    },
    {
      id: 3,
      label: calendar.string.Third
    },
    {
      id: 4,
      label: calendar.string.Fourth
    },
    {
      id: 5,
      label: calendar.string.Fifth
    },
    {
      id: -2,
      label: calendar.string.NextToLast
    },
    {
      id: -1,
      label: calendar.string.Last
    }
  ]

  const byDayItems = [
    {
      id: 'SU',
      label: calendar.string.MondayShort
    },
    {
      id: 'MO',
      label: calendar.string.TuesdayShort
    },
    {
      id: 'TU',
      label: calendar.string.WednesdayShort
    },
    {
      id: 'WE',
      label: calendar.string.ThursdayShort
    },
    {
      id: 'TH',
      label: calendar.string.FridayShort
    },
    {
      id: 'FR',
      label: calendar.string.SaturdayShort
    },
    {
      id: 'SA',
      label: calendar.string.SundayShort
    },
    {
      id: 'SU,MO,TU,WE,TH,FR,SA',
      label: calendar.string.ModeDay
    },
    {
      id: 'MO,TU,WE,TH,FR',
      label: calendar.string.Weekday
    },
    {
      id: 'SU,SA',
      label: calendar.string.WeekendDay
    }
  ]

  $: selectedByDay = byDayItems.find((p) => p.id === setPos.byDay.join(','))?.id ?? 'SU,MO,TU,WE,TH,FR,SA'

  function byDaySelect (e: CustomEvent<string | undefined>) {
    const val = e.detail
    if (val !== undefined) {
      setPos.byDay = val.split(',')
    }
  }
</script>

<div class="flex-row-center flex-gap-2">
  <DropdownLabelsIntl
    items={setPosItems}
    {disabled}
    selected={setPos.bySetPos[0] ?? 1}
    on:selected={(e) => {
      if (e.detail !== undefined) {
        setPos.bySetPos = [e.detail]
      }
    }}
  />
  <DropdownLabelsIntl items={byDayItems} {disabled} selected={selectedByDay} on:selected={byDaySelect} />
</div>
