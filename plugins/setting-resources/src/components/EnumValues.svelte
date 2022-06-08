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
  import { ActionIcon, EditBox, IconCheck, IconDelete } from '@anticrm/ui'
  import { getClient } from '@anticrm/presentation'
  import setting from '../plugin'

  export let value: Enum

  const client = getClient()

  let newValue = ''

  async function add () {
    if (newValue.trim().length === 0) return
    await client.update(value, {
      $push: { enumValues: newValue }
    })
    newValue = ''
  }

  async function remove (target: string) {
    await client.update(value, {
      $pull: { enumValues: target }
    })
  }
  const handleKeydown = (evt: KeyboardEvent) => {
    if (evt.key === 'Enter') {
      add()
    }
  }
</script>

<div class="flex-grow">
  <div class="flex-between mb-4">
    <EditBox
      placeholder={setting.string.NewValue}
      on:keydown={handleKeydown}
      kind="large-style"
      bind:value={newValue}
      maxWidth="18rem"
    />
    <ActionIcon icon={IconCheck} label={setting.string.Add} action={add} size={'small'} />
  </div>
  <div class="overflow-y-auto flex-row">
    {#each value.enumValues as value}
      <div class="flex-between mb-2">
        {value}
        <ActionIcon
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
