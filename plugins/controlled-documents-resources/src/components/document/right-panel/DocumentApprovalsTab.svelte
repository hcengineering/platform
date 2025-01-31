<script lang="ts">
  import documents, {
    ControlledDocumentState,
    DocumentRequest,
    DocumentState
  } from '@hcengineering/controlled-documents'
  import { SortingOrder } from '@hcengineering/core'

  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Label, Scroller } from '@hcengineering/ui'

  import { $controlledDocument as controlledDocument } from '../../../stores/editors/document'
  import document from '../../../plugin'
  import RightPanelTabHeader from './RightPanelTabHeader.svelte'
  import DocumentApprovalItem from './DocumentApprovalItem.svelte'
  import DocumentApprovalGuideItem from './DocumentApprovalGuideItem.svelte'

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let requests: DocumentRequest[] = []
  let approvals: DocumentRequest[] = []

  $: approvals = requests.filter((p) => hierarchy.isDerived(p._class, documents.class.DocumentApprovalRequest))

  const query = createQuery()
  $: query.query(
    documents.class.DocumentRequest,
    {
      _class: {
        $in: [documents.class.DocumentApprovalRequest, documents.class.DocumentReviewRequest]
      },
      attachedTo: $controlledDocument?._id
    },
    (result) => {
      requests = result
    },
    {
      sort: { createdOn: SortingOrder.Descending }
    }
  )

  $: hasGuide =
    $controlledDocument?.state === DocumentState.Draft &&
    ($controlledDocument?.controlledState == null ||
      ![
        ControlledDocumentState.Approved,
        ControlledDocumentState.Rejected,
        ControlledDocumentState.InApproval
      ].includes($controlledDocument?.controlledState))
</script>

<RightPanelTabHeader>
  <Label label={document.string.ValidationWorkflow} />
</RightPanelTabHeader>

<Scroller>
  {#if hasGuide}
    <div class="p-4 bottom-divider">
      <DocumentApprovalGuideItem />
    </div>
  {/if}
  {#if requests.length > 0}
    {#each requests as object, idx}
      <DocumentApprovalItem request={object} initiallyExpanded={!hasGuide && idx === 0} />
    {/each}
  {/if}
  {#if !hasGuide && approvals.length === 0}
    <div class="no-approvals-message"><Label label={document.string.NoApprovalsDescription} /></div>
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
