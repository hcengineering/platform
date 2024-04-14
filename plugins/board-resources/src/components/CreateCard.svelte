<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Board, Card as BoardCard } from '@hcengineering/board'
  import core, { AttachedData, Ref, SortingOrder, Space, generateId } from '@hcengineering/core'
  import { OK, Status } from '@hcengineering/platform'
  import { Card, SpaceSelector, createQuery, getClient } from '@hcengineering/presentation'
  import task, { TaskType, makeRank } from '@hcengineering/task'
  import { EditBox, Grid, Status as StatusControl } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import board from '../plugin'
  import { TaskKindSelector } from '@hcengineering/task-resources'

  export let space: Ref<Space>

  let _space = space
  const status: Status = OK

  let title: string = ''

  const dispatch = createEventDispatcher()
  const client = getClient()
  const cardId = generateId<BoardCard>()

  export function canClose (): boolean {
    return title !== ''
  }

  let kind: Ref<TaskType> | undefined = undefined

  async function createCard () {
    const sp = await client.findOne(board.class.Board, { _id: _space as Ref<Board> })
    if (sp === undefined) {
      throw new Error('Board not found')
    }
    const status = await client.findOne(
      core.class.Status,
      { space: sp.type },
      { sort: { rank: SortingOrder.Ascending } }
    )
    if (status === undefined) {
      throw new Error('Status not found')
    }
    if (kind === undefined) {
      throw new Error('kind is not specified')
    }
    const sequence = await client.findOne(task.class.Sequence, { attachedTo: board.class.Card })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    const lastOne = await client.findOne(board.class.Card, {}, { sort: { rank: SortingOrder.Descending } })
    const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

    const number = (incResult as any).object.sequence

    const value: AttachedData<BoardCard> = {
      status: status._id,
      number,
      title,
      kind,
      identifier: `CARD-${number}`,
      rank: makeRank(lastOne?.rank, undefined),
      assignee: null,
      description: '',
      members: [],
      location: '',
      startDate: null,
      dueDate: null
    }

    await client.addCollection(board.class.Card, _space, _space, board.class.Board, 'cards', value, cardId)
    dispatch('close')
  }

  let boards: Board[] = []
  const boardQuery = createQuery()
  boardQuery.query(board.class.Board, {}, (res) => {
    boards = res
  })

  $: currentBoard = boards.find((it) => it._id === _space)
</script>

<Card
  label={board.string.CreateCard}
  okAction={createCard}
  canSave={title.trim().length > 0}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector _class={board.class.Board} label={board.string.BoardName} bind:space={_space} />
    <TaskKindSelector projectType={currentBoard?.type} bind:value={kind} baseClass={board.class.Card} />
  </svelte:fragment>
  <StatusControl slot="error" {status} />
  <Grid column={1} rowGap={1.5}>
    <EditBox label={board.string.CardName} bind:value={title} placeholder={board.string.CardPlaceholder} autoFocus />
  </Grid>
</Card>
