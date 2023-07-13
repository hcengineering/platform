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
  import type { Card as BoardCard } from '@hcengineering/board'
  import { AttachedData, generateId, Ref, SortingOrder, Space } from '@hcengineering/core'
  import { OK, Status } from '@hcengineering/platform'
  import { Card, getClient, SpaceSelector } from '@hcengineering/presentation'
  import task, { calcRank } from '@hcengineering/task'
  import { EditBox, Grid, Status as StatusControl } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import board from '../plugin'

  export let space: Ref<Space>

  let _space = space
  const status: Status = OK

  let title: string = ''

  const dispatch = createEventDispatcher()
  const client = getClient()
  const cardId = generateId() as Ref<BoardCard>

  export function canClose (): boolean {
    return title !== ''
  }

  async function createCard () {
    const state = await client.findOne(task.class.State, { space: _space })
    if (state === undefined) {
      throw new Error('create application: state not found')
    }
    const sequence = await client.findOne(task.class.Sequence, { attachedTo: board.class.Card })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    const lastOne = await client.findOne(board.class.Card, {}, { sort: { rank: SortingOrder.Descending } })
    const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

    const value: AttachedData<BoardCard> = {
      status: state._id,
      doneState: null,
      number: (incResult as any).object.sequence,
      title,
      rank: calcRank(lastOne, undefined),
      assignee: null,
      description: '',
      members: [],
      location: '',
      startDate: null,
      dueDate: null
    }

    await client.addCollection(board.class.Card, _space, space, board.class.Board, 'cards', value, cardId)
    dispatch('close')
  }
</script>

<Card
  label={board.string.CreateCard}
  okAction={createCard}
  canSave={title.length > 0}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector _class={board.class.Board} label={board.string.BoardName} bind:space={_space} />
  </svelte:fragment>
  <StatusControl slot="error" {status} />
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={board.string.CardName}
      bind:value={title}
      icon={board.icon.Card}
      placeholder={board.string.CardPlaceholder}
      autoFocus
    />
  </Grid>
</Card>
