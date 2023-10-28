<script lang="ts">
  import core, { Doc, DocumentQuery, Ref, WithLookup } from '@hcengineering/core'
  import { Button, Component, IconAdd, Label, Loading, SearchEdit, showPopup } from '@hcengineering/ui'
  import view, { BuildModelKey, ViewOptions, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { FilterBar, FilterButton, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'
  import recruit from '../plugin'
  import CreateInterview from './CreateInterview.svelte'

  let viewlet: WithLookup<Viewlet> | undefined
  let loading = true

  let preference: ViewletPreference | undefined
  let viewOptions: ViewOptions | undefined

  function showCreateDialog () {
    showPopup(CreateInterview, { space: recruit.space.CandidatesPublic }, 'top')
  }
</script>

<div class="ac-header full divide">
  <div class="ac-header__wrap-title mr-3">
    <span class="ac-header__title"><Label label={recruit.string.Interviews} /></span>
  </div>
  <div class="ac-header-full medium-gap mb-1">
    <ViewletSelector
      bind:loading
      bind:viewlet
      bind:preference
      viewletQuery={{
        attachTo: recruit.mixin.VacancyList,
        descriptor: { $in: [view.viewlet.Table, view.viewlet.List] }
      }}
    />
    <Button icon={IconAdd} label={recruit.string.InterviewCreateLabel} kind={'primary'} on:click={showCreateDialog} />
  </div>
</div>