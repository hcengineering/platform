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
  import type { Card as BoardCard } from '@anticrm/board'
  import board from '../../plugin'
  import task, { calcRank } from '@anticrm/task'
  import { AttachedData, generateId, Ref, SortingOrder, Space } from '@anticrm/core'
  import { IconAdd, Button } from '@anticrm/ui'
  import { getClient } from '@anticrm/presentation'
  import AddCardEditor from './AddCardEditor.svelte'

  export let space: Ref<Space>
  export let state: any

  const client = getClient()
  let newCardId = generateId() as Ref<BoardCard>

  async function addCard(title: string) {
    const sequence = await client.findOne(task.class.Sequence, { attachedTo: board.class.Card })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    const lastOne = await client.findOne(
      board.class.Card,
      { state: state._id },
      { sort: { rank: SortingOrder.Descending } }
    )
    const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

    const value: AttachedData<BoardCard> = {
      state: state._id,
      doneState: null,
      number: (incResult as any).object.sequence,
      title: title,
      rank: calcRank(lastOne, undefined),
      assignee: null,
      description: '',
      members: [],
      location: ''
    }

    await client.addCollection(board.class.Card, space, space, board.class.Board, 'cards', value, newCardId)

    newCardId = generateId() as Ref<BoardCard>
  }

  let isOpened = false

  const onClose = () => {
    isOpened = false
  }

  const onOpen = (e: any) => {
    isOpened = true
    e.preventDefault()
  }
</script>

<div class="flex-col step-tb75">
  {#if isOpened}
    <AddCardEditor {onClose} onAdd={addCard} />
  {:else}
    <Button
      icon={IconAdd}
      label={board.string.AddACard}
      kind="transparent"
      width={'100%'}
      justify={'left'}
      on:click={onOpen}
    />
  {/if}
</div>
