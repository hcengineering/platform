<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import { AttachedData, Doc, Ref } from '@hcengineering/core'
  import { generateId } from '@hcengineering/core'
  import { OK, Status } from '@hcengineering/platform'
  import { Card, getClient } from '@hcengineering/presentation'
  import type { Category } from '@hcengineering/inventory'
  import { EditBox, Button, Status as StatusControl } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import inventory from '../plugin'

  const status: Status = OK

  export let attachedTo: Ref<Doc> = inventory.global.Category

  let name: string = ''

  const dispatch = createEventDispatcher()
  const client = getClient()
  const inventoryId = generateId() as Ref<Category>

  export function canClose (): boolean {
    return name !== ''
  }

  async function create () {
    const value: AttachedData<Category> = {
      name
    }

    await client.addCollection(
      inventory.class.Category,
      inventory.space.Category,
      attachedTo,
      inventory.class.Category,
      'categories',
      value,
      inventoryId
    )
    dispatch('close')
  }
</script>

<Card
  label={inventory.string.CreateCategory}
  okAction={create}
  canSave={name.length > 0}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <StatusControl slot="error" {status} />
  <div class="flex-row-center clear-mins">
    <div class="mr-3">
      <Button focusIndex={1} icon={inventory.icon.Categories} size={'medium'} kind={'link-bordered'} noFocus />
    </div>
    <EditBox bind:value={name} placeholder={inventory.string.Category} kind={'large-style'} autoFocus />
  </div>
</Card>
