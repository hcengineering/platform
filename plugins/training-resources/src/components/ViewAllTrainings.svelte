<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { DocumentQuery } from '@hcengineering/core'
  import { checkMyPermission, permissionsStore } from '@hcengineering/contact-resources'
  import { type Training, TrainingState } from '@hcengineering/training'
  import { type IModeSelector, navigate, rawLocation } from '@hcengineering/ui'
  import { SpecialView } from '@hcengineering/workbench-resources'
  import { type ComponentProps } from 'svelte'
  import { allTrainingsRoute, AllTrainingsRouteTab } from '../routing/routes/allTrainingsRoute'
  import training from '../plugin'
  import { getCurrentEmployeeRef } from '../utils'

  type $$Props = ComponentProps<SpecialView>
  $: ({ baseQuery, ...rest } = $$props as $$Props)

  const tabs: IModeSelector<AllTrainingsRouteTab>['config'] = [
    [AllTrainingsRouteTab.Released, training.string.ViewAllTrainingsReleased, {}],
    [AllTrainingsRouteTab.Drafts, training.string.ViewAllTrainingsDrafts, {}],
    [AllTrainingsRouteTab.Archived, training.string.ViewAllTrainingsArchived, {}],
    [AllTrainingsRouteTab.All, training.string.ViewAllTrainingsAll, {}]
  ]

  let modes: IModeSelector<AllTrainingsRouteTab>
  $: {
    modes = {
      config: tabs,
      mode: tabs[0][0],
      onChange: (tab) => {
        navigate(allTrainingsRoute.build({ tab }))
      }
    }
  }

  $: modes.mode = allTrainingsRoute.match($rawLocation)?.tab ?? modes.mode

  const queries: Record<AllTrainingsRouteTab, DocumentQuery<Training>> = {
    [AllTrainingsRouteTab.Released]: { state: TrainingState.Released },
    [AllTrainingsRouteTab.Drafts]: { state: TrainingState.Draft },
    [AllTrainingsRouteTab.Archived]: { state: TrainingState.Archived },
    [AllTrainingsRouteTab.All]: {}
  }

  let extendedBaseQuery: DocumentQuery<Training>
  $: {
    const canReadAny = checkMyPermission(
      training.permission.ViewSomeoneElsesTrainingOverview,
      training.space.Trainings,
      $permissionsStore
    )
    extendedBaseQuery = {
      ...((baseQuery ?? {}) as DocumentQuery<Training>),
      ...queries[modes.mode],
      ...(canReadAny ? {} : { owner: getCurrentEmployeeRef() })
    }
  }
</script>

<SpecialView {...rest} baseQuery={extendedBaseQuery} {modes} />
