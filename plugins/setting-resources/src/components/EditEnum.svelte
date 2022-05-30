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
  import core, { Enum } from '@anticrm/core'
  import presentation, { Card, getClient } from '@anticrm/presentation'
  import { ActionIcon, EditBox, IconCheck, IconDelete } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import setting from '../plugin'

  export let value: Enum | undefined
  let name: string = value?.name ?? ''
  let values: string[] = value?.enumValues ?? []
  const client = getClient()
  const dispatch = createEventDispatcher()

  async function save (): Promise<void> {
    if (value === undefined) {
      await client.createDoc(core.class.Enum, core.space.Model, {
        name,
        enumValues: values
      })
    } else {
      await client.update(value, {
        name,
        enumValues: values
      })
    }
    dispatch('close')
  }

  function add () {
    if (newValue.trim().length === 0) return
    values.push(newValue)
    values = values
    newValue = ''
  }

  function remove (value: string) {
    values = values.filter((p) => p !== value)
  }

  let newValue = ''
</script>

<Card
  label={core.string.Enum}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={name.trim().length > 0 && values.length > 0}
  on:close={() => {
    dispatch('close')
  }}
>
  <div class="mb-2"><EditBox bind:value={name} placeholder={core.string.Name} maxWidth="13rem" /></div>
  <div class="flex-between mb-4">
    <EditBox
      placeholder={setting.string.NewValue}
      kind="large-style"
      bind:value={newValue}
      maxWidth="13rem"
    /><ActionIcon icon={IconCheck} label={presentation.string.Add} action={add} size={'small'} />
  </div>
  <div class="flex-row">
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
</Card>
