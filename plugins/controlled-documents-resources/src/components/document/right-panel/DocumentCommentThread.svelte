<!--
//
// Copyright © 2023 Xored
//
-->
<script lang="ts">
  import documents, { DocumentComment } from '@hcengineering/controlled-documents'
  import { ThreadView } from '@hcengineering/chunter-resources'
  import { Button, IconCheckCircle, Label } from '@hcengineering/ui'
  import {
    $canAddDocumentCommentsFeedback as canAddDocumentCommentsFeedback,
    resolveCommentFx
  } from '../../../stores/editors/document'

  export let value: DocumentComment | undefined
  export let highlighted = false

  const handleResolveComment = async (): Promise<void> => {
    if (value === undefined) {
      return
    }

    await resolveCommentFx({ comment: value, resolved: !isResolved(value) })
  }

  $: resolved = isResolved(value)
  function isResolved (val: DocumentComment | undefined): boolean {
    return val?.resolved !== undefined && val.resolved
  }
</script>

{#if value !== undefined}
  <div class:highlighted class="root">
    <div class="header pt-2 pb-2 pl-4 pr-4 flex-between">
      <span class="overflow-label">
        {#if value?.index}
          <span data-id="commentId">#{value.index}</span>
          <span>•</span>
        {/if}
        <Label label={resolved ? documents.string.Resolved : documents.string.Pending} />
      </span>
      {#if $canAddDocumentCommentsFeedback}
        <div class="tools">
          <Button
            icon={resolved ? IconCheckCircle : documents.icon.CheckmarkCircle}
            iconProps={{ size: 'medium', fill: resolved ? 'var(--theme-docs-accepted-color)' : undefined }}
            kind="icon"
            showTooltip={{ label: resolved ? documents.string.Unresolve : documents.string.Resolve }}
            on:click={handleResolveComment}
          />
        </div>
      {/if}
    </div>
    <ThreadView _id={value._id} showHeader={false} />
  </div>
{/if}

<style lang="scss">
  .root {
    .tools {
      visibility: hidden;
    }

    &:hover {
      .tools {
        visibility: visible;
      }
    }
  }

  .header {
    font-size: 0.875rem;
    font-weight: 500;
  }
  .highlighted {
    background-color: var(--theme-docs-comment-highlighted-color);
  }
</style>
