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
  import { Ref, Space, Status, StatusValue } from '@hcengineering/core'
  import { State } from '@hcengineering/task'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import StateEditor from './StateEditor.svelte'
  import StatePresenter from './StatePresenter.svelte'

  export let value: Ref<State> | StatusValue
  export let space: Ref<Space>
  export let onChange: ((value: Ref<State>) => void) | undefined = undefined
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'medium'
  export let shouldShowName: boolean = true
  export let shrink: number = 0
  export let disabled: boolean = false

  $: state = $statusStore.get(typeof value === 'string' ? value : (value?.values?.[0]?._id as Ref<Status>))
</script>

{#if value}
  {#if onChange !== undefined && state !== undefined}
    <StateEditor value={state._id} {space} {onChange} {kind} {size} {shouldShowName} {shrink} {disabled} />
  {:else}
    <StatePresenter value={state} {shouldShowName} {disabled} {shrink} on:accent-color />
  {/if}
{/if}
