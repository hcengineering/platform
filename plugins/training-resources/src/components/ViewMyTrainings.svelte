<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { DocumentQuery } from '@hcengineering/core'
  import { type IModeSelector, navigate, rawLocation } from '@hcengineering/ui'
  import { SpecialView } from '@hcengineering/workbench-resources'
  import { type Training, TrainingState } from '@hcengineering/training'
  import { type ComponentProps } from 'svelte'
  import training from '../plugin'
  import { myTrainingsRoute, MyTrainingsRouteTab } from '../routing/routes/myTrainingsRoute'
  import { canCreateTraining, getCurrentEmployeeRef } from '../utils'

  type $$Props = ComponentProps<SpecialView>
  $: ({ baseQuery, ...rest } = $$props as $$Props)

  const tabs: IModeSelector<MyTrainingsRouteTab>['config'] = [
    [MyTrainingsRouteTab.Released, training.string.ViewMyTrainingsReleased, {}],
    [MyTrainingsRouteTab.Drafts, training.string.ViewMyTrainingsDrafts, {}],
    [MyTrainingsRouteTab.Archived, training.string.ViewMyTrainingsArchived, {}],
    [MyTrainingsRouteTab.All, training.string.ViewMyTrainingsAll, {}]
  ]

  let modes: IModeSelector<MyTrainingsRouteTab>
  $: {
    modes = {
      config: tabs,
      mode: tabs[0][0],
      onChange: (tab) => {
        navigate(myTrainingsRoute.build({ tab }))
      }
    }
  }

  $: modes.mode = myTrainingsRoute.match($rawLocation)?.tab ?? modes.mode

  const queries: Record<MyTrainingsRouteTab, DocumentQuery<Training>> = {
    [MyTrainingsRouteTab.Released]: { state: TrainingState.Released },
    [MyTrainingsRouteTab.Drafts]: { state: TrainingState.Draft },
    [MyTrainingsRouteTab.Archived]: { state: TrainingState.Archived },
    [MyTrainingsRouteTab.All]: {}
  }

  let extendedBaseQuery: DocumentQuery<Training>
  $: {
    extendedBaseQuery = {
      ...((baseQuery ?? {}) as DocumentQuery<Training>),
      ...queries[modes.mode],
      owner: getCurrentEmployeeRef()
    }
  }

  const canCreate = canCreateTraining()
</script>

<SpecialView
  {...rest}
  baseQuery={extendedBaseQuery}
  {modes}
  createLabel={canCreate ? training.string.Training : undefined}
  createComponent={canCreate ? training.component.TrainingCreator : undefined}
/>
