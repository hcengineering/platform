<script lang="ts">
  import { Doc, DocumentQuery } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient, configurationStore } from '@hcengineering/presentation'
  import { Button, Icon, IconAdd, Label, showPopup, Component } from '@hcengineering/ui'
  import view, { Viewlet } from '@hcengineering/view'
  import {
    getViewOptions,
    ViewletSettingButton,
    viewOptionStore,
    getAdditionalHeader
  } from '@hcengineering/view-resources'
  import viewplg from '@hcengineering/view-resources/src/plugin'
  import tracker from '../../../plugin'
  import RelatedIssues from './RelatedIssues.svelte'
  import { Issue, trackerId } from '@hcengineering/tracker'
  import { fade } from 'svelte/transition'

  export let object: Doc
  export let label: IntlString

  const client = getClient()
  let viewlet: Viewlet | undefined
  let listWidth: number

  const vquery = createQuery()
  $: vquery.query(view.class.Viewlet, { _id: tracker.viewlet.SubIssues }, (res) => {
    ;[viewlet] = res
  })

  $: viewOptions = getViewOptions(viewlet, $viewOptionStore)
  const createIssue = () => showPopup(tracker.component.CreateIssue, { relatedTo: object, space: object.space }, 'top')

  let query: DocumentQuery<Issue>
  $: query = { 'relations._id': object._id, 'relations._class': object._class }
  const subIssuesQuery = createQuery()
  let subIssues: Issue[] = []
  $: subIssuesQuery.query(tracker.class.Issue, query, async (result) => (subIssues = result))

  $: headerRemoval = viewOptions.groupBy.length === 0 || viewOptions.groupBy[0] === '#no_category'
  $: extraHeaders = headerRemoval ? getAdditionalHeader(client, tracker.class.Issue) : undefined
</script>

{#if $configurationStore.has(trackerId)}
  <div class="antiSection" bind:clientWidth={listWidth}>
    <div class="antiSection-header mb-3">
      <div class="antiSection-header__icon">
        <Icon icon={tracker.icon.Issue} size={'small'} />
      </div>
      <span class="antiSection-header__title short overflow-label">
        <Label {label} />
      </span>
      {#if headerRemoval}
        <div in:fade|local={{ duration: 150 }} class="antiSection-header__header flex-between">
          <span class="content-dark-color"><Label label={viewplg.string.NoGrouping} /></span>
          <div class="buttons-group font-normal text-normal">
            {#if extraHeaders}
              {#each extraHeaders as extra}
                <Component is={extra} props={{ docs: subIssues }} />
              {/each}
            {/if}
            <span class="antiSection-header__counter">{subIssues.length}</span>
          </div>
        </div>
      {:else}
        <span class="flex-grow" />
      {/if}
      <div class="flex-row-center gap-2">
        {#if viewlet && viewOptions}
          <ViewletSettingButton bind:viewOptions {viewlet} kind={'ghost'} />
        {/if}
        <Button
          id="add-sub-issue"
          icon={IconAdd}
          label={undefined}
          labelParams={{ subIssues: 0 }}
          kind={'ghost'}
          on:click={createIssue}
        />
      </div>
    </div>
    {#if viewlet}
      <RelatedIssues
        {object}
        {viewOptions}
        {viewlet}
        on:add-issue={createIssue}
        disableHeader={headerRemoval}
        compactMode={listWidth <= 600}
      />
    {/if}
  </div>
{/if}
