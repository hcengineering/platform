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
  import { AttachedData, Doc, Ref } from '@anticrm/core'
  import { generateId } from '@anticrm/core'
  import { OK, Status } from '@anticrm/platform'
  import { Card, getClient } from '@anticrm/presentation'
  import type { Category } from '@anticrm/inventory'
  import { EditBox, Grid, Status as StatusControl } from '@anticrm/ui'
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
  space={inventory.space.Category}
  canSave={name.length > 0}
  on:close={() => {
    dispatch('close')
  }}
>
  <StatusControl slot="error" {status} />
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={inventory.string.Category}
      bind:value={name}
      placeholder={inventory.string.Category}
      maxWidth={'16rem'}
      focus
    />
  </Grid>
</Card>
