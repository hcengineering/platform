<!--
//
// Copyright © 2023 Hardcore Engineering Inc.
//
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { RequestStatus } from '@hcengineering/request'
  import { Label, ModernDialog } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { Employee } from '@hcengineering/contact'
  import { Class, Ref } from '@hcengineering/core'
  import { UserBoxItems, permissionsStore } from '@hcengineering/contact-resources'
  import documents, {
    ControlledDocument,
    ControlledDocumentState,
    DocumentRequest
  } from '@hcengineering/controlled-documents'

  import documentsRes from '../plugin'
  import { sendApprovalRequest, sendReviewRequest } from '../utils'

  export let controlledDoc: ControlledDocument
  export let requestClass: Ref<Class<DocumentRequest>>
  export let readonly: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  const isReviewRequest = hierarchy.isDerived(requestClass, documentsRes.class.DocumentReviewRequest)

  const docField: keyof ControlledDocument = isReviewRequest ? 'reviewers' : 'approvers'
  const label = isReviewRequest ? documentsRes.string.SelectReviewers : documentsRes.string.SelectApprovers
  const sendRequestFunc = isReviewRequest ? sendReviewRequest : sendApprovalRequest
  const permissionId = isReviewRequest ? documents.permission.ReviewDocument : documents.permission.ApproveDocument
  $: permissionsSpace =
    controlledDoc.space === documents.space.UnsortedTemplates ? documents.space.QualityDocuments : controlledDoc.space
  $: permittedPeople = $permissionsStore.ap[permissionsSpace]?.[permissionId] ?? new Set()

  let docRequest: DocumentRequest | undefined
  let loading = true
  void client
    .findOne(requestClass, {
      attachedTo: controlledDoc._id,
      status: RequestStatus.Active
    })
    .then((res) => {
      loading = false
      docRequest = res
    })

  let users: Ref<Employee>[] = controlledDoc[docField] ?? []

  async function submit (): Promise<void> {
    loading = true

    await sendRequestFunc?.(client, controlledDoc, users)

    loading = false

    dispatch('close')
  }

  $: canSubmit = docRequest === undefined && users.length > 0
</script>

<ModernDialog {loading} {label} {canSubmit} on:submit={submit} on:close>
  <div class="flex-col pt-2">
    <div class="flex">
      <div class="flex labelContainer">
        <div class="label mr-1">
          <Label label={isReviewRequest ? documentsRes.string.Reviewers : documentsRes.string.Approvers} />
        </div>
        {users?.length}
      </div>
      <div class="flex-col">
        <UserBoxItems
          items={users}
          label={isReviewRequest ? documentsRes.string.Reviewers : documentsRes.string.Approvers}
          readonly={controlledDoc.controlledState === ControlledDocumentState.InReview ||
            controlledDoc.controlledState === ControlledDocumentState.InApproval ||
            readonly}
          docQuery={{
            active: true,
            _id: { $in: permittedPeople }
          }}
          on:update={({ detail }) => (users = detail)}
        />
      </div>
    </div>
  </div>
</ModernDialog>

<style lang="scss">
  .labelContainer {
    min-width: 11rem;
  }

  .label {
    color: var(--theme-qms-form-row-label-color);
    font-weight: 500;
  }
</style>
