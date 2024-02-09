<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { IntlString } from '@hcengineering/platform'
  import { Card } from '@hcengineering/presentation'
  import { Button, Label } from '@hcengineering/ui'
  import view from '@hcengineering/view-resources/src/plugin'
  import { createEventDispatcher } from 'svelte'
  import task from '../../plugin'

  export let total: number
  export let okAction: () => void | Promise<void>
  export let label: IntlString

  const dispatch = createEventDispatcher()
</script>

<Card {label} {okAction} canSave={true} okLabel={view.string.LabelYes} on:close={() => dispatch('close')}>
  <svelte:fragment slot="buttons">
    <Button label={view.string.LabelNo} on:click={() => dispatch('close')} />
  </svelte:fragment>
  <div class="flex-grow flex-col">
    <div class="mb-2 fs-title">
      <Label label={task.string.UpdateTasksStatusRequest} params={{ total }} />
    </div>
  </div>
  <slot />
</Card>
