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
  import type { Training } from '@hcengineering/training'
  import TrainingCodePresenter from './TrainingCodePresenter.svelte'
  import TrainingRevisionPresenter from './TrainingRevisionPresenter.svelte'
  import TrainingStatePresenter from './TrainingStatePresenter.svelte'

  export let value: Training
  export let disabled: boolean = false
  export let accent: boolean = false
  export let showState: boolean = false
</script>

<div class="flex-row-center flex-gap-1-5">
  <span class="fs-bold flex-no-shrink" class:fs-title={accent}>
    <TrainingCodePresenter {value} {disabled} />
  </span>
  <span>•</span>
  <span class="fs-bold flex-shrink overflow-label max-w-40" class:fs-title={accent}>
    {value.title}
  </span>
  <span>•</span>
  <span class="flex-no-shrink"><TrainingRevisionPresenter {value} /></span>
  {#if showState}
    <span>•</span>
    <TrainingStatePresenter value={value.state} />
  {/if}
</div>
