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
  import { TrainingState, trainingStateOrder } from '@hcengineering/training'
  import TrainingStatePresenter from './TrainingStatePresenter.svelte'

  export let value: Map<number, Map<TrainingState, TrainingState[]>>

  let states: TrainingState[] = []
  $: states = Array.from(value.values())
    .map(([, states]) => states[0])
    .sort((state1, state2) => trainingStateOrder.indexOf(state1) - trainingStateOrder.indexOf(state2))
</script>

<div class="flex-presenter flex-gap-1-5">
  {#each states as state}
    <TrainingStatePresenter value={state} />
  {/each}
</div>
