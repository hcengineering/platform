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
  import { createQuery } from '@hcengineering/presentation'
  import { navigate } from '@hcengineering/ui'
  import type { Training, TrainingRequest } from '@hcengineering/training'
  import training from '../plugin'
  import { trainingRequestRoute, TrainingRequestRouteTab } from '../routing/routes/trainingRequestRoute'
  import { canViewTrainingTraineesResults } from '../utils'
  import NestedSpecialView from './NestedSpecialView.svelte'

  export let object: TrainingRequest

  let trainingObject: Training | null = null
  const trainingQuery = createQuery()
  $: {
    trainingQuery.query(
      training.class.Training,
      {
        _id: object.attachedTo
      },
      (result) => {
        trainingObject = result[0] ?? null
      }
    )
  }

  $: if (trainingObject !== null && !canViewTrainingTraineesResults(trainingObject)) {
    navigate(trainingRequestRoute.build({ id: object._id, tab: TrainingRequestRouteTab.Overview }), true)
  }
</script>

{#if trainingObject !== null}
  <NestedSpecialView
    _class={training.class.TrainingAttempt}
    space={object.space}
    baseQuery={{
      attachedTo: object._id,
      attachedToClass: object._class,
      collection: 'attempts',
      owner: { $in: object.trainees }
    }}
    descriptors={[training.viewlet.TrainingAttemptsNested]}
  />
{/if}
