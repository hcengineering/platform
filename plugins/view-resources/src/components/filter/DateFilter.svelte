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
  import core, { Class, Doc, Ref, Space } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { RangeDatePopup, SelectPopup, SimpleDatePopup, showPopup } from '@hcengineering/ui'
  import { Filter, FilterMode } from '@hcengineering/view'
  import { createEventDispatcher, onMount } from 'svelte'
  import view from '../../plugin'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let filter: Filter
  export let onChange: (e: Filter) => void

  const isDate = filter.key.attribute.type._class === core.class.TypeDate

  filter.modes = isDate
    ? [
        view.filter.FilterDateOutdated,
        view.filter.FilterDateToday,
        view.filter.FilterDateYesterday,
        view.filter.FilterDateWeek,
        view.filter.FilterDateNextW,
        view.filter.FilterDateM,
        view.filter.FilterDateNextM,
        view.filter.FilterDateCustom,
        view.filter.FilterBefore,
        view.filter.FilterAfter,
        view.filter.FilterDateBetween,
        view.filter.FilterDateNotSpecified
      ]
    : [
        view.filter.FilterDateToday,
        view.filter.FilterDateYesterday,
        view.filter.FilterDateWeek,
        view.filter.FilterDateM,
        view.filter.FilterDateCustom,
        view.filter.FilterBefore,
        view.filter.FilterAfter,
        view.filter.FilterDateBetween
      ]
  filter.mode = filter.mode === undefined ? filter.modes[0] : filter.mode

  const client = getClient()

  const dispatch = createEventDispatcher()

  let modes: FilterMode[] = []

  client.findAll(view.class.FilterMode, { _id: { $in: filter.modes } }).then((res) => {
    modes = res
  })

  function showPicker () {
    if (filter.mode === view.filter.FilterDateBetween) {
      showPopup(
        RangeDatePopup,
        {
          label: filter.key.attribute.label,
          startDate: filter.value[0] ? new Date(filter.value[0]) : null,
          endDate: filter.value[1] ? new Date(filter.value[1]) : null
        },
        undefined,
        (res) => {
          if (res?.startDate) {
            const value: Date[] = [res.startDate]
            if (res.endDate && res.startDate !== res.endDate) {
              value.push(res.endDate)
            }
            filter.value = value
            onChange(filter)
            dispatch('close')
          }
        }
      )
    } else {
      showPopup(
        SimpleDatePopup,
        { currentDate: filter.value[0] ? new Date(filter.value[0]) : null },
        undefined,
        (res) => {
          if (res) {
            filter.value = [res]
            onChange(filter)
            dispatch('close')
          }
        }
      )
    }
  }

  onMount(() => {
    if (pickerFilters.includes(filter.mode)) {
      showPicker()
    }
  })

  const pickerFilters = [
    view.filter.FilterDateCustom,
    view.filter.FilterBefore,
    view.filter.FilterAfter,
    view.filter.FilterDateBetween
  ]
</script>

{#if !pickerFilters.includes(filter.mode)}
  <SelectPopup
    value={modes.map((it) => ({ ...it, id: it._id }))}
    on:close={(evt) => {
      if (evt.detail) {
        filter.mode = evt.detail
        if (pickerFilters.includes(filter.mode)) {
          showPicker()
        } else {
          onChange(filter)
          dispatch('close')
        }
      }
    }}
  />
{/if}
