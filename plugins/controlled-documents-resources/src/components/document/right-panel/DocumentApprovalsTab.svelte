<script lang="ts">
  import documents, {
    ControlledDocumentState,
    DocumentRequest,
    DocumentState,
    emptyBundle,
    extractValidationWorkflow
  } from '@hcengineering/controlled-documents'

  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Label, Scroller } from '@hcengineering/ui'

  import chunter, { ChatMessage } from '@hcengineering/chunter'
  import { personRefByPersonIdStore } from '@hcengineering/contact-resources'
  import documentsRes from '../../../plugin'
  import {
    $controlledDocument as controlledDocument,
    $documentSnapshots as documentSnapshots
  } from '../../../stores/editors/document'
  import DocumentApprovalGuideItem from './DocumentApprovalGuideItem.svelte'
  import DocumentApprovalItem from './DocumentApprovalItem.svelte'
  import RightPanelTabHeader from './RightPanelTabHeader.svelte'

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let requests: DocumentRequest[] = []
  let messages: ChatMessage[] = []

  $: doc = $controlledDocument
  const requestQuery = createQuery()
  $: if (doc) {
    requestQuery.query(documents.class.DocumentRequest, { attachedTo: doc._id }, (r) => {
      requests = r
    })
  }

  const messageQuery = createQuery()
  $: if (doc) {
    messageQuery.query(chunter.class.ChatMessage, { attachedTo: { $in: requests.map((r) => r._id) } }, (r) => {
      messages = r
    })
  }

  $: workflow = extractValidationWorkflow(
    hierarchy,
    {
      ...emptyBundle(),
      ControlledDocument: doc ? [doc] : [],
      DocumentRequest: requests,
      DocumentSnapshot: $documentSnapshots,
      ChatMessage: messages
    },
    (ref) => $personRefByPersonIdStore.get(ref)
  )

  $: validationStates = ((doc ? workflow.get(doc._id) : []) ?? []).slice()

  const noGuideStates: (ControlledDocumentState | undefined)[] = [
    ControlledDocumentState.Approved,
    ControlledDocumentState.Rejected,
    ControlledDocumentState.InApproval
  ]
  $: hasGuide = doc && doc.state === DocumentState.Draft && !noGuideStates.includes(doc.controlledState)
</script>

<RightPanelTabHeader>
  <Label label={documentsRes.string.ValidationWorkflow} />
</RightPanelTabHeader>

<Scroller>
  {#if hasGuide}
    <div class="p-4 bottom-divider">
      <DocumentApprovalGuideItem />
    </div>
  {/if}
  {#if validationStates.length > 0}
    {#each validationStates as state, idx}
      <DocumentApprovalItem {state} initiallyExpanded={!hasGuide && idx === 0} />
    {/each}
  {/if}
  {#if !hasGuide && requests.length === 0}
    <div class="no-approvals-message"><Label label={documentsRes.string.NoApprovalsDescription} /></div>
  {/if}
</Scroller>

<style lang="scss">
  .no-approvals-message {
    opacity: 0.8;
    font-weight: 400;
    width: 100%;
    color: var(--theme-text-primary-color);
    padding: 1.5rem;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    text-align: center;
  }
</style>
