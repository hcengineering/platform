<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { createEventDispatcher } from 'svelte'
  import { DateRangeMode } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import ui from '../../plugin'
  import Label from '../Label.svelte'
  import DatePresenter from './DatePresenter.svelte'

  export let title: IntlString
  export let value: number | null | undefined = null
  export let withTime: boolean = false
  export let iconModifier: 'normal' | 'warning' | 'overdue' = 'normal'
  export let labelNull: IntlString = ui.string.NoDate

  const dispatch = createEventDispatcher()

  const changeValue = (result: any): void => {
    if (result.detail !== undefined) {
      value = result.detail
      dispatch('change', value)
    }
  }

  $: mode = withTime ? DateRangeMode.DATETIME : DateRangeMode.DATE
</script>

<div class="antiSelect antiWrapper cursor-default">
  <div class="flex-col">
    <span class="label mb-1"><Label label={title} /></span>
    <DatePresenter {value} {mode} {iconModifier} {labelNull} editable on:change={changeValue} />
  </div>
</div>
