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
  import { Enum } from '@anticrm/core'
  import { ActionIcon, Button, EditBox, IconAdd, IconDelete } from '@anticrm/ui'
  import presentation, { getClient } from '@anticrm/presentation'
  import setting from '../plugin'

  export let value: Enum

  const client = getClient()
  $: values = value.enumValues

  let newValue = ''

  function add () {
    if (newValue.trim().length === 0) return
    values.push(newValue)
    values = values
    newValue = ''
  }

  function remove (value: string) {
    values = values.filter((p) => p !== value)
  }

  async function save () {
    await client.update(value, {
      enumValues: values
    })
  }
</script>

<div class="flex-grow">
  <div class="flex-between mb-4">
    <EditBox placeholder={setting.string.NewValue} bind:value={newValue} maxWidth="20rem" /><ActionIcon
      label={presentation.string.Add}
      icon={IconAdd}
      action={add}
      size={'small'}
    />
  </div>
  <div class="overflow-y-auto flex-row">
    {#each values as value}
      <div class="flex-between mb-2">
        {value}<ActionIcon
          icon={IconDelete}
          label={setting.string.Delete}
          action={() => {
            remove(value)
          }}
          size={'small'}
        />
      </div>
    {/each}
  </div>
</div>
<div class="flex-row-reverse">
  <Button
    label={presentation.string.Save}
    kind={'primary'}
    on:click={() => {
      save()
    }}
  />
</div>
