<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { TypeDate } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { DatePopup, showPopup } from '@anticrm/ui'
  import DatePresenter from './DatePresenter.svelte'

  export let value: number | Date | undefined
  export let label: IntlString
  export let onChange: (value: any) => void

  export let attributeType: TypeDate | undefined

  $: date = value ? new Date(value) : new Date()
  let container: HTMLElement
  let opened: boolean = false
</script>

<div class="flex-row-center" bind:this={container}
  on:click|preventDefault={() => {
    if (!opened) {
      opened = true
      showPopup(DatePopup, { value: date, title: label, withTime: attributeType?.withTime ?? false }, container, (result) => {
        if (result) {
          value = result.getTime()
          onChange(value)
         }
        opened = false
      })
    }
  }} >
  <DatePresenter {value} {attributeType} />
</div>