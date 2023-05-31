<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { DocumentUpdate, Ref } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import { Opinion } from '@hcengineering/recruit'
  import { StyledTextArea } from '@hcengineering/text-editor'
  import { EditBox } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../../plugin'

  export let item: Opinion

  let value: string = ''
  let description: string = ''

  let _itemId: Ref<Opinion>

  $: if (_itemId !== item._id) {
    _itemId = item._id
    value = item.value
    description = item.description
  }

  const dispatch = createEventDispatcher()
  const client = getClient()

  export function canClose (): boolean {
    return true
  }

  async function editOpinion () {
    const ops: DocumentUpdate<Opinion> = {}
    if (item.value !== value) {
      ops.value = value
    }
    if (item.description !== description) {
      ops.description = description
    }

    if (Object.keys(ops).length === 0) {
      return
    }

    await client.update(item, ops)
  }
</script>

<Card
  label={recruit.string.Opinion}
  okAction={editOpinion}
  canSave={value.length > 0}
  gap={'gapV-4'}
  on:close={() => {
    dispatch('close')
  }}
  okLabel={recruit.string.OpinionSave}
  on:changeContent
>
  <EditBox
    label={recruit.string.OpinionValue}
    bind:value
    icon={recruit.icon.Application}
    placeholder={recruit.string.OpinionValue}
    autoFocus
  />
  <StyledTextArea placeholder={recruit.string.Description} bind:content={description} kind={'emphasized'} />
</Card>
