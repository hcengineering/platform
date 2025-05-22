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
  import { getCurrentEmployee, type Employee } from '@hcengineering/contact'
  import { UserBoxItems, getPermittedPersons, permissionsStore } from '@hcengineering/contact-resources'
  import documents, { type ControlledDocument } from '@hcengineering/controlled-documents'
  import { TypedSpace, type Data, type Ref } from '@hcengineering/core'
  import { Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let controlledDoc: Data<ControlledDocument>
  export let space: Ref<TypedSpace>
  export let canChangeReviewers: boolean = true
  export let canChangeApprovers: boolean = true
  export let canChangeCoAuthors: boolean = true
  export let reviewers: Ref<Employee>[] = controlledDoc?.reviewers ?? []
  export let approvers: Ref<Employee>[] = controlledDoc?.approvers ?? []
  export let coAuthors: Ref<Employee>[] = controlledDoc?.coAuthors ?? []

  const dispatch = createEventDispatcher()
  const currentEmployee = getCurrentEmployee()

  $: permissionsSpace = space === documents.space.UnsortedTemplates ? documents.space.QualityDocuments : space

  $: permittedReviewers = getPermittedPersons(
    documents.permission.ReviewDocument,
    permissionsSpace,
    $permissionsStore
  ) as Ref<Employee>[]

  $: permittedApprovers = getPermittedPersons(
    documents.permission.ApproveDocument,
    permissionsSpace,
    $permissionsStore
  ) as Ref<Employee>[]

  $: permittedCoAuthors = getPermittedPersons(
    documents.permission.CoAuthorDocument,
    permissionsSpace,
    $permissionsStore
  ).filter((person) => person !== currentEmployee) as Ref<Employee>[]

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
