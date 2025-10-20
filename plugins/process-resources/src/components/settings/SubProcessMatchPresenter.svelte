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
  import { getClient } from '@hcengineering/presentation'
  import { Process, State } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'
  import plugin from '../../plugin'

  export let params: Record<string, any>

  const client = getClient()

  let selectedProcess: Process | undefined
  $: if (params.process) {
    selectedProcess = client.getModel().findAllSync(plugin.class.Process, { _id: params.process })[0]
  } else {
    selectedProcess = undefined
  }

  let states: State[] = []
  $: if (params.process) {
    states = client.getModel().findAllSync(plugin.class.State, { process: params.process })
  } else {
    states = []
  }
</script>

{#if selectedProcess}
  : <Label label={plugin.string.Process} />
  <span class="overflow-label">{selectedProcess.name}</span>
{/if}

<style lang="scss">
  .overflow-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
