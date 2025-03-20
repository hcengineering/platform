<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Ref, WithLookup } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Execution, State } from '@hcengineering/process'
  import { Button, ProgressCircle, SelectPopup, SelectPopupValueType } from '@hcengineering/ui'
  import IconProgress from './icons/IconProgress.svelte'
  import IconBacklog from './icons/IconBacklog.svelte'
  import IconCompleted from './icons/IconCompleted.svelte'

  export let value: WithLookup<Execution>

  const client = getClient()

  $: states = value?.$lookup?.process?.states ?? client.getModel().findObject(value.process)?.states ?? []
  $: progress = states.findIndex((it) => it === value.currentState) + 1

  $: values = getValues(value, states)

  function getValues (value: WithLookup<Execution>, states: string[]): SelectPopupValueType[] {
    const res: SelectPopupValueType[] = []
    let isDone = true
    for (const state of states) {
      const stateObj = client.getModel().findObject(state as Ref<State>)
      if (stateObj === undefined) {
        continue
      }
      const isCurrent = value.currentState === state
      if (isCurrent) {
        isDone = false
      }
      res.push({
        id: state,
        text: stateObj.title,
        icon: isCurrent ? IconProgress : isDone ? IconCompleted : IconBacklog
      })
    }
    return res
  }
</script>

<div class="flex-center flex-no-shrink">
  <Button
    width={'min-content'}
    kind={'link-bordered'}
    size={'small'}
    justify={'left'}
    showTooltip={{
      component: SelectPopup,
      props: {
        value: values,
        showShadow: false,
        width: 'large'
      }
    }}
  >
    <svelte:fragment slot="content">
      <div class="flex-row-center content-color text-sm pointer-events-none">
        <div class="mr-1-5">
          <ProgressCircle bind:value={progress} bind:max={states.length} size={'small'} primary />
        </div>
        {progress}/{states.length}
      </div>
    </svelte:fragment>
  </Button>
</div>
