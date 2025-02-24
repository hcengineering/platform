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
  import { Class, Ref, type WithLookup } from '@hcengineering/core'
  import { Panel } from '@hcengineering/panel'
  import { ActionContext, createQuery } from '@hcengineering/presentation'
  import { Button, IconMoreH, navigate, type IModeSelector, rawLocation } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { showMenu } from '@hcengineering/view-resources'
  import { type Training, type TrainingAttempt, type TrainingRequest } from '@hcengineering/training'
  import training from '../plugin'
  import { MyResultsRouteTab, myResultsRoute } from '../routing/routes/myResultsRoute'
  import { TrainingAttemptRouteTab, trainingAttemptRoute } from '../routing/routes/trainingAttemptRoute'
  import {
    canCreateTrainingAttempt,
    canViewTrainingAttempt,
    createTrainingAttempt,
    getCurrentEmployeeRef,
    queryLatestOwnAttempt
  } from '../utils'
  import PanelBody from './PanelBody.svelte'
  import PanelTitle from './PanelTitle.svelte'
  import TrainingAttemptNumberPresenter from './TrainingAttemptNumberPresenter.svelte'
  import TrainingAttemptPanelQuestions from './TrainingAttemptPanelQuestions.svelte'
  import TrainingAttemptStatePresenter from './TrainingAttemptStatePresenter.svelte'
  import TrainingAttributes from './TrainingAttributes.svelte'
  import TrainingPanelOverview from './TrainingPanelOverview.svelte'
  import TrainingRequestAttributes from './TrainingRequestAttributes.svelte'

  export let _class: Ref<Class<TrainingAttempt>>
  export let _id: Ref<TrainingAttempt>
  export let embedded: boolean = false

  let object: TrainingAttempt | null = null
  let request: TrainingRequest | null = null
  let trainingObject: Training | null = null

  const query = createQuery()
  $: query.query(
    _class,
    { _id },
    async (result) => {
      object = result[0] ?? null
      request = (object as WithLookup<TrainingAttempt>)?.$lookup?.attachedTo ?? null
      trainingObject = (request as WithLookup<TrainingRequest>)?.$lookup?.attachedTo ?? null
      if (
        object === null ||
        request === null ||
        trainingObject === null ||
        !canViewTrainingAttempt(object, request, trainingObject)
      ) {
        object = null
        request = null
        trainingObject = null
        navigate(myResultsRoute.build({ tab: MyResultsRouteTab.All }))
      }
    },
    {
      lookup: {
        attachedTo: [
          training.class.TrainingRequest,
          {
            attachedTo: training.class.Training
          }
        ]
      }
    }
  )

  const defaultTab: TrainingAttemptRouteTab = TrainingAttemptRouteTab.Questions
  let modes: IModeSelector<TrainingAttemptRouteTab>
  $: {
    const config: IModeSelector<TrainingAttemptRouteTab>['config'] = [
      [TrainingAttemptRouteTab.Overview, training.string.TrainingOverview, {}],
      [TrainingAttemptRouteTab.Questions, training.string.TrainingQuestions, {}]
    ]
    modes = {
      config,
      mode: defaultTab,
      onChange: (tab) => {
        navigate(
          trainingAttemptRoute.build({
            id: _id,
            tab
          })
        )
      }
    }
  }

  $: {
    const params = trainingAttemptRoute.match($rawLocation)
    if (params !== null) {
      const tab = params.tab
      const isTabAvailable = tab !== null && modes.config.some((it) => it[0] === tab)
      if (isTabAvailable) {
        modes.mode = tab
      } else {
        navigate(trainingAttemptRoute.build({ id: params.id, tab: defaultTab }), true)
      }
    }
  }

  let latestOwnAttempt: TrainingAttempt | null = null
  const latestOwnAttemptQuery = createQuery()
  $: {
    if (object === null || request === null || object.owner !== getCurrentEmployeeRef()) {
      latestOwnAttemptQuery.unsubscribe()
    } else {
      queryLatestOwnAttempt(latestOwnAttemptQuery, request, (result) => {
        latestOwnAttempt = result ?? null
      })
    }
  }

  let canRetakeTraining: boolean = false
  $: {
    canRetakeTraining =
      latestOwnAttempt !== undefined &&
      request !== null &&
      trainingObject !== null &&
      canCreateTrainingAttempt(trainingObject, request, latestOwnAttempt)
  }

  function showContextMenu (evt: MouseEvent): void {
    if (object !== null) {
      showMenu(evt, {
        object,
        excludedActions: [view.action.Open]
      })
    }
  }

  async function retakeTraining (): Promise<void> {
    if (trainingObject !== null && request !== null && canRetakeTraining) {
      await createTrainingAttempt(trainingObject, request, latestOwnAttempt)
    }
  }
</script>

{#if object !== null && request !== null && trainingObject !== null}
  {#key object._id}
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
        <PanelTitle training={trainingObject}>
          <TrainingAttemptNumberPresenter slot="extra" value={object} showLabel />
          <TrainingAttemptStatePresenter slot="state" value={object.state} />
        </PanelTitle>
      </svelte:fragment>

      <svelte:fragment slot="pre-utils">
        {#if canRetakeTraining}
          <Button
            icon={training.icon.Retry}
            label={training.string.TrainingRetake}
            kind="primary"
            on:click={retakeTraining}
          />
        {/if}
      </svelte:fragment>
      <svelte:fragment slot="post-utils">
        <Button icon={IconMoreH} iconProps={{ size: 'medium' }} kind={'icon'} on:click={showContextMenu} />
      </svelte:fragment>
      <svelte:fragment slot="aside">
        <TrainingAttributes object={trainingObject} showHeader />
        <TrainingRequestAttributes object={request} showHeader />
      </svelte:fragment>

      <PanelBody {modes}>
        {#if modes.mode === TrainingAttemptRouteTab.Overview}
          <TrainingPanelOverview object={trainingObject} readonly />
        {:else if modes.mode === TrainingAttemptRouteTab.Questions}
          <TrainingAttemptPanelQuestions {trainingObject} {request} attempt={object} />
        {/if}
      </PanelBody>
    </Panel>
  {/key}
{/if}
