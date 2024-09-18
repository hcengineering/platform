<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { IntlString } from '@hcengineering/platform'
  import { Button, DropdownLabelsIntl, IconBack, IconForward } from '@hcengineering/ui'

  import { CalendarMode } from '../index'
  import calendar from '../plugin'

  export let ddItems: {
    id: string | number
    label: IntlString
    mode: CalendarMode
    params?: Record<string, any>
  }[] = []
  export let mode: CalendarMode
  export let onToday: () => void
  export let onBack: () => void
  export let onForward: () => void
</script>

<div class="flex-row-center gap-2">
  {#if ddItems.length > 1}
    <DropdownLabelsIntl
      items={ddItems.map((it) => {
        return { id: it.id, label: it.label, params: it.params }
      })}
      size={'medium'}
      selected={ddItems.find((it) => it.mode === mode)?.id}
      on:selected={(e) => (mode = ddItems.find((it) => it.id === e.detail)?.mode ?? ddItems[0].mode)}
    />
  {/if}
  <Button label={calendar.string.Today} on:click={onToday} />
  <Button icon={IconBack} kind={'ghost'} on:click={onBack} />
  <Button icon={IconForward} kind={'ghost'} on:click={onForward} />
</div>
