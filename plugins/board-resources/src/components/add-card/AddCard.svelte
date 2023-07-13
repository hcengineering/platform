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
  import type { Card as BoardCard } from '@hcengineering/board'
  import board from '../../plugin'
  import task, { calcRank } from '@hcengineering/task'
  import { AttachedData, generateId, Ref, SortingOrder, Space } from '@hcengineering/core'
  import { IconAdd, Button, showPopup } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import AddCardEditor from './AddCardEditor.svelte'
  import AddMultipleCardsPopup from './AddMultipleCardsPopup.svelte'

  export let space: Ref<Space>
  export let state: any

  let anchorRef: HTMLDivElement
  const client = getClient()

  async function addCard (title: string) {
    const newCardId = generateId() as Ref<BoardCard>

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

    return client.addCollection(board.class.Card, space, space, board.class.Board, 'cards', value, newCardId)
  }

  async function addCards (title: string, checkNewLine: boolean = false) {
    onClose()
    if (!checkNewLine) {
      return addCard(title.replace('\n', ' '))
    }

    const splittedTitle = title.split('\n')

    if (splittedTitle.length === 1) {
      return addCard(splittedTitle[0])
    }

    return new Promise<'single' | 'multiple' | 'close'>((resolve) => {
      const popupOpts = {
        onAddSingle: () => {
          popup.close()
          resolve('single')
        },
        onAddMultiple: () => {
          popup.close()
          resolve('multiple')
        },
        onClose: () => {
          popup.close()
          resolve('close')
        },
        cardsNumber: splittedTitle.length
      }

      const popup = showPopup(AddMultipleCardsPopup, popupOpts, anchorRef, () => resolve('close'))
    }).then((value) => {
      if (value === 'single' || value === 'close') {
        return addCard(title.replace('\n', ' ')).then((res) => {
          if (value === 'close') {
            onClose()
          }

          return [res]
        })
      }

      return Promise.all(splittedTitle.map((titlePart) => addCard(titlePart)))
    })
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
  <div bind:this={anchorRef} style:position="absolute" />
  {#if isOpened}
    <AddCardEditor {onClose} onAdd={addCards} />
  {:else}
    <Button
      icon={IconAdd}
      label={board.string.AddACard}
      kind="ghost"
      width={'100%'}
      justify={'left'}
      on:click={onOpen}
    />
  {/if}
</div>
