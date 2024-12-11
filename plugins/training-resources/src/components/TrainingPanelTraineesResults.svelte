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
  import { checkMyPermission, permissionsStore } from '@hcengineering/contact-resources'
  import type { Training } from '@hcengineering/training'
  import { navigate } from '@hcengineering/ui'
  import training from '../plugin'
  import { trainingRoute, TrainingRouteTab } from '../routing/routes/trainingRoute'
  import { canViewTrainingTraineesResults, getCurrentEmployeeRef } from '../utils'
  import NestedSpecialView from './NestedSpecialView.svelte'

  export let object: Training

  $: if (!canViewTrainingTraineesResults(object)) {
    navigate(trainingRoute.build({ id: object._id, tab: TrainingRouteTab.Overview }), true)
  }

  $: canReadAny = checkMyPermission(
    training.permission.ViewSomeoneElsesTraineesResults,
    object.space,
    $permissionsStore
  )
</script>

<NestedSpecialView
  _class={training.class.TrainingAttempt}
  space={object.space}
  baseQuery={{
    '$lookup.attachedTo.attachedTo': object._id,
    '$lookup.attachedTo.attachedToClass': object._class,
    '$lookup.attachedTo.collection': 'requests',
    collection: 'attempts',
    ...(canReadAny ? {} : { '$lookup.attachedTo.owner': getCurrentEmployeeRef() })
  }}
  descriptors={[training.viewlet.TrainingAttemptsNested]}
/>
