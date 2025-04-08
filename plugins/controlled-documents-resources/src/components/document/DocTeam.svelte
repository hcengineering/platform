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
  import contact, { PersonAccount, type Employee } from '@hcengineering/contact'
  import { UserBoxItems } from '@hcengineering/contact-resources'
  import documents, { type ControlledDocument } from '@hcengineering/controlled-documents'
  import { getCurrentAccount, TypedSpace, type Data, type Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import { getPermittedAccounts, permissionsStore } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  export let controlledDoc: Data<ControlledDocument>
  export let space: Ref<TypedSpace>
  export let canChangeReviewers: boolean = true
  export let canChangeApprovers: boolean = true
  export let canChangeCoAuthors: boolean = true

  const dispatch = createEventDispatcher()
  const currentAccount = getCurrentAccount()

  $: reviewers = controlledDoc.reviewers
  $: approvers = controlledDoc.approvers
  $: coAuthors = controlledDoc.coAuthors

  $: permissionsSpace = space === documents.space.UnsortedTemplates ? documents.space.QualityDocuments : space

  let permittedReviewers: Array<Ref<Employee>> = []
  $: permittedReviewerAccounts = getPermittedAccounts(
    documents.permission.ReviewDocument,
    permissionsSpace,
    $permissionsStore
  )
  const prQuery = createQuery()
  $: if (permittedReviewerAccounts.length > 0) {
    prQuery.query(
      contact.class.PersonAccount,
      {
        _id: { $in: Array.from(permittedReviewerAccounts) as Array<Ref<PersonAccount>> }
      },
      (res) => {
        permittedReviewers = res.map((pa) => pa.person) as Array<Ref<Employee>>
      }
    )
  } else {
    permittedReviewers = []
  }

  let permittedApprovers: Array<Ref<Employee>> = []
  $: permittedApproverAccounts = getPermittedAccounts(
    documents.permission.ApproveDocument,
    permissionsSpace,
    $permissionsStore
  )
  const paQuery = createQuery()
  $: if (permittedApproverAccounts.length > 0) {
    paQuery.query(
      contact.class.PersonAccount,
      {
        _id: { $in: Array.from(permittedApproverAccounts) as Array<Ref<PersonAccount>> }
      },
      (res) => {
        permittedApprovers = res.map((pa) => pa.person) as Array<Ref<Employee>>
      }
    )
  } else {
    permittedApprovers = []
  }

  let permittedCoAuthors: Array<Ref<Employee>> = []
  $: permittedCoAuthorAccounts = getPermittedAccounts(
    documents.permission.CoAuthorDocument,
    permissionsSpace,
    $permissionsStore
  ).filter((acc) => acc !== currentAccount._id)
  const pcaQuery = createQuery()
  $: if (permittedCoAuthorAccounts.length > 0) {
    pcaQuery.query(
      contact.class.PersonAccount,
      {
        _id: { $in: Array.from(permittedCoAuthorAccounts) as Array<Ref<PersonAccount>> }
      },
      (res) => {
        permittedCoAuthors = res.map((pa) => pa.person) as Array<Ref<Employee>>
      }
    )
  } else {
    permittedCoAuthors = []
  }

  function handleUsersUpdated (type: 'reviewers' | 'approvers' | 'coAuthors', users: Ref<Employee>[]): void {
    dispatch('update', { type, users })
  }
</script>

<div class="flex-col">
  <div class="flex labelContainer">
    <div class="label mr-1">
      <Label label={documents.string.CoAuthors} />
    </div>
    {coAuthors?.length}
  </div>
  <div class="flex-col mt-4">
    <UserBoxItems
      items={coAuthors}
      docQuery={{
        active: true,
        _id: { $in: permittedCoAuthors }
      }}
      label={documents.string.CoAuthors}
      readonly={!canChangeCoAuthors}
      on:update={({ detail }) => {
        handleUsersUpdated('coAuthors', detail)
      }}
    />
  </div>
  <div class="mt-6 mb-6 divider" />
  <div class="flex labelContainer">
    <div class="label mr-1">
      <Label label={documents.string.Reviewers} />
    </div>
    {reviewers?.length}
  </div>
  <div class="flex-col mt-4">
    <UserBoxItems
      items={reviewers}
      docQuery={{
        active: true,
        _id: { $in: permittedReviewers }
      }}
      label={documents.string.Reviewers}
      readonly={!canChangeReviewers}
      on:update={({ detail }) => {
        handleUsersUpdated('reviewers', detail)
      }}
    />
  </div>
  <div class="mt-6 mb-6 divider" />
  <div class="flex labelContainer">
    <div class="label mr-1">
      <Label label={documents.string.Approvers} />
    </div>
    {approvers?.length}
  </div>
  <div class="flex-col mt-4">
    <UserBoxItems
      items={approvers}
      docQuery={{
        active: true,
        _id: { $in: permittedApprovers }
      }}
      label={documents.string.Approvers}
      readonly={!canChangeApprovers}
      on:update={({ detail }) => {
        handleUsersUpdated('approvers', detail)
      }}
    />
  </div>
</div>

<style lang="scss">
  .labelContainer {
    min-width: 11rem;
  }

  .label {
    color: var(--theme-qms-form-row-label-color);
    font-weight: 500;
  }

  .divider {
    height: 1px;
    width: 100%;
    min-height: 1px;
    background-color: var(--divider-color);
  }
</style>
