<!--
// Copyright © 2023 Hardcore Engineering Inc.
//
-->
<script lang="ts">
  import { WithLookup } from '@hcengineering/core'
  import { GithubPullRequestReviewState, GithubReview } from '@hcengineering/github'

  import { ActivityMessageHeader, ActivityMessageTemplate } from '@hcengineering/activity-resources'
  import { getPersonByPersonIdCb } from '@hcengineering/contact-resources'
  import { IntlString } from '@hcengineering/platform'
  import { MessageViewer } from '@hcengineering/presentation'
  import { isEmptyMarkup } from '@hcengineering/text'
  import { PaletteColorIndexes, getPlatformColor, themeStore } from '@hcengineering/ui'
  import github from '../../plugin'
  import { Person } from '@hcengineering/contact'

  export let value: WithLookup<GithubReview>
  export let showNotify: boolean = false
  export let isHighlighted: boolean = false
  export let isSelected: boolean = false
  export let shouldScroll: boolean = false
  export let embedded: boolean = false
  export let onClick: (() => void) | undefined = undefined

  $: personId = value?.createdBy ?? value?.modifiedBy
  let person: Person | undefined
  $: if (personId !== undefined) {
    getPersonByPersonIdCb(personId, (p) => {
      person = p ?? undefined
    })
  } else {
    person = undefined
  }

  function getCommentFromState (value?: GithubPullRequestReviewState): {
    label: IntlString
    color?: number
  } {
    switch (value) {
      case GithubPullRequestReviewState.Approved:
        return { label: github.string.ReviewApproved, color: PaletteColorIndexes.Grass }
      case GithubPullRequestReviewState.ChangesRequested:
        return { label: github.string.ReviewChangesRequested, color: PaletteColorIndexes.Sunshine }
      case GithubPullRequestReviewState.Commented:
        return { label: github.string.ReviewCommented }
      case GithubPullRequestReviewState.Dismissed:
        return { label: github.string.ReviewDismissed, color: PaletteColorIndexes.Coin }
      case GithubPullRequestReviewState.Pending:
      default:
        return { label: github.string.ReviewPending }
    }
  }

  $: presentationState = getCommentFromState(value?.state)
</script>

{#if value?.state !== GithubPullRequestReviewState.Commented || (value?.state === GithubPullRequestReviewState.Commented && (value?.body?.length ?? 0) > 0 && !isEmptyMarkup(value?.body ?? ''))}
  <div
    class:review={presentationState.color !== undefined}
    style:border-color={presentationState.color !== undefined
      ? getPlatformColor(presentationState.color, $themeStore.dark)
      : undefined}
  >
    <ActivityMessageTemplate
      message={value}
      parentMessage={undefined}
      {person}
      {showNotify}
      {isHighlighted}
      {isSelected}
      {shouldScroll}
      {embedded}
      viewlet={undefined}
      {onClick}
    >
      <svelte:fragment slot="header">
        <ActivityMessageHeader
          message={value}
          {person}
          object={undefined}
          parentObject={undefined}
          isEdited={false}
          label={presentationState.label}
        />
      </svelte:fragment>
      <svelte:fragment slot="content">
        <div class="flex-row-center">
          <div class="customContent">
            <MessageViewer message={value.body} />
          </div>
        </div>
      </svelte:fragment>
    </ActivityMessageTemplate>
  </div>
{/if}

<style lang="scss">
  .review {
    border: 1px solid;
    border-radius: 0.5rem;
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
  }
  .customContent {
    display: flex;
    flex-wrap: wrap;
    column-gap: 0.625rem;
    row-gap: 0.625rem;
  }
</style>
