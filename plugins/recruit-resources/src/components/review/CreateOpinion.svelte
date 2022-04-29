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
  import type { Employee } from '@anticrm/contact'
  import { Account, generateId, Ref } from '@anticrm/core'
  import { OK, Status } from '@anticrm/platform'
  import { Card, getClient } from '@anticrm/presentation'
  import type { Opinion, Review } from '@anticrm/recruit'
  import task, { SpaceWithStates } from '@anticrm/task'
  import { StyledTextEditor } from '@anticrm/text-editor'
  import { EditBox, Grid, Label, Status as StatusControl } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../../plugin'

  export let space: Ref<SpaceWithStates>
  export let review: Ref<Review>
  export let assignee: Ref<Employee>

  const status: Status = OK

  const doc: Opinion = {
    number: 0,
    attachedTo: review,
    attachedToClass: recruit.class.Review,
    _class: recruit.class.Opinion,
    space: space,
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
  bind:space={doc.space}
  on:close={() => {
    dispatch('close')
  }}
>
  <StatusControl slot="error" {status} />
  <Grid column={1} rowGap={1.75}>
    <EditBox
      bind:value={doc.value}
      label={recruit.string.OpinionValue}
      placeholder={recruit.string.OpinionValuePlaceholder}
      focus
      maxWidth={'10rem'}
    />
    <div class="mt-1 mb-1">
      <Label label={recruit.string.Description} />:
    </div>
    <div class="description flex">
      <StyledTextEditor bind:content={doc.description} />
    </div>
  </Grid>
</Card>

<style lang="scss">
  .description {
    height: 10rem;
    padding: 0.5rem;
    border: 1px solid var(--theme-menu-divider);
    border-radius: 8px;
  }
</style>
