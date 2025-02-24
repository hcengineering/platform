<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
-->

<script lang="ts">
  import { Class, Ref } from '@hcengineering/core'
  import { Panel } from '@hcengineering/panel'
  import { ActionContext, createQuery } from '@hcengineering/presentation'
  import { Button, IconMoreH, type IModeSelector, navigate, rawLocation } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { showMenu } from '@hcengineering/view-resources'
  import {
    type Training,
    type TrainingAttempt,
    TrainingAttemptState,
    type TrainingRequest
  } from '@hcengineering/training'
  import training from '../plugin'
  import { sentRequestRoute } from '../routing/routes/sentRequestsRoute'
  import { trainingAttemptRoute, TrainingAttemptRouteTab } from '../routing/routes/trainingAttemptRoute'
  import { trainingRequestRoute, TrainingRequestRouteTab } from '../routing/routes/trainingRequestRoute'
  import {
    canCreateTrainingAttempt,
    canViewTrainingMyResults,
    canViewTrainingQuestions,
    canViewTrainingRequest,
    canViewTrainingTraineesResults,
    createTrainingAttempt,
    getCurrentEmployeeRef,
    queryLatestOwnAttempt
  } from '../utils'
  import PanelBody from './PanelBody.svelte'
  import PanelTitle from './PanelTitle.svelte'
  import SentRequestStatePresenter from './SentRequestStatePresenter.svelte'
  import TrainingAttributes from './TrainingAttributes.svelte'
  import TrainingPanelOverview from './TrainingPanelOverview.svelte'
  import TrainingPanelQuestions from './TrainingPanelQuestions.svelte'
  import TrainingRequestAttributes from './TrainingRequestAttributes.svelte'
  import TrainingRequestPanelMyResults from './TrainingRequestPanelMyResults.svelte'
  import TrainingRequestPanelTraineesResults from './TrainingRequestPanelTraineesResults.svelte'

  export let _class: Ref<Class<TrainingRequest>>
  export let _id: Ref<TrainingRequest>
  export let embedded: boolean = false

  let trainingObject: Training | null = null
  let object: TrainingRequest | null = null

  const query = createQuery()
  $: query.query(
    _class,
    { _id },
    async (result) => {
      object = result[0] ?? null
      trainingObject = result[0].$lookup?.attachedTo ?? null
      if (object === null || !canViewTrainingRequest(object)) {
        object = null
        trainingObject = null
        navigate(sentRequestRoute.build({ tab: null }))
      }
    },
    {
      lookup: { attachedTo: training.class.Training }
    }
  )

  let latestOwnAttempt: TrainingAttempt | null = null
  const latestOwnAttemptQuery = createQuery()
  $: {
    if (object === null) {
      latestOwnAttemptQuery.unsubscribe()
    } else {
      queryLatestOwnAttempt(latestOwnAttemptQuery, object, (result) => {
        latestOwnAttempt = result ?? null
      })
    }
  }

  let canTakeTraining: boolean = false
  let canRetakeTraining: boolean = false
  $: {
    canTakeTraining =
      latestOwnAttempt === null &&
      object !== null &&
      trainingObject !== null &&
      canCreateTrainingAttempt(trainingObject, object, null)

    canRetakeTraining =
      latestOwnAttempt !== null &&
      object !== null &&
      trainingObject !== null &&
      canCreateTrainingAttempt(trainingObject, object, latestOwnAttempt)
  }

  async function takeTraining (): Promise<void> {
    if (trainingObject !== null && object !== null && canTakeTraining) {
      await createTrainingAttempt(trainingObject, object, latestOwnAttempt)
    }
  }

  async function retakeTraining (): Promise<void> {
    if (trainingObject !== null && object !== null && canRetakeTraining) {
      await createTrainingAttempt(trainingObject, object, latestOwnAttempt)
    }
  }

  async function openLatestAttempt (): Promise<void> {
    if (latestOwnAttempt !== null) {
      navigate(
        trainingAttemptRoute.build({
          id: latestOwnAttempt._id,
          tab: TrainingAttemptRouteTab.Questions
        })
      )
    }
  }

  let isOwner: boolean = false
  $: isOwner = object !== null && object.owner === getCurrentEmployeeRef()

  const defaultTab: TrainingRequestRouteTab = TrainingRequestRouteTab.Overview
  let modes: IModeSelector<TrainingRequestRouteTab>
  $: {
    const config: IModeSelector<TrainingRequestRouteTab>['config'] = [
      [TrainingRequestRouteTab.Overview, training.string.TrainingOverview, {}]
    ]
    if (trainingObject !== null) {
      if (canViewTrainingQuestions(trainingObject)) {
        config.push([TrainingRequestRouteTab.Questions, training.string.TrainingQuestions, {}])
      }
      if (canViewTrainingMyResults(trainingObject)) {
        config.push([TrainingRequestRouteTab.MyResults, training.string.ViewMyResults, {}])
      }
      if (canViewTrainingTraineesResults(trainingObject)) {
        config.push([TrainingRequestRouteTab.TraineesResults, training.string.ViewTraineesResults, {}])
      }
    }
    modes = {
      config,
      mode: defaultTab,
      onChange: (tab) => {
        navigate(
          trainingRequestRoute.build({
            id: _id,
            tab
          })
        )
      }
    }
  }

  $: if (object !== null) {
    const params = trainingRequestRoute.match($rawLocation)
    // When user creates a new attempt, he's navigated to attempt page,
    // but navigate() is called before this request panel is destroyed, so this reactive block does trigger.
    // So we check params here to make sure that we're still on the request route, and that navigate() call
    // won't override/break navigation to attempt page
    if (params !== null) {
      const tab = params.tab
      const isTabAvailable = tab !== null && modes.config.some((it) => it[0] === tab)
      if (isTabAvailable) {
        modes.mode = tab
      } else {
        navigate(trainingRequestRoute.build({ id: params.id, tab: defaultTab }), true)
      }
    }
  }

  function showContextMenu (evt: MouseEvent): void {
    if (object !== null) {
      showMenu(evt, {
        object,
        excludedActions: [view.action.Open]
      })
    }
  }
</script>

{#if object !== null && trainingObject !== null}
  <ActionContext context={{ mode: 'editor' }} />

  <Panel
    {object}
    {embedded}
    isHeader={false}
    isSub={false}
    on:close
    withoutActivity
    contentClasses="h-full"
    adaptive={'default'}
  >
    <svelte:fragment slot="title">
      {#if isOwner}
        <PanelTitle training={trainingObject}>
          <SentRequestStatePresenter slot="state" value={object} />
        </PanelTitle>
      {:else}
        <PanelTitle training={trainingObject} />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="pre-utils">
      <div class="flex-row-center flex-gap-3">
        {#if latestOwnAttempt !== null}
          {#if latestOwnAttempt.state === TrainingAttemptState.Draft}
            <Button label={training.string.TrainingAttemptMyCurrentDraft} kind="primary" on:click={openLatestAttempt} />
          {:else}
            <Button label={training.string.TrainingAttemptMyLatestResult} kind="regular" on:click={openLatestAttempt} />
          {/if}
        {/if}
        {#if canTakeTraining}
          <Button kind="primary" label={training.string.TrainingTake} on:click={takeTraining} />
        {/if}
        {#if canRetakeTraining}
          <Button
            icon={training.icon.Retry}
            label={training.string.TrainingRetake}
            kind="primary"
            on:click={retakeTraining}
          />
        {/if}
      </div>
    </svelte:fragment>
    <svelte:fragment slot="post-utils">
      <Button icon={IconMoreH} iconProps={{ size: 'medium' }} kind={'icon'} on:click={showContextMenu} />
    </svelte:fragment>
    <svelte:fragment slot="aside">
      <TrainingAttributes object={trainingObject} showHeader />
      <TrainingRequestAttributes {object} showHeader />
    </svelte:fragment>

    <PanelBody {modes}>
      {#if modes.mode === TrainingRequestRouteTab.Overview}
        <TrainingPanelOverview object={trainingObject} readonly />
      {:else if modes.mode === TrainingRequestRouteTab.Questions}
        <TrainingPanelQuestions object={trainingObject} readonly />
      {:else if modes.mode === TrainingRequestRouteTab.TraineesResults}
        <TrainingRequestPanelTraineesResults {object} />
      {:else if modes.mode === TrainingRequestRouteTab.MyResults}
        <TrainingRequestPanelMyResults {object} />
      {/if}
    </PanelBody>
  </Panel>
{/if}
