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
  import { Process, SelectedExecutionContext } from '@hcengineering/process'
  import ui, { Label } from '@hcengineering/ui'
  import ProcessContextPresenter from '../contextEditors/ProcessContextPresenter.svelte'

  export let contextValue: SelectedExecutionContext
  export let process: Process

  const client = getClient()

  $: ctx = process.context[contextValue.id]

  $: attr = contextValue.key !== '' ? client.getHierarchy().findAttribute(ctx._class, contextValue.key) : undefined
</script>

{#if ctx !== undefined}
  <ProcessContextPresenter context={ctx} />
  {#if attr !== undefined}
    <span class="attr">
      <Label label={attr.label} />
    </span>
  {/if}
{:else}
  <Label label={ui.string.NotSelected} />
{/if}
