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
<script lang="ts" context="module">
  import type { ComponentProps } from 'svelte'
  import type { IntlString } from '@hcengineering/platform'
  import { StateTag, StateType } from '@hcengineering/ui'
  import { TrainingState } from '@hcengineering/training'

  import training from '../plugin'

  export const propsByStates: Record<TrainingState, ComponentProps<StateTag<IntlString>>> = {
    [TrainingState.Draft]: {
      label: training.string.TrainingStateDraft,
      params: {},
      type: StateType.Regular
    },
    [TrainingState.Released]: {
      label: training.string.TrainingStateReleased,
      params: {},
      type: StateType.Positive
    },
    [TrainingState.Archived]: {
      label: training.string.TrainingStateArchived,
      params: {},
      type: StateType.Ghost
    },
    [TrainingState.Deleted]: {
      label: training.string.TrainingStateDeleted,
      params: {},
      type: StateType.Ghost
    }
  }
</script>

<script lang="ts">
  export let value: TrainingState
</script>

<div class="inline-flex">
  <StateTag {...propsByStates[value]} />
</div>
