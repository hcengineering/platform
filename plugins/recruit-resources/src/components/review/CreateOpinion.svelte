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
  import type { Person } from '@hcengineering/contact'
  import { Account, generateId, Ref } from '@hcengineering/core'
  import { OK, Status } from '@hcengineering/platform'
  import { Card, getClient } from '@hcengineering/presentation'
  import type { Opinion, Review } from '@hcengineering/recruit'
  import task, { SpaceWithStates } from '@hcengineering/task'
  import { StyledTextArea } from '@hcengineering/text-editor'
  import { EditBox, Status as StatusControl } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../../plugin'

  export let space: Ref<SpaceWithStates>
  export let review: Ref<Review>
  export let assignee: Ref<Person>

  const status: Status = OK

  const doc: Opinion = {
    number: 0,
    attachedTo: review,
    attachedToClass: recruit.class.Review,
    _class: recruit.class.Opinion,
    space,
    _id: generateId(),
    collection: 'reviews',
    modifiedOn: Date.now(),
    modifiedBy: '' as Ref<Account>,
    description: '',
    value: ''
  }

  const dispatch = createEventDispatcher()
  const client = getClient()

  export function canClose (): boolean {
    return review === undefined && assignee === undefined
  }

  async function createOpinion () {
    const sequence = await client.findOne(task.class.Sequence, { attachedTo: recruit.class.Review })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

    const reviewInstance = await client.findOne(recruit.class.Review, { _id: doc.attachedTo as Ref<Review> })
    if (reviewInstance === undefined) {
      throw new Error('contact not found')
    }

    await client.addCollection(
      recruit.class.Opinion,
      reviewInstance.space,
      doc.attachedTo,
      doc.attachedToClass,
      'opinions',
      {
        number: (incResult as any).object.sequence,
        description: doc.description,
        value: doc.value
      }
    )
  }
</script>

<Card
  label={recruit.string.CreateOpinion}
  okAction={createOpinion}
  canSave={(doc.value ?? '').trim().length > 0}
  gap={'gapV-4'}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <StatusControl slot="error" {status} />
  <EditBox
    bind:value={doc.value}
    label={recruit.string.OpinionValue}
    placeholder={recruit.string.OpinionValuePlaceholder}
    autoFocus
  />
  <StyledTextArea placeholder={recruit.string.Description} bind:content={doc.description} kind={'emphasized'} />
</Card>
