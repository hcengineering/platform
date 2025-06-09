<!--
// Copyright © 2023 Hardcore Engineering Inc.
//
-->
<script lang="ts">
  import core, { PersonId, Ref, WithLookup, getCurrentAccount } from '@hcengineering/core'
  import { GithubPullRequest, GithubReviewComment, GithubReviewThread } from '@hcengineering/github'

  import { ActivityMessageHeader, ActivityMessageTemplate } from '@hcengineering/activity-resources'
  import { Person } from '@hcengineering/contact'
  import { EmployeePresenter, getPersonByPersonId, getPersonByPersonIdCb } from '@hcengineering/contact-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { ReferenceInput } from '@hcengineering/text-editor-resources'
  import { Button, Component, Label, PaletteColorIndexes, getPlatformColor, themeStore } from '@hcengineering/ui'
  import diffview from '@hcengineering/diffview'
  import github from '../../plugin'
  import ReviewCommentPresenter from './ReviewCommentPresenter.svelte'
  import { githubConfiguration } from '../../configuration'

  export let value: WithLookup<GithubReviewThread>
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

  const commentsQuery = createQuery()

  let comments: GithubReviewComment[] = []

  $: commentsQuery.query(
    github.class.GithubReviewComment,
    { attachedTo: value.attachedTo as Ref<GithubPullRequest>, reviewThreadId: value.threadId },
    (res) => {
      comments = res
    }
  )
  let expanded = !value.isResolved

  async function onMessage (event: CustomEvent<string>): Promise<void> {
    await getClient().addCollection(
      github.class.GithubReviewComment,
      value.space,
      value.attachedTo,
      value.attachedToClass,
      'reviewComments',
      {
        body: event.detail,
        diffHunk: '',
        includesCreatedEdit: false,
        isMinimized: false,
        line: 0,
        minimizedReason: null,
        originalLine: 0,
        originalStartLine: 0,
        outdated: false,
        path: value.path,
        reviewThreadId: value.threadId,
        reviewUrl: '',
        startLine: 0,
        url: ''
      }
    )
  }
  async function changeResolution (): Promise<void> {
    if (value.isResolved) {
      await getClient().update(value, { isResolved: false, resolvedBy: null })
    } else {
      await getClient().update(value, { isResolved: true, resolvedBy: getCurrentAccount().primarySocialId })
    }
  }

  const toRefPersonAccount = (account: PersonId): PersonId => account
  const toRefPerson = (account?: Ref<Person>): Ref<Person> => account as Ref<Person>
</script>

<div
  class:reviewUnresolved={!value.isResolved}
  style:border-color={!value.isResolved ? getPlatformColor(PaletteColorIndexes.Orange, $themeStore.dark) : undefined}
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
        label={getEmbeddedLabel('reviewed')}
      />
    </svelte:fragment>
    <svelte:fragment slot="content" let:readonly>
      <div class="file-content">
        {#if comments.length > 0}
          <Component
            is={diffview.component.InlineDiffView}
            props={{
              patch: comments?.[0]?.diffHunk ?? '',
              fileName: value.path,
              expandable: value.isResolved,
              expanded,
              onExpand: (value) => {
                expanded = value
              }
            }}
          />
        {/if}
        {#if expanded}
          <div class="ml-4">
            {#each comments as comment}
              <ReviewCommentPresenter {comment} />
            {/each}
          </div>
          {#if !readonly}
            <div class="ml-4 mr-4">
              <ReferenceInput showSend={true} showHeader showActions on:message={onMessage} />
            </div>
          {/if}
          <div class="p-2 flex-row-center flex-grow">
            {#if githubConfiguration.ResolveThreadSupported}
              <Button
                label={value.isResolved
                  ? getEmbeddedLabel('Unresolve conversation')
                  : getEmbeddedLabel('Resolve conversation')}
                on:click={changeResolution}
              />
            {/if}
            {#if value.isResolved && value.resolvedBy != null}
              {#await getPersonByPersonId(value.resolvedBy) then resolvePerson}
                {#if resolvePerson !== undefined}
                  <div class="flex-row-center ml-4">
                    <Label label={getEmbeddedLabel('resolved by')} />

                    <div class="content ml-2 clear-mins">
                      <div class="header clear-mins">
                        {#if resolvePerson}
                          <EmployeePresenter value={resolvePerson} shouldShowAvatar={true} />
                        {:else}
                          <div class="strong">
                            <Label label={core.string.System} />
                          </div>
                        {/if}
                      </div>
                    </div>
                  </div>
                {/if}
              {/await}
            {/if}
          </div>
        {/if}
      </div>
    </svelte:fragment>
  </ActivityMessageTemplate>
</div>

<style lang="scss">
  .reviewUnresolved {
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
  .file-content {
    border: 1px solid var(--theme-divider-color);
    border-top: 0;
    border-bottom-left-radius: 0.25rem;
    border-bottom-right-radius: 0.25rem;
    overflow-y: hidden;
  }
  .file-info {
    border-top: 1px solid var(--theme-divider-color);
    font-weight: 600;
    direction: rtl;
    text-align: left;
  }
</style>
