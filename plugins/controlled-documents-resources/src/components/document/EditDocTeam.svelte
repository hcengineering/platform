<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Employee, Person } from '@hcengineering/contact'
  import {
    ControlledDocument,
    ControlledDocumentState,
    DocumentApprovalRequest,
    DocumentReviewRequest,
    DocumentState
  } from '@hcengineering/controlled-documents'
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Scroller } from '@hcengineering/ui'

  import DocTeam from './DocTeam.svelte'

  export let controlledDoc: ControlledDocument
  export let editable: boolean = true
  export let reviewRequest: DocumentReviewRequest | undefined
  export let approvalRequest: DocumentApprovalRequest | undefined

  $: controlledState = controlledDoc.controlledState ?? null

  $: isEditableDraft = editable && controlledDoc.state === DocumentState.Draft

  $: inCleanState = controlledState === null
  $: inReview = controlledState === ControlledDocumentState.InReview && reviewRequest !== undefined
  $: inApproval = controlledState === ControlledDocumentState.InApproval && approvalRequest !== undefined
  $: isReviewed = controlledState === ControlledDocumentState.Reviewed

  $: canChangeCoAuthors = isEditableDraft && inCleanState
  $: canChangeReviewers = isEditableDraft && (inCleanState || inReview)
  $: canChangeApprovers = isEditableDraft && (inCleanState || inApproval || inReview || isReviewed)

  $: reviewers = (reviewRequest?.requested as Ref<Employee>[]) ?? controlledDoc.reviewers
  $: approvers = (reviewRequest?.requested as Ref<Employee>[]) ?? controlledDoc.approvers
  $: coAuthors = controlledDoc.coAuthors

  const client = getClient()

  async function handleUpdate ({
    detail
  }: {
    detail: { type: 'reviewers' | 'approvers', users: Ref<Person>[] }
  }): Promise<void> {
    const { type, users } = detail

    const request = detail.type === 'reviewers' ? reviewRequest : approvalRequest

    const ops = client.apply()

    if (request?._id !== undefined) {
      const requested = request.requested?.slice() ?? []
      const requestedSet = new Set<Ref<Person>>(requested)

      const addedPersons = new Set<Ref<Person>>()
      const removedPersons = new Set<Ref<Person>>(requested)

      for (const u of users) {
        if (requestedSet.has(u)) {
          removedPersons.delete(u)
        } else {
          addedPersons.add(u)
        }
      }

      const approved = request.approved?.slice() ?? []
      const approvedDates = request.approvedDates?.slice() ?? []

      for (const u of removedPersons) {
        const idx = approved.indexOf(u)
        if (idx === -1) continue
        approved.splice(idx, 1)
        approvedDates.splice(idx, 1)
      }

      const requiredApprovesCount = users.length

      await ops.update(request, {
        requested: users,
        approved,
        approvedDates,
        requiredApprovesCount
      })
    }

    await ops.update(controlledDoc, { [type]: users })
    await ops.commit()
  }
</script>

{#if controlledDoc}
  <Scroller>
    <div class="content">
      <DocTeam
        space={controlledDoc.space}
        {controlledDoc}
        {canChangeCoAuthors}
        {canChangeReviewers}
        {canChangeApprovers}
        {reviewers}
        {approvers}
        {coAuthors}
        on:update={handleUpdate}
      />
    </div>
  </Scroller>
{/if}

<style lang="scss">
  .content {
    padding: 1.5rem 3.25rem;
  }
</style>
