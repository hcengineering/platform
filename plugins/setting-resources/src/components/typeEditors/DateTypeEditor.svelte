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
  import { DateRangeMode, TypeDate as DateType } from '@hcengineering/core'
  import { TypeDate } from '@hcengineering/model'
  import { Label, ListItem } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import setting from '../../plugin'
  import Dropdown from '@hcengineering/ui/src/components/Dropdown.svelte'
  import StringPresenter from '@hcengineering/view-resources/src/components/StringPresenter.svelte'

  export let type: DateType | undefined
  export let editable: boolean = true

  const dispatch = createEventDispatcher()
  const items: ListItem[] = [
    {
      _id: DateRangeMode.DATE,
      label: DateRangeMode.DATE
    },
    {
      _id: DateRangeMode.TIME,
      label: DateRangeMode.TIME
    },
    {
      _id: DateRangeMode.DATETIME,
      label: DateRangeMode.DATETIME
    }
  ]

  let selected = items.find((item) => item._id === type?.mode)

  onMount(() => {
    if (type === undefined) {
      dispatch('change', { type: TypeDate() })
    }
  })
</script>

<div class="flex-row-center">
  <Label label={setting.string.DateMode} />
  <div class="ml-2">
    {#if editable}
      <Dropdown
        {selected}
        {items}
        size="medium"
        placeholder={setting.string.DateMode}
        on:selected={(res) => {
          selected = res.detail
          dispatch('change', { type: TypeDate(res.detail._id) })
        }}
      />
    {:else}
      <StringPresenter value={selected?.label ?? ''} />
    {/if}
  </div>
</div>
