<script lang="ts">
  import { slide } from 'svelte/transition'
  import documents, { DocumentRequest } from '@hcengineering/controlled-documents'
  import chunter from '@hcengineering/chunter'
  import { type Person } from '@hcengineering/contact'
  import { PersonRefPresenter } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Chevron, Label, tooltip } from '@hcengineering/ui'

  import { $documentSnapshots as documentSnapshots } from '../../../stores/editors/document'
  import documentsRes from '../../../plugin'
  import ApprovedIcon from '../../icons/Approved.svelte'
  import RejectedIcon from '../../icons/Rejected.svelte'
  import CancelledIcon from '../../icons/Cancelled.svelte'
  import WaitingIcon from '../../icons/Waiting.svelte'
  import SignatureInfo from './SignatureInfo.svelte'

  export let request: DocumentRequest
  export let initiallyExpanded: boolean = false

  interface PersonalApproval {
    person?: Ref<Person>
    approved: 'approved' | 'rejected' | 'cancelled' | 'waiting'
    timestamp?: number
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let expanded: boolean = initiallyExpanded

  let rejectingMessage: string | undefined
  let approvals: PersonalApproval[] = []

  $: void getRequestData(request)

  $: type = hierarchy.isDerived(request._class, documents.class.DocumentApprovalRequest)
    ? documents.string.Approval
    : documents.string.Review

  async function getRequestData (req: DocumentRequest): Promise<void> {
    if (req == null) {
      return
    }

    approvals = await getApprovals(req)
    const rejectingComment = await client.findOne(chunter.class.ChatMessage, {
      attachedTo: req?._id,
      attachedToClass: req?._class
    })
    rejectingMessage = rejectingComment?.message
  }

  async function getApprovals (
    req: DocumentRequest
  ): Promise<PersonalApproval[]> {
    const rejectedBy: PersonalApproval[] =
      req.rejected !== undefined
        ? [
            {
              person: req.rejected,
              approved: 'rejected',
              timestamp: req.modifiedOn
            }
          ]
        : []
    const approvedBy: PersonalApproval[] = req.approved.map((id, idx) => ({
      person: id,
      approved: 'approved',
      timestamp: req.approvedDates?.[idx] ?? req.modifiedOn
    }))
    const ignoredBy = req.requested
      .filter((p) => p !== req?.rejected)
      .filter((p) => !(req?.approved as string[]).includes(p))
      .map(
        (id): PersonalApproval => ({
          person: id,
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
        <PersonRefPresenter value={approver.person} avatarSize="x-small" />
        {#key approver.timestamp}
          <!-- For some reason tooltip is not interactive w/o remount -->
          <span
            use:tooltip={approver.timestamp !== undefined
              ? {
                  component: SignatureInfo,
                  props: {
                    id: approver.person,
                    timestamp: approver.timestamp
                  }
                }
              : undefined}
          >
            {#if approver.approved === 'approved'}
              <ApprovedIcon size="medium" fill={'var(--theme-docs-accepted-color)'} />
            {:else if approver.approved === 'rejected'}
              <RejectedIcon size="medium" fill={'var(--negative-button-default)'} />
            {:else if approver.approved === 'cancelled'}
              <CancelledIcon size="medium" />
            {:else if approver.approved === 'waiting'}
              <WaitingIcon size="medium" />
            {/if}
          </span>
        {/key}
      </div>
      {#if rejectingMessage !== undefined && approver.approved === 'rejected'}
        <div class="reject-message">{rejectingMessage}</div>
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
