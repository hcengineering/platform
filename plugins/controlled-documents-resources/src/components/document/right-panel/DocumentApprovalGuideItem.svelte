<script lang="ts">
  import documents from '@hcengineering/controlled-documents'
  import { Label, Button, showPopup } from '@hcengineering/ui'

  import TeamPopup from '../../TeamPopup.svelte'
  import {
    $canSendForApproval as canSendForApproval,
    $controlledDocument as controlledDocument
  } from '../../../stores/editors/document'
  import documentsRes from '../../../plugin'
  import { TeamPopupData } from '../../../utils'

  function onSendDocRequest (): void {
    if ($controlledDocument == null) {
      return
    }

    const teamPopupData: TeamPopupData = {
      controlledDoc: $controlledDocument,
      requestClass: documents.class.DocumentApprovalRequest
    }

    showPopup(TeamPopup, teamPopupData, 'center')
  }
</script>

<div class="add-approval-message">
  <div class="message-title"><Label label={documentsRes.string.AddApprovalTitle} /></div>
  <div><Label label={documentsRes.string.AddApprovalDescription1} /></div>
  <ul>
    <li><Label label={documentsRes.string.AddApprovalDescription2} /></li>
    <li><Label label={documentsRes.string.AddApprovalDescription3} /></li>
    <li><Label label={documentsRes.string.AddApprovalDescription4} /></li>
  </ul>
</div>
<Button
  label={documentsRes.string.SendForApproval}
  disabled={!$canSendForApproval}
  kind="regular"
  size="medium"
  on:click={() => {
    onSendDocRequest()
  }}
/>

<style lang="scss">
  .add-approval-message {
    font-weight: 400;
    line-height: 1.25rem;
    margin-bottom: 1rem;

    ul {
      margin-block-start: 0.25rem;
      margin-block-end: 0;
      padding-inline-start: 1.5rem;
    }
  }

  .message-title {
    font-weight: 500;
    line-height: 1.25rem;
    margin-bottom: 1rem;
  }
</style>
