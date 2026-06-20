<!--
// Copyright © 2022, 2023 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
-->
<script lang="ts">
  import { type Ref } from '@hcengineering/core'
  import chunter from '@hcengineering/chunter'
  import { type Document } from '@hcengineering/document'
  import { getClient } from '@hcengineering/presentation'
  import { jsonToMarkup } from '@hcengineering/text'
  import { markdownToMarkup } from '@hcengineering/text-markdown'
  import tracker, { type Issue, type IssueStatus } from '@hcengineering/tracker'
  import { Label, Scroller } from '@hcengineering/ui'

  import document from '../../plugin'

  export let doc: Ref<Document>

  const client = getClient()

  interface ReviewPacket {
    title?: string
    executive_summary?: string
    scores?: {
      seo?: number | null
      ai_citation?: number | null
    }
    publishing?: {
      slug?: string | null
      target_keyword?: string | null
      meta_description?: string | null
      word_count?: string | null
    }
    next_steps?: string[]
    claims?: string[]
  }

  interface ReviewContext {
    gate?: {
      issue_id?: string
      key?: string
      status_id?: string | null
      status_name?: string | null
      status_scope?: 'approval' | 'review'
    } | null
  }

  let packet: ReviewPacket | undefined
  let context: ReviewContext | undefined
  let loading = true
  let actionBusy = false
  let error: string | undefined
  let actionMessage: string | undefined
  let revisionCategory = 'creative_quality'
  let revisionNotes = ''
  let claimLines: string[] = []
  let evidenceLines: string[] = []
  let gateDecision: string | undefined
  let loadedDoc: Ref<Document> | undefined
  let loadVersion = 0

  $: if (doc !== undefined && doc !== loadedDoc) {
    void loadPacket(doc)
  }

  $: gateDecision = decisionLabel(context?.gate?.status_name)

  $: claimLines = (packet?.claims ?? [])
    .filter((claim) => !isEvidenceLine(claim))
    .map(formatReviewLine)
    .filter((claim) => claim.length > 0)

  $: evidenceLines = (packet?.claims ?? [])
    .filter(isEvidenceLine)
    .map(formatReviewLine)
    .filter((claim) => claim.length > 0)

  async function loadPacket (documentId: Ref<Document>): Promise<void> {
    loadedDoc = documentId
    const version = ++loadVersion
    loading = true
    error = undefined

    try {
      const base = reviewAdapterBase()
      const response = await fetch(`${base}/v1/review-packet?document_id=${encodeURIComponent(documentId)}`)
      if (!response.ok) {
        throw new Error(`Review packet unavailable (${response.status})`)
      }
      if (version !== loadVersion) return
      packet = await response.json()
      if (version !== loadVersion) return
      context = await loadContext(base, documentId)
    } catch (err: any) {
      if (version !== loadVersion) return
      packet = undefined
      context = undefined
      error = err?.message ?? 'Review packet unavailable'
    } finally {
      if (version === loadVersion) {
        loading = false
      }
    }
  }

  async function loadContext (base: string, documentId: Ref<Document>): Promise<ReviewContext | undefined> {
    const response = await fetch(`${base}/v1/review-context?document_id=${encodeURIComponent(documentId)}`)
    if (!response.ok) {
      return undefined
    }
    return await response.json()
  }

  function reviewAdapterBase (): string {
    return '/ndax-agent-review'
  }

  function scoreLabel (value: number | null | undefined): string {
    return value === undefined || value === null ? '--' : `${value}/100`
  }

  function valueOrDash (value: string | null | undefined): string {
    return value == null || value.trim() === '' ? 'Not specified' : value
  }

  function compactJsonLine (value: string): string {
    const trimmed = value.trim()
    if (!trimmed.startsWith('{')) {
      return value
    }
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.question !== undefined) {
        return `${parsed.question} — ${parsed.answer ?? ''}`
      }
      if (parsed.claim_text !== undefined) {
        return parsed.claim_text
      }
    } catch {
      return value
    }
    return value
  }

  function isEvidenceLine (value: string): boolean {
    return value.trim().startsWith('source:')
  }

  function formatReviewLine (value: string): string {
    const compact = compactJsonLine(value).replaceAll('**', '').trim()
    if (!isEvidenceLine(compact)) {
      return compact
    }

    const source = compact.match(/source_url='([^']+)'/)?.[1]
    const checked = compact.match(/date_checked=datetime\.date\((\d+),\s*(\d+),\s*(\d+)\)/)
    const checkedOn = checked !== null
      ? `${checked[1]}-${checked[2].padStart(2, '0')}-${checked[3].padStart(2, '0')}`
      : undefined

    return [source, checkedOn].filter(Boolean).join(' · ')
  }

  function statusId (name: 'approved' | 'changes'): string {
    return context?.gate?.status_scope === 'review'
      ? (name === 'approved' ? 'ndax:status:review:Reviewed' : 'ndax:status:review:ChangesRequested')
      : (name === 'approved' ? 'ndax:status:approval:Approved' : 'ndax:status:approval:ChangesRequested')
  }

  function decisionLabel (statusName: string | null | undefined): string | undefined {
    switch (statusName) {
      case 'Approved':
        return 'Approved'
      case 'Reviewed':
        return 'Reviewed'
      case 'Changes Requested':
        return 'Changes requested'
      case 'Rejected':
        return 'Rejected'
      default:
        return undefined
    }
  }

  async function postGateComment (markdown: string): Promise<void> {
    const issueId = context?.gate?.issue_id
    if (issueId === undefined) return
    const issue = await loadGateIssue(issueId)
    await client.addCollection(chunter.class.ChatMessage, issue.space, issue._id, issue._class, 'comments', {
      message: jsonToMarkup(markdownToMarkup(markdown)),
      attachments: 0
    })
  }

  async function loadGateIssue (issueId: string): Promise<Issue> {
    const issue = await client.findOne(tracker.class.Issue, { _id: issueId as Ref<Issue> })
    if (issue === undefined) {
      throw new Error(`Linked gate not found: ${context?.gate?.key ?? issueId}`)
    }
    return issue
  }

  async function setGateStatus (status: string): Promise<void> {
    const issueId = context?.gate?.issue_id
    if (issueId === undefined) return
    const issue = await loadGateIssue(issueId)
    const targetStatus = await client.findOne(tracker.class.IssueStatus, { _id: status as Ref<IssueStatus> })
    if (targetStatus === undefined) {
      throw new Error(`Gate status not found: ${status}`)
    }
    await client.update(issue, { status: targetStatus._id })
    context = await loadContext(reviewAdapterBase(), doc)
  }

  async function approve (): Promise<void> {
    if (context?.gate?.issue_id === undefined) return
    actionBusy = true
    actionMessage = undefined
    try {
      await postGateComment(`Approved from Agent Review panel.\n\nDocument: ${doc}`)
      await setGateStatus(statusId('approved'))
      actionMessage = 'Approval posted.'
    } catch (err: any) {
      actionMessage = err?.message ?? 'Approval failed.'
    } finally {
      actionBusy = false
    }
  }

  async function requestRevision (): Promise<void> {
    if (context?.gate?.issue_id === undefined) return
    if (revisionNotes.trim().length < 12) {
      actionMessage = 'Add specific revision notes before requesting changes.'
      return
    }
    actionBusy = true
    actionMessage = undefined
    try {
      await postGateComment([
        'Revision requested from Agent Review panel.',
        '',
        `Document: ${doc}`,
        `Category: ${revisionCategory}`,
        '',
        'Requested changes:',
        revisionNotes.trim()
      ].join('\n'))
      await setGateStatus(statusId('changes'))
      actionMessage = 'Revision request posted.'
      revisionNotes = ''
    } catch (err: any) {
      actionMessage = err?.message ?? 'Revision request failed.'
    } finally {
      actionBusy = false
    }
  }
</script>

<div class="h-full flex-col clear-mins">
  <div class="header">
    <div class="title"><Label label={document.string.AgentReview} /></div>
  </div>

  <div class="divider" />

  {#if loading}
    <div class="empty">Loading review packet...</div>
  {:else if error !== undefined}
    <div class="empty">{error}</div>
  {:else if packet !== undefined}
    <Scroller padding="1rem">
      <section class="section">
        <h3>Executive Summary</h3>
        <p>{valueOrDash(packet.executive_summary)}</p>
      </section>

      <section class="section">
        <h3>Readiness</h3>
        <div class="score-grid">
          <div class="score">
            <strong>{scoreLabel(packet.scores?.seo)}</strong>
            <span>SEO</span>
          </div>
          <div class="score">
            <strong>{scoreLabel(packet.scores?.ai_citation)}</strong>
            <span>AI citation</span>
          </div>
        </div>
      </section>

      <section class="section">
        <h3>Publishing</h3>
        <div class="field">
          <span>Slug</span>
          <strong>{valueOrDash(packet.publishing?.slug)}</strong>
        </div>
        <div class="field">
          <span>Target keyword</span>
          <strong>{valueOrDash(packet.publishing?.target_keyword)}</strong>
        </div>
        <div class="field">
          <span>Meta description</span>
          <strong>{valueOrDash(packet.publishing?.meta_description)}</strong>
        </div>
      </section>

      <section class="section">
        <h3>Claims & Evidence</h3>
        {#if claimLines.length > 0}
          <ul>
            {#each claimLines.slice(0, 5) as claim}
              <li>{claim}</li>
            {/each}
          </ul>
        {:else}
          <p class="muted">No claims found in this review packet.</p>
        {/if}

        {#if evidenceLines.length > 0}
          <h4>Evidence sources</h4>
          <ul class="evidence">
            {#each evidenceLines.slice(0, 6) as evidence}
              <li>{evidence}</li>
            {/each}
          </ul>
        {/if}
      </section>

      <section class="section">
        <h3>Next Steps</h3>
        {#if (packet.next_steps?.length ?? 0) > 0}
          <ol>
            {#each packet.next_steps ?? [] as step}
              <li>{compactJsonLine(step)}</li>
            {/each}
          </ol>
        {:else}
          <p class="muted">No next steps found.</p>
        {/if}
      </section>

      <section class="section">
        <h3>Review Actions</h3>
        {#if context?.gate?.issue_id !== undefined}
          <div class="field">
            <span>Linked gate</span>
            <strong>{context.gate.key ?? context.gate.issue_id}</strong>
          </div>
          {#if gateDecision !== undefined}
            <div class="decision">
              <span>Submitted decision</span>
              <strong>{gateDecision}</strong>
              <p>The review action for this gate has already been submitted. Further changes should be made by reopening the gate issue deliberately.</p>
            </div>
          {:else}
            <label>
              Revision category
              <select bind:value={revisionCategory} disabled={actionBusy}>
                <option value="creative_quality">Creative quality</option>
                <option value="brand">Brand</option>
                <option value="compliance">Compliance</option>
                <option value="seo">SEO / AI citation</option>
                <option value="channel_fit">Channel fit</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Requested changes
              <textarea
                bind:value={revisionNotes}
                disabled={actionBusy}
                placeholder="Tell the agent exactly what to revise before this can be approved."
              />
            </label>
            <div class="actions">
              <button class="primary" disabled={actionBusy} on:click={approve}>Approve</button>
              <button disabled={actionBusy} on:click={requestRevision}>Request Revision</button>
            </div>
          {/if}
          {#if actionMessage !== undefined}
            <p class="muted">{actionMessage}</p>
          {/if}
        {:else}
          <p class="muted">No linked approval gate was found for this document.</p>
        {/if}
      </section>
    </Scroller>
  {/if}
</div>

<style lang="scss">
  .header {
    display: flex;
    align-items: center;
    padding: 0 1.25rem;
    height: 3rem;
    min-height: 3rem;
    border-bottom: 1px solid var(--theme-divider-color);

    .title {
      flex-grow: 1;
      font-weight: 500;
      color: var(--caption-color);
      user-select: none;
    }
  }

  .empty {
    color: var(--theme-content-color);
    opacity: 0.8;
    padding: 1.25rem;
    text-align: center;
  }

  .section {
    border-bottom: 1px solid var(--theme-divider-color);
    padding: 0 0 1rem;
    margin: 0 0 1rem;

    h3 {
      margin: 0 0 0.65rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--caption-color);
    }

    p,
    li {
      color: var(--theme-content-color);
      font-size: 0.8125rem;
      line-height: 1.45;
    }

    ul,
    ol {
      padding-left: 1.1rem;
      margin: 0;
    }

    h4 {
      margin: 0.85rem 0 0.45rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--theme-caption-color);
    }
  }

  .score-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .score {
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.5rem;
    padding: 0.65rem;

    strong {
      display: block;
      font-size: 1rem;
      color: var(--theme-content-color);
    }

    span {
      display: block;
      margin-top: 0.2rem;
      color: var(--theme-caption-color);
      font-size: 0.75rem;
    }
  }

  .field {
    margin-bottom: 0.65rem;

    span {
      display: block;
      color: var(--theme-caption-color);
      font-size: 0.75rem;
      margin-bottom: 0.15rem;
    }

    strong {
      display: block;
      color: var(--theme-content-color);
      font-size: 0.8125rem;
      font-weight: 500;
      overflow-wrap: anywhere;
    }
  }

  label {
    display: grid;
    gap: 0.35rem;
    color: var(--theme-caption-color);
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 0.65rem;
  }

  select,
  textarea {
    width: 100%;
    min-width: 0;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.5rem;
    background: var(--theme-comp-header-color);
    color: var(--theme-content-color);
    font: inherit;
  }

  select {
    padding: 0.45rem 0.5rem;
  }

  textarea {
    min-height: 7.5rem;
    resize: vertical;
    padding: 0.55rem;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .decision {
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.5rem;
    padding: 0.65rem;
    background: var(--theme-comp-header-color);

    span {
      display: block;
      color: var(--theme-caption-color);
      font-size: 0.75rem;
      margin-bottom: 0.2rem;
    }

    strong {
      display: block;
      color: var(--theme-content-color);
      font-size: 0.875rem;
      margin-bottom: 0.35rem;
    }

    p {
      margin: 0;
    }
  }

  button {
    min-height: 2rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.5rem;
    background: var(--theme-comp-header-color);
    color: var(--theme-content-color);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
  }

  button.primary {
    background: var(--primary-button-default);
    border-color: var(--primary-button-default);
    color: var(--primary-button-color);
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .muted {
    opacity: 0.7;
  }

  .evidence li {
    color: var(--theme-caption-color);
    font-size: 0.75rem;
  }
</style>
