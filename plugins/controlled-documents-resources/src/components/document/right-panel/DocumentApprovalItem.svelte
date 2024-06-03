<script lang="ts">
  import { slide } from 'svelte/transition'
  import documents, { DocumentRequest } from '@hcengineering/controlled-documents'
  import chunter from '@hcengineering/chunter'
  import { PersonAccount } from '@hcengineering/contact'
  import { PersonAccountRefPresenter } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Chevron, Label } from '@hcengineering/ui'

  import { $documentSnapshots as documentSnapshots } from '../../../stores/editors/document'
  import documentsRes from '../../../plugin'
  import ApprovedIcon from '../../icons/Approved.svelte'
  import RejectedIcon from '../../icons/Rejected.svelte'
  import CancelledIcon from '../../icons/Cancelled.svelte'
  import WaitingIcon from '../../icons/Waiting.svelte'

  export let request: DocumentRequest
  export let initiallyExpanded: boolean = false

  interface PersonalApproval {
    account: Ref<PersonAccount>
    approved: 'approved' | 'rejected' | 'cancelled' | 'waiting'
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let expanded: boolean = initiallyExpanded

  let rejectingMessage: string | undefined
  let approvals: PersonalApproval[] = []

  $: if (request != null) {
    void getRequestData()
  }

  $: type = hierarchy.isDerived(request._class, documents.class.DocumentApprovalRequest)
    ? documents.string.Approval
    : documents.string.Review

  async function getRequestData (): Promise<void> {
    if (request !== undefined) {
      approvals = await getApprovals(request)
      const rejectingComment = await client.findOne(chunter.class.ChatMessage, {
        attachedTo: request?._id,
        attachedToClass: request?._class
      })
      rejectingMessage = rejectingComment?.message
    }
  }

  async function getApprovals (req: DocumentRequest): Promise<PersonalApproval[]> {
    const rejectedBy: PersonalApproval[] =
      req.rejected !== undefined
        ? [
            {
              account: req.rejected,
              approved: 'rejected'
            }
          ]
        : []
    const approvedBy: PersonalApproval[] = req.approved.map((id) => ({
      account: id,
      approved: 'approved'
    }))
    const ignoredBy = req.requested
      .filter((p) => p !== req?.rejected)
      .filter((p) => !(req?.approved as string[]).includes(p))
      .map(
        (id): PersonalApproval => ({
          account: id,
          approved: req?.rejected !== undefined ? 'cancelled' : 'waiting'
        })
      )
    return [...approvedBy, ...rejectedBy, ...ignoredBy]
  }

  $: snapshot = $documentSnapshots
    .toReversed()
    .find((s) => s.createdOn !== undefined && request.createdOn !== undefined && s.createdOn > request.createdOn)

  const dtf = new Intl.DateTimeFormat('default', {
    day: 'numeric',
    month: 'short'
  })
</script>

<button
  class:bottom-divider={!expanded}
  class="justify-start"
  on:click={() => {
    expanded = !expanded
  }}
>
  <div class="header flex-row-center flex-gap-1-5">
    <span class="title">
      {#if snapshot != null}
        {snapshot?.name}
      {:else}
        <Label label={documentsRes.string.CurrentVersion} />
      {/if}
    </span>
    <span>•</span>
    <span><Label label={type} /></span>
    <span>•</span>
    <span class="date">{dtf.format(request?.modifiedOn)}</span>
    <div class="chevron" class:visible={expanded}>
      <Chevron outline {expanded} size={'small'} />
    </div>
  </div>
</button>
{#if expanded}
  <div class="section" transition:slide|local>
    {#each approvals as approver}
      <div class="approver">
        <PersonAccountRefPresenter value={approver.account} avatarSize="x-small" />
        {#if approver.approved === 'approved'}
          <ApprovedIcon size="medium" fill={'var(--theme-docs-accepted-color)'} />
        {:else if approver.approved === 'rejected'}
          <RejectedIcon size="medium" fill={'var(--negative-button-default)'} />
        {:else if approver.approved === 'cancelled'}
          <CancelledIcon size="medium" />
        {:else if approver.approved === 'waiting'}
          <WaitingIcon size="medium" />
        {/if}
      </div>
      {#if rejectingMessage !== undefined && approver.approved === 'rejected'}
        <div class="reject-message">{@html rejectingMessage}</div>
      {/if}
    {/each}
  </div>
{/if}

<style lang="scss">
  button:hover {
    background-color: var(--theme-button-hovered);

    &:hover {
      .chevron {
        visibility: visible;
      }
    }
  }

  .header {
    font-size: 0.8125rem;
    font-weight: 500;
    padding: 0.75rem 1rem;
    color: var(--theme-text-primary-color);

    .title {
      margin: 0 0.125rem;
    }

    .date {
      font-weight: 400;
      font-size: 0.75rem;
      margin: 0 0.125rem;
      color: var(--theme-dark-color);
    }

    .chevron {
      margin-left: 0.25rem;
      visibility: hidden;

      &.visible {
        visibility: visible;
      }
    }
  }

  .section {
    color: var(--theme-text-primary-color);
    padding: 0.75rem 1rem 1rem 1rem;
    font-weight: 500;
    flex-shrink: 0;
    border-bottom: 1px solid var(--theme-divider-color);

    .reject-message {
      font-weight: 400;
      padding: 0.625rem 1rem 0 2rem;
    }
  }

  .approver {
    display: flex;
    align-items: center;
    justify-content: space-between;

    &:not(:first-child) {
      margin-top: 1rem;
    }
  }
</style>
