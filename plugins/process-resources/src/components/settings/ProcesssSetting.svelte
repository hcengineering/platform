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
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { Process } from '@hcengineering/process'
  import { ToggleWithLabel } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import process from '../../plugin'

  export let value: Process

  const client = getClient()
  const dispatch = createEventDispatcher()

  async function saveRestriction (e: CustomEvent<boolean>): Promise<void> {
    if (value !== undefined) {
      await client.update(value, { parallelExecutionForbidden: e.detail })
    }
  }

  async function saveAutoStart (e: CustomEvent<boolean>): Promise<void> {
    if (value !== undefined) {
      await client.update(value, { autoStart: e.detail })
    }
  }
</script>

<Card
  label={process.string.Process}
  canSave={true}
  width="small"
  okLabel={presentation.string.Save}
  okAction={() => {
    dispatch('close')
  }}
  on:close
>
  <div class="mb-2">
    <ToggleWithLabel
      on={value.parallelExecutionForbidden ?? false}
      on:change={saveRestriction}
      label={process.string.ParallelExecutionForbidden}
    />
  </div>
  <ToggleWithLabel on={value.autoStart ?? false} on:change={saveAutoStart} label={process.string.StartAutomatically} />
</Card>
