<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { type TrainingAttempt, TrainingAttemptState } from '@hcengineering/training'
  import { DocumentQuery } from '@hcengineering/core'
  import { type IModeSelector, navigate, rawLocation } from '@hcengineering/ui'
  import { SpecialView } from '@hcengineering/workbench-resources'
  import type { ComponentProps } from 'svelte'
  import { myResultsRoute, MyResultsRouteTab } from '../routing/routes/myResultsRoute'
  import { getCurrentEmployeeRef } from '../utils'
  import training from '../plugin'

  type $$Props = ComponentProps<SpecialView>
  $: ({ baseQuery, ...rest } = $$props as $$Props)

  const tabs: IModeSelector<MyResultsRouteTab>['config'] = [
    [MyResultsRouteTab.All, training.string.All, {}],
    [MyResultsRouteTab.Draft, training.string.TrainingAttemptStateDraft, {}],
    [MyResultsRouteTab.Passed, training.string.TrainingAttemptStatePassed, {}],
    [MyResultsRouteTab.Failed, training.string.TrainingAttemptStateFailed, {}]
  ]

  let modes: IModeSelector<MyResultsRouteTab>
  $: {
    modes = {
      config: tabs,
      mode: tabs[0][0],
      onChange: (tab) => {
        navigate(myResultsRoute.build({ tab }))
      }
    }
  }

  $: modes.mode = myResultsRoute.match($rawLocation)?.tab ?? modes.mode

  const queries: Record<MyResultsRouteTab, DocumentQuery<TrainingAttempt>> = {
    [MyResultsRouteTab.All]: {},
    [MyResultsRouteTab.Draft]: { state: TrainingAttemptState.Draft },
    [MyResultsRouteTab.Passed]: { state: TrainingAttemptState.Passed },
    [MyResultsRouteTab.Failed]: { state: TrainingAttemptState.Failed }
  }

  let extendedBaseQuery: DocumentQuery<TrainingAttempt>
  $: {
    extendedBaseQuery = {
      ...((baseQuery ?? {}) as DocumentQuery<TrainingAttempt>),
      ...queries[modes.mode],
      owner: getCurrentEmployeeRef()
    }
  }
</script>

<SpecialView {...rest} baseQuery={extendedBaseQuery} {modes} />
