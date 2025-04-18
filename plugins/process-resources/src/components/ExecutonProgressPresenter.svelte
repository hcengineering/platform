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
  import { WithLookup } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Execution } from '@hcengineering/process'
  import { Button, eventToHTMLElement, ProgressCircle, showPopup } from '@hcengineering/ui'
  import ExecutionPopup from './ExecutionPopup.svelte'

  export let value: WithLookup<Execution>

  const client = getClient()

  $: states = value?.$lookup?.process?.states ?? client.getModel().findObject(value.process)?.states ?? []
  $: progress = states.findIndex((it) => it === value.currentState) + 1

  $: currentState = value.currentState != null ? client.getModel().findObject(value.currentState) : undefined

  function showDetail (e: MouseEvent): void {
    showPopup(ExecutionPopup, { value }, eventToHTMLElement(e))
  }
</script>

<div class="flex-center flex-no-shrink">
  <Button width={'min-content'} kind={'link-bordered'} size={'small'} justify={'left'} on:click={showDetail}>
    <svelte:fragment slot="content">
      <div class="flex-row-center content-color text-sm pointer-events-none">
        <div class="mr-1-5">
          <ProgressCircle bind:value={progress} bind:max={states.length} size={'small'} primary />
        </div>
        {progress}/{states.length}
        {#if currentState}
          {currentState.title}
        {/if}
      </div>
    </svelte:fragment>
  </Button>
</div>
