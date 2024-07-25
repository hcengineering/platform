<!--
  Copyright © 2023 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { Class, Ref } from '@hcengineering/core'
  import { Panel } from '@hcengineering/panel'
  import { ActionContext, createQuery } from '@hcengineering/presentation'
  import { Button, IconMoreH, type IModeSelector, navigate, rawLocation } from '@hcengineering/ui'
  import view, { type Action } from '@hcengineering/view'
  import { ActionButton, showMenu } from '@hcengineering/view-resources'
  import { type Training } from '@hcengineering/training'
  import training from '../plugin'
  import { myTrainingsRoute } from '../routing/routes/myTrainingsRoute'
  import { trainingRoute, TrainingRouteTab } from '../routing/routes/trainingRoute'
  import {
    canUpdateTrainingOverview,
    canUpdateTrainingQuestions,
    canViewTraining,
    canViewTrainingIncomingRequests,
    canViewTrainingMyResults,
    canViewTrainingOverview,
    canViewTrainingQuestions,
    canViewTrainingSentRequests,
    canViewTrainingTraineesResults
  } from '../utils'
  import PanelBody from './PanelBody.svelte'
  import PanelTitle from './PanelTitle.svelte'
  import TrainingAttributes from './TrainingAttributes.svelte'
  import TrainingPanelIncomingRequests from './TrainingPanelIncomingRequests.svelte'
  import TrainingPanelMyResults from './TrainingPanelMyResults.svelte'
  import TrainingPanelOverview from './TrainingPanelOverview.svelte'
  import TrainingPanelQuestions from './TrainingPanelQuestions.svelte'
  import TrainingPanelTraineesResults from './TrainingPanelTraineesResults.svelte'
  import TrainingPanelSentRequests from './TrainingPanelSentRequests.svelte'
  import TrainingStatePresenter from './TrainingStatePresenter.svelte'

  export let _class: Ref<Class<Training>>
  export let _id: Ref<Training>
  export let embedded: boolean = false

  let object: Training | null = null
  let canUpdateOverview: boolean = false
  let canUpdateQuestions: boolean = false

  const query = createQuery()
  $: query.query(_class, { _id }, async (result) => {
    object = result[0] ?? null
    if (object === null || !canViewTraining(object)) {
      object = null
      canUpdateOverview = false
      canUpdateQuestions = false
      navigate(myTrainingsRoute.build({ tab: null }))
    } else {
      canUpdateOverview = canUpdateTrainingOverview(object)
      canUpdateQuestions = canUpdateTrainingQuestions(object)
    }
  })

  const defaultTab: TrainingRouteTab = TrainingRouteTab.Overview
  let modes: IModeSelector<TrainingRouteTab>
  $: void setModes(object, _id)

  async function setModes (trn: Training | null, id: Ref<Training>): Promise<void> {
    const config: IModeSelector<TrainingRouteTab>['config'] = []
    if (trn !== null) {
      if (await canViewTrainingOverview(trn)) {
        config.push([TrainingRouteTab.Overview, training.string.TrainingOverview, {}])
      }
      if (canViewTrainingQuestions(trn)) {
        config.push([TrainingRouteTab.Questions, training.string.TrainingQuestions, {}])
      }
      if (canViewTrainingIncomingRequests(trn)) {
        config.push([TrainingRouteTab.IncomingRequests, training.string.ViewIncomingRequests, {}])
      }
      if (canViewTrainingMyResults(trn)) {
        config.push([TrainingRouteTab.MyResults, training.string.ViewMyResults, {}])
      }
      if (canViewTrainingSentRequests(trn)) {
        config.push([TrainingRouteTab.SentRequests, training.string.ViewSentRequests, {}])
      }
      if (canViewTrainingTraineesResults(trn)) {
        config.push([TrainingRouteTab.TraineesResults, training.string.ViewTraineesResults, {}])
      }
    }
    modes = {
      mode: defaultTab,
      config,
      onChange: (tab) => {
        navigate(
          trainingRoute.build({
            id,
            tab
          })
        )
      }
    }
  }

  $: if (object !== null) {
    const params = trainingRoute.match($rawLocation)
    if (params !== null) {
      const tab = params.tab
      const isTabAvailable = tab !== null && modes.config.some((it) => it[0] === tab)
      if (isTabAvailable) {
        modes.mode = tab
      } else {
        navigate(trainingRoute.build({ id: params.id, tab: defaultTab }), true)
      }
    }
  }

  function showContextMenu (evt: MouseEvent): void {
    if (object !== null) {
      showMenu(evt, {
        object,
        excludedActions: [view.action.Open, training.action.TrainingRequestCreate, training.action.TrainingRelease]
      })
    }
  }

  const assignRequestAction: Ref<Action<any>> = training.action.TrainingRequestCreate
  const releaseAction: Ref<Action<any>> = training.action.TrainingRelease
</script>

{#if object !== null}
  <ActionContext context={{ mode: 'editor' }} />

  <Panel
    {object}
    {embedded}
    isHeader={false}
    isSub={false}
    withoutActivity
    contentClasses="h-full"
    adaptive={'default'}
    on:close
  >
    <svelte:fragment slot="title">
      <PanelTitle training={object}>
        <TrainingStatePresenter slot="state" value={object.state} />
      </PanelTitle>
    </svelte:fragment>

    <svelte:fragment slot="pre-utils">
      <ActionButton id={assignRequestAction} {object} kind="primary" />
      <ActionButton id={releaseAction} {object} />
    </svelte:fragment>

    <svelte:fragment slot="post-utils">
      <Button icon={IconMoreH} iconProps={{ size: 'medium' }} kind={'icon'} on:click={showContextMenu} />
    </svelte:fragment>
    <svelte:fragment slot="aside">
      <TrainingAttributes {object} />
    </svelte:fragment>

    <PanelBody {modes}>
      {#if modes.mode === TrainingRouteTab.Overview}
        <TrainingPanelOverview {object} readonly={!canUpdateOverview} />
      {:else if modes.mode === TrainingRouteTab.Questions}
        <TrainingPanelQuestions {object} readonly={!canUpdateQuestions} />
      {:else if modes.mode === TrainingRouteTab.SentRequests}
        <TrainingPanelSentRequests {object} />
      {:else if modes.mode === TrainingRouteTab.TraineesResults}
        <TrainingPanelTraineesResults {object} />
      {:else if modes.mode === TrainingRouteTab.IncomingRequests}
        <TrainingPanelIncomingRequests {object} />
      {:else if modes.mode === TrainingRouteTab.MyResults}
        <TrainingPanelMyResults {object} />
      {/if}
    </PanelBody>
  </Panel>
{/if}
