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
  import { Ref, Timestamp } from '@hcengineering/core'
  import DatePresenter from './DatePresenter.svelte'
  import { Label, RangeDatePopup, SimpleDatePopup, showPopup } from '@hcengineering/ui'
  import view from '../../plugin'
  import { Filter, FilterMode } from '@hcengineering/view'

  export let filter: Filter
  export let onChange: (e: Filter) => void
  export let value: (Date | Timestamp | string)[]
  $: values = value.map((p) => new Date(p))

  $: checkValues(filter.mode)

  function checkValues (mode: Ref<FilterMode>) {
    if (mode !== view.filter.FilterDateBetween && filter.value.length !== 1) {
      showPicker()
    } else if (mode === view.filter.FilterDateBetween && filter.value.length !== 2) {
      showPicker()
    }
  }

  function showPicker () {
    if (filter.mode === view.filter.FilterDateBetween) {
      showPopup(
        RangeDatePopup,
        { label: filter.key.attribute.label, startDate: null, endDate: null },
        undefined,
        (res) => {
          if (res?.startDate) {
            const value: Date[] = [res.startDate]
            if (res.endDate && res.startDate !== res.endDate) {
              value.push(res.endDate)
            }
            filter.value = value
            onChange(filter)
          }
        }
      )
    } else {
      showPopup(SimpleDatePopup, { currentDate: null }, undefined, (res) => {
        if (res) {
          filter.value = [res]
          onChange(filter)
        }
      })
    }
  }
</script>

<div class="flex flex-gap-1">
  {#if values.length > 0}
    <DatePresenter value={values[0]} />
    {#if values.length > 1}
      <Label label={view.string.And} />
      <DatePresenter value={values[1]} />
    {/if}
  {/if}
</div>
