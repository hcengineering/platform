<!--
// Copyright © 2023 Hardcore Engineering Inc.
//
-->
<script lang="ts">
  import { PersonAccount } from '@hcengineering/contact'
  import { getCurrentAccount } from '@hcengineering/core'
  import { createQuery, getClient, getFileUrl } from '@hcengineering/presentation'
  import { Button, Chevron, Component, ExpandCollapse, Label } from '@hcengineering/ui'
  import diffview from '@hcengineering/diffview'
  import { GithubPatch, GithubPullRequest, GithubPullRequestReview } from '@hcengineering/github'

  import github from '../plugin'

  export let pullRequest: GithubPullRequest

  const me = getCurrentAccount() as PersonAccount

  let isCollapsed = true

  let patch: GithubPatch | undefined

  const patchQuery = createQuery()

  $: patchQuery.query(github.class.GithubPatch, { attachedTo: pullRequest._id }, (res) => {
    ;[patch] = res
  })

  let patchText: string = ''

  $: if (patch !== undefined) {
    void fetch(getFileUrl(patch.file, patch.name))
      .then((data) => data.text())
      .then((text) => {
        patchText = text
      })
  }

  $: hasPatch = patch !== undefined && patchText !== ''

  let review: GithubPullRequestReview | undefined

  const reviewQuery = createQuery()

  $: reviewQuery.query(
    github.class.GithubPullRequestReview,
    {
      attachedTo: pullRequest._id,
      author: me.person
    },
    (res) => {
      ;[review] = res
    }
  )

  $: viewedFiles = review?.files ?? []

  const client = getClient()

  async function handleFileViewed (fileName: string, sha: string, viewed: boolean): Promise<void> {
    const current = await client.findOne(github.class.GithubPullRequestReview, {
      attachedTo: pullRequest._id,
      author: me.person
    })

    const files = current?.files ?? []

    const index = files.findIndex((file) => file.fileName === fileName && file.sha === sha)
    if (index !== -1) {
      files.splice(index, 1)
    }
    if (viewed) {
      files.push({ fileName, sha })
    }

    if (current) {
      await client.update(current, { files })
    } else {
      await client.addCollection(
        github.class.GithubPullRequestReview,
        pullRequest.space,
        pullRequest._id,
        github.class.GithubPullRequest,
        'reviewsVisual',
        { author: me.person, files }
      )
    }
  }
</script>

<div class="mt-6">
  {#if hasPatch}
    <div class="flex-between mb-1">
      <Button
        width="min-content"
        kind="ghost"
        on:click={() => {
          isCollapsed = !isCollapsed
        }}
      >
        <svelte:fragment slot="content">
          <Chevron
            size={'small'}
            expanded={!isCollapsed}
            outline
            fill={'var(--caption-color)'}
            marginRight={'.375rem'}
          />
          <Label label={github.string.ChangedFiles} params={{ files: pullRequest.files }} />
        </svelte:fragment>
      </Button>
    </div>

    {#if !isCollapsed}
      <ExpandCollapse isExpanded={!isCollapsed}>
        <div class="list" class:collapsed={isCollapsed}>
          <Component
            is={diffview.component.DiffView}
            props={{ patch: patchText, viewed: viewedFiles }}
            on:change={(evt) => {
              const { fileName, sha, viewed } = evt.detail
              handleFileViewed(fileName, sha, viewed)
            }}
          />
        </div>
      </ExpandCollapse>
    {/if}
  {/if}
</div>

<style lang="scss">
  .list {
    padding-top: 0.75rem;
    border-top: 1px solid var(--divider-color);

    &.collapsed {
      padding-top: 1px;
      border-top: none;
    }
  }
</style>
