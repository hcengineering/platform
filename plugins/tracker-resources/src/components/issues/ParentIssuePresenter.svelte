<!--
// Copyright © 2025 Andrey Sobolev (haiodo@gmail.com)
//

-->
<script lang="ts">
  import { Ref } from '@hcengineering/core'
  import { Issue } from '@hcengineering/tracker'
  import { createQuery } from '@hcengineering/presentation'
  import IssuePresenter from './IssuePresenter.svelte'
  import { translateCB } from '@hcengineering/platform'
  import { themeStore } from '@hcengineering/ui'
  import tracker from '../../plugin'

  export let value: Ref<Issue> | undefined
  export let object: Issue | undefined = undefined
  export let kind: 'list' | undefined = undefined
  export let disabled: boolean = false

  let queriedIssue: Issue | undefined

  const query = createQuery()

  // Only query if object not provided via prop
  $: if (object === undefined && value !== undefined && value !== null) {
    query.query(tracker.class.Issue, { _id: value }, (result) => {
      queriedIssue = result[0]
    })
  } else {
    query.unsubscribe()
    queriedIssue = undefined
  }

  // Use provided object or fallback to queried issue
  $: actualIssue = object ?? queriedIssue

  let label: string = ''

  $: if (actualIssue !== undefined) {
    label = actualIssue.identifier
  } else {
    translateCB(tracker.string.NoIssueTemplate, {}, $themeStore.language, (r) => {
      label = r
    })
  }
</script>

{#if actualIssue}
  <div class="flex-row-center">
    <IssuePresenter value={actualIssue} {kind} {disabled} shouldShowAvatar={true} on:accent-color />
    <span class="label overflow-label ml-2" title={actualIssue.title}>
      {actualIssue.title}
    </span>
  </div>
{:else}
  <span class="overflow-label" title={label}>
    {label}
  </span>
{/if}
