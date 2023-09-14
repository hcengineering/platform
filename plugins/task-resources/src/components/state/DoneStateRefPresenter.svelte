<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
-->
<script lang="ts">
  import { Ref, Status, StatusValue } from '@hcengineering/core'
  import { DoneState, SpaceWithStates } from '@hcengineering/task'
  import { Label } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import task from '../../plugin'
  import Unknown from '../icons/Unknown.svelte'
  import DoneStateEditor from './DoneStateEditor.svelte'
  import DoneStatePresenter from './DoneStatePresenter.svelte'

  export let value: Ref<DoneState> | StatusValue
  export let space: Ref<SpaceWithStates> | undefined
  export let showTitle: boolean = true
  export let onChange: ((value: Ref<DoneState>) => void) | undefined = undefined

  $: state = $statusStore.get(typeof value === 'string' ? value : (value?.values?.[0]?._id as Ref<Status>))
</script>

{#if value}
  {#if onChange !== undefined && state !== undefined}
    <DoneStateEditor value={state._id} {space} {onChange} kind="link" size="medium" />
  {:else}
    <DoneStatePresenter value={state} {showTitle} />
  {/if}
{:else}
  <div class="flex-row-center pointer-events-none">
    <div class="content-dark-color mr-2"><Unknown size={'small'} /></div>
    <span class="overflow-label"><Label label={task.string.NoDoneState} /></span>
  </div>
{/if}
