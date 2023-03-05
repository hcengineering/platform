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
  import { fromTzDate, toTzDate, TzDate } from '@hcengineering/hr'

  // import { IntlString } from '@hcengineering/platform'
  import { DateRangePresenter } from '@hcengineering/ui'

  export let value: TzDate | null | undefined
  export let onChange: (value: TzDate | null | undefined) => void
  export let kind: 'no-border' | 'link' = 'no-border'
  export let noShift: boolean = false

  $: _value = value != null ? fromTzDate(value) : null
</script>

<DateRangePresenter
  value={_value}
  editable
  {kind}
  {noShift}
  on:change={(res) => {
    if (res.detail != null) {
      const dte = new Date(res.detail)
      const tzdte = {
        year: dte.getFullYear(),
        month: dte.getMonth(),
        day: dte.getDate(),
        offset: dte.getTimezoneOffset()
      }
      const tzd = toTzDate(new Date(_value ?? Date.now()))
      if (tzd.year !== tzdte.year || tzd.month !== tzdte.month || tzd.day !== tzdte.day) {
        onChange(tzdte)
      }
    }
  }}
/>
