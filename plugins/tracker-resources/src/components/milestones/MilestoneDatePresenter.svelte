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
  import { Timestamp } from '@hcengineering/core'

  import { getClient } from '@hcengineering/presentation'
  import { Milestone } from '@hcengineering/tracker'
  import { DatePresenter, ButtonSize } from '@hcengineering/ui'

  export let value: Milestone
  export let field = 'targetDate'
  export let kind: 'ghost' | 'accented' | 'link' | 'list' = 'accented'
  export let size: ButtonSize | 'x-small' = 'small'

  const client = getClient()

  $: dateMs = (value as any)[field] as number

  const handleDateChanged = async (event: CustomEvent<Timestamp>) => {
    const newDate = event.detail

    if (newDate === undefined || dateMs === newDate) {
      return
    }

    await client.update(value, { [field]: newDate })
  }
</script>

<DatePresenter
  value={dateMs}
  editable={true}
  shouldShowLabel={true}
  iconModifier={'normal'}
  {kind}
  {size}
  on:change={handleDateChanged}
/>
