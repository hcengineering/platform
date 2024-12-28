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
  import { createEventDispatcher } from 'svelte'
  import { Label } from '@hcengineering/ui'
  import { TypedSpace, type Data, type Ref, type Permission } from '@hcengineering/core'
  import { type Employee, getCurrentEmployee } from '@hcengineering/contact'
  import documents, { type ControlledDocument } from '@hcengineering/controlled-documents'
  import { UserBoxItems, type PermissionsStore, permissionsStore } from '@hcengineering/contact-resources'

  export let controlledDoc: Data<ControlledDocument>
  export let space: Ref<TypedSpace>
  export let canChangeReviewers: boolean = true
  export let canChangeApprovers: boolean = true
  export let canChangeCoAuthors: boolean = true

  const dispatch = createEventDispatcher()
  const currentEmployee = getCurrentEmployee()

  $: reviewers = controlledDoc.reviewers
  $: approvers = controlledDoc.approvers
  $: coAuthors = controlledDoc.coAuthors

  $: permissionsSpace = space === documents.space.UnsortedTemplates ? documents.space.QualityDocuments : space

  function getPermittedPersons (
    permission: Ref<Permission>,
    space: Ref<TypedSpace>,
    permissionsStore: PermissionsStore
  ): Ref<Person>[] {
    return Array.from(permissionsStore.ap[space]?.[permission] ?? [])
  }

  $: permittedReviewers = getPermittedPersons(
    documents.permission.ReviewDocument,
    permissionsSpace,
    $permissionsStore
  )

  $: permittedApprovers = getPermittedPersons(
    documents.permission.ApproveDocument,
    permissionsSpace,
    $permissionsStore
  )

  $: permittedCoAuthors = getPermittedPersons(
    documents.permission.CoAuthorDocument,
    permissionsSpace,
    $permissionsStore
  ).filter((person) => person !== currentEmployee)

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
