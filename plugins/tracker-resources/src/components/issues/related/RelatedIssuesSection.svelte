<script lang="ts">
  import { Doc } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, Icon, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import view, { Viewlet } from '@hcengineering/view'
  import { getViewOptions, ViewletSettingButton } from '@hcengineering/view-resources'
  import tracker from '../../../plugin'
  import RelatedIssues from './RelatedIssues.svelte'
  export let object: Doc
  export let label: IntlString

  let viewlet: Viewlet | undefined

  const vquery = createQuery()
  $: vquery.query(view.class.Viewlet, { _id: tracker.viewlet.SubIssues }, (res) => {
    ;[viewlet] = res
  })

  let viewOptions = getViewOptions(viewlet)
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <div class="antiSection-header__icon">
      <Icon icon={tracker.icon.Issue} size={'small'} />
    </div>
    <span class="antiSection-header__title">
      <Label {label} />
    </span>
    <div class="buttons-group small-gap">
      {#if viewlet && viewOptions}
        <ViewletSettingButton bind:viewOptions {viewlet} kind={'transparent'} />
      {/if}
      <Button
        id="add-sub-issue"
        width="min-content"
        icon={IconAdd}
        label={undefined}
        labelParams={{ subIssues: 0 }}
        kind={'transparent'}
        size={'small'}
        on:click={() => {
          showPopup(tracker.component.CreateIssue, { relatedTo: object, space: object.space }, 'top')
        }}
      />
    </div>
  </div>
  <div class="flex-row">
    {#if viewlet}
      <RelatedIssues {object} {viewOptions} {viewlet} />
    {/if}
  </div>
</div>
