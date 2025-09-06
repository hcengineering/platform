<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { MasterTag, Tag } from '@hcengineering/card'
  import core from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import { EditBox } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import card from '../../plugin'

  export let masterTag: MasterTag | Tag

  let value: string = ''

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function handleSave (): Promise<void> {
    const _id = await client.addCollection(
      card.class.Role,
      core.space.Model,
      masterTag._id,
      masterTag._class,
      'roles',
      {
        name: value
      }
    )
    dispatch('close', _id)
  }
</script>

<Card okAction={handleSave} label={core.string.Role} on:close width={'menu'} canSave={value.trim().length > 0}>
  <EditBox bind:value placeholder={core.string.Role} />
</Card>
