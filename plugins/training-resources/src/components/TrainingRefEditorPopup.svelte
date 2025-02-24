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
  import { ObjectPopup } from '@hcengineering/presentation'
  import { checkMyPermission, permissionsStore } from '@hcengineering/contact-resources'
  import { TrainingState } from '@hcengineering/training'
  import type { ComponentProps } from 'svelte'
  import training from '../plugin'
  import { getCurrentEmployeeRef } from '../utils'
  import TrainingPresenter from './TrainingPresenter.svelte'

  type $$Props = Omit<ComponentProps<ObjectPopup>, '_class' | 'searchMode' | 'docQuery'>
  const _class = training.class.Training
  const searchField: ComponentProps<ObjectPopup>['searchField'] = 'title'

  $: ({ ...rest } = $$props as $$Props)

  $: canReadAny = checkMyPermission(
    training.permission.ViewSomeoneElsesTrainingOverview,
    training.space.Trainings,
    $permissionsStore
  )
</script>

<ObjectPopup
  {_class}
  {searchField}
  {...rest}
  on:close
  on:update
  docQuery={{
    state: { $in: [TrainingState.Draft, TrainingState.Released] },
    ...(canReadAny ? {} : { owner: getCurrentEmployeeRef() })
  }}
>
  <svelte:fragment slot="item" let:item>
    <div class="flex-row-center">
      <TrainingPresenter value={item} disabled showState />
    </div>
  </svelte:fragment>
</ObjectPopup>
