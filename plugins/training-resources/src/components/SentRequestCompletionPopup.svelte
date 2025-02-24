<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import contact, { type Employee } from '@hcengineering/contact'
  import { UserInfo } from '@hcengineering/contact-resources'
  import { type Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery, DocPopup } from '@hcengineering/presentation'
  import { StateTag, StateType } from '@hcengineering/ui'
  import type { TrainingRequest } from '@hcengineering/training'
  import {
    compareCompletionMapValueState,
    type CompletionMap,
    type CompletionMapValue,
    CompletionMapValueState
  } from '../utils'
  import TrainingRequestMaxAttemptsPresenter from './TrainingRequestMaxAttemptsPresenter.svelte'
  import training from '../plugin'

  export let request: TrainingRequest
  export let completionMap: CompletionMap

  const _class = contact.mixin.Employee
  const query = createQuery()
  let search: string = ''

  type Item = Employee & {
    completion: CompletionMapValue
  }
  let items: Array<Item> = []

  $: query.query<Employee>(
    _class,
    {
      _id: { $in: [...completionMap.keys()] },
      ...(search === '' ? {} : { name: { $like: `%${search}%` } })
    },
    (result) => {
      items = result
        .map((employee) => ({
          ...employee,
          _id: employee._id as Ref<Item>,
          completion: completionMap.get(employee._id) as CompletionMapValue
        }))
        .sort((item1, item2) => compareCompletionMapValueState(item1.completion.state, item2.completion.state))
    },
    {
      sort: {
        name: SortingOrder.Ascending
      }
    }
  )
</script>

<DocPopup
  _class={contact.mixin.Employee}
  groupBy="completion.state"
  objects={items}
  shadows={false}
  on:search={(e) => (search = e.detail)}
  closeAfterSelect={false}
  readonly
  width="full"
>
  <svelte:fragment slot="item" let:item>
    <div class="flex-row-center flex-gap-4">
      <div class="flex-grow overflow-label">
        <UserInfo size={'smaller'} value={item} />
      </div>
      <div>
        {#if item.completion.state === CompletionMapValueState.Passed}
          <StateTag type={StateType.Positive} label={training.string.IncomingRequestStatePassed} />
        {:else if item.completion.state === CompletionMapValueState.Failed}
          <StateTag type={StateType.Negative} label={training.string.IncomingRequestStateFailed} />
        {:else if item.completion.state === CompletionMapValueState.Draft}
          <StateTag type={StateType.Regular} label={training.string.IncomingRequestStateDraft} />
        {:else if item.completion.state === CompletionMapValueState.Pending}
          <StateTag type={StateType.Ghost} label={training.string.IncomingRequestStatePending} />
        {/if}
      </div>
      <div class="whitespace-nowrap">
        {item.completion.seqNumber ?? 0}/<TrainingRequestMaxAttemptsPresenter value={request.maxAttempts} />
      </div>
    </div>
  </svelte:fragment>
</DocPopup>
