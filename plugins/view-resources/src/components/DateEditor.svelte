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
  import { TypeDate } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { DateRangePresenter } from '@hcengineering/ui'

  export let value: number | null | undefined
  export let type: TypeDate | undefined
  export let label: IntlString | undefined = undefined
  export let onChange: (value: any) => void
  export let kind: 'no-border' | 'link' | 'regular' = 'no-border'
  export let size: 'small' | 'medium' | 'large' = 'small'
  export let editable = true
</script>

<DateRangePresenter
  {value}
  labelNull={label}
  mode={type?.mode}
  noShift={!type?.withShift}
  {editable}
  {kind}
  {size}
  on:change={(res) => {
    if (res.detail !== undefined) onChange(res.detail)
  }}
/>
